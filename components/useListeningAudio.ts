"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listeningAudioCue, type ListeningAudioCueId } from "@/lib/listening-audio";

export type ListeningPlaybackStatus = "idle" | "loading" | "playing" | "fallback" | "error";

const AUDIO_LOAD_TIMEOUT_MS = 8_000;

export function useListeningAudio() {
  const [status, setStatus] = useState<ListeningPlaybackStatus>("idle");
  const statusRef = useRef<ListeningPlaybackStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const playbackTokenRef = useRef(0);
  const audioTimeoutRef = useRef<number | undefined>(undefined);
  const fallbackTimeoutRef = useRef<number | undefined>(undefined);

  const updateStatus = useCallback((next: ListeningPlaybackStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (audioTimeoutRef.current !== undefined) window.clearTimeout(audioTimeoutRef.current);
    if (fallbackTimeoutRef.current !== undefined) window.clearTimeout(fallbackTimeoutRef.current);
    audioTimeoutRef.current = undefined;
    fallbackTimeoutRef.current = undefined;
  }, []);

  const releaseAudio = useCallback((audio: HTMLAudioElement) => {
    audio.onplaying = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
  }, []);

  const stop = useCallback((update = true) => {
    playbackTokenRef.current += 1;
    clearTimers();
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) releaseAudio(audio);
    const utterance = utteranceRef.current;
    utteranceRef.current = null;
    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (update) updateStatus("idle");
  }, [clearTimers, releaseAudio, updateStatus]);

  const playBrowserFallback = useCallback((text: string, token: number) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      if (playbackTokenRef.current === token) updateStatus("error");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    const isCurrent = () => playbackTokenRef.current === token && utteranceRef.current === utterance;
    utterance.onend = () => {
      if (!isCurrent()) return;
      if (fallbackTimeoutRef.current !== undefined) window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = undefined;
      utteranceRef.current = null;
      updateStatus("idle");
    };
    utterance.onerror = () => {
      if (!isCurrent()) return;
      if (fallbackTimeoutRef.current !== undefined) window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = undefined;
      utteranceRef.current = null;
      updateStatus("error");
    };
    const wordCount = Math.max(1, text.trim().split(/\s+/).length);
    fallbackTimeoutRef.current = window.setTimeout(() => {
      if (!isCurrent()) return;
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
      updateStatus("error");
    }, Math.max(8_000, Math.min(60_000, wordCount * 700)));
    updateStatus("fallback");
    window.speechSynthesis.speak(utterance);
  }, [updateStatus]);

  const play = useCallback((cueId: ListeningAudioCueId, fallbackText: string) => {
    if (statusRef.current === "loading") return;
    stop();
    const token = playbackTokenRef.current;
    const cue = listeningAudioCue(cueId);
    if (typeof Audio === "undefined") {
      playBrowserFallback(fallbackText, token);
      return;
    }

    if ("speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
      try {
        const primer = new SpeechSynthesisUtterance("\u00a0");
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      } catch {
        // Static audio remains the primary path when a browser cannot prime speech.
      }
    }

    const audio = new Audio(cue.src);
    audio.preload = "auto";
    audioRef.current = audio;
    updateStatus("loading");

    const useFallbackOnce = () => {
      if (playbackTokenRef.current !== token || audioRef.current !== audio) return;
      if (audioTimeoutRef.current !== undefined) window.clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = undefined;
      audioRef.current = null;
      releaseAudio(audio);
      playBrowserFallback(fallbackText, token);
    };
    audio.onplaying = () => {
      if (playbackTokenRef.current !== token || audioRef.current !== audio) return;
      if (audioTimeoutRef.current !== undefined) window.clearTimeout(audioTimeoutRef.current);
      audioTimeoutRef.current = undefined;
      updateStatus("playing");
    };
    audio.onended = () => {
      if (playbackTokenRef.current !== token || audioRef.current !== audio) return;
      audioRef.current = null;
      releaseAudio(audio);
      updateStatus("idle");
    };
    audio.onerror = useFallbackOnce;
    audioTimeoutRef.current = window.setTimeout(useFallbackOnce, AUDIO_LOAD_TIMEOUT_MS);
    const started = audio.play();
    if (started && typeof started.catch === "function") void started.catch(useFallbackOnce);
  }, [playBrowserFallback, releaseAudio, stop, updateStatus]);

  useEffect(() => () => stop(false), [stop]);

  return { play, status, stop };
}
