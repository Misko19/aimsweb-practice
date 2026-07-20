"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listeningAudioCue, type ListeningAudioCueId } from "@/lib/listening-audio";

export type ListeningPlaybackStatus = "idle" | "loading" | "playing" | "fallback" | "error";

export function useListeningAudio() {
  const [status, setStatus] = useState<ListeningPlaybackStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback((updateStatus = true) => {
    const audio = audioRef.current;
    if (audio) {
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (updateStatus) setStatus("idle");
  }, []);

  const playBrowserFallback = useCallback((text: string) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus("error");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("error");
    setStatus("fallback");
    window.speechSynthesis.speak(utterance);
  }, []);

  const play = useCallback((cueId: ListeningAudioCueId, fallbackText: string) => {
    stop();
    const cue = listeningAudioCue(cueId);
    if (typeof Audio === "undefined") {
      playBrowserFallback(fallbackText);
      return;
    }

    const audio = new Audio(cue.src);
    audio.preload = "auto";
    audioRef.current = audio;
    setStatus("loading");

    const useFallbackOnce = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      playBrowserFallback(fallbackText);
    };
    audio.onplaying = () => {
      if (audioRef.current === audio) setStatus("playing");
    };
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setStatus("idle");
      }
    };
    audio.onerror = useFallbackOnce;
    void audio.play().catch(useFallbackOnce);
  }, [stop, playBrowserFallback]);

  useEffect(() => () => stop(false), [stop]);

  return { play, status, stop };
}
