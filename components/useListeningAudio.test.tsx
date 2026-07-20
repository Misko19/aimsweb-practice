import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useListeningAudio } from "./useListeningAudio";

const cancelSpeech = vi.fn();
const speakFallback = vi.fn();
const audioInstances: MockAudio[] = [];

class MockAudio {
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  pause = vi.fn();
  play = vi.fn(async () => this.onplaying?.());
  preload = "";

  constructor(public src: string) {
    audioInstances.push(this);
  }
}

beforeEach(() => {
  audioInstances.length = 0;
  cancelSpeech.mockClear();
  speakFallback.mockClear();
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("SpeechSynthesisUtterance", class {
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public text: string) {}
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: cancelSpeech, speak: speakFallback },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("useListeningAudio", () => {
  it("plays the mapped Erinome asset and stops it on demand", async () => {
    const { result } = renderHook(() => useListeningAudio());
    await act(async () => result.current.play("initial-sounds:moon", "moon"));
    expect(audioInstances[0]?.src).toBe("/audio/erinome/initial-sounds/moon.wav");
    expect(audioInstances[0]?.play).toHaveBeenCalled();
    expect(result.current.status).toBe("playing");

    act(() => result.current.stop());
    expect(audioInstances[0]?.pause).toHaveBeenCalled();
    expect(audioInstances[0]?.currentTime).toBe(0);
    expect(result.current.status).toBe("idle");
  });

  it("falls back to browser speech when static audio fails", async () => {
    const { result } = renderHook(() => useListeningAudio());
    await act(async () => result.current.play("initial-sounds:moon", "moon"));
    act(() => audioInstances[0]?.onerror?.());
    expect(speakFallback).toHaveBeenCalled();
    expect(result.current.status).toBe("fallback");
  });

  it("stops playback on unmount", async () => {
    const { result, unmount } = renderHook(() => useListeningAudio());
    await act(async () => result.current.play("initial-sounds:moon", "moon"));
    unmount();
    expect(audioInstances[0]?.pause).toHaveBeenCalled();
  });
});
