import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useListeningAudio } from "./useListeningAudio";

const cancelSpeech = vi.fn();
const speakFallback = vi.fn();
const audioInstances: MockAudio[] = [];
let playReturnsUndefined = false;

class MockAudio {
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  play = vi.fn(() => {
    if (playReturnsUndefined) return undefined;
    this.onplaying?.();
    return Promise.resolve();
  });
  preload = "";

  constructor(public src: string) {
    audioInstances.push(this);
  }
}

beforeEach(() => {
  audioInstances.length = 0;
  playReturnsUndefined = false;
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
    expect(audioInstances[0]?.removeAttribute).toHaveBeenCalledWith("src");
    expect(audioInstances[0]?.load).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("falls back to browser speech when static audio fails", async () => {
    const { result } = renderHook(() => useListeningAudio());
    await act(async () => result.current.play("initial-sounds:moon", "moon"));
    act(() => audioInstances[0]?.onerror?.());
    expect(speakFallback.mock.calls.some(([utterance]) => utterance.text === "moon")).toBe(true);
    expect(result.current.status).toBe("fallback");
  });

  it("stops playback on unmount", async () => {
    const { result, unmount } = renderHook(() => useListeningAudio());
    await act(async () => result.current.play("initial-sounds:moon", "moon"));
    unmount();
    expect(audioInstances[0]?.pause).toHaveBeenCalled();
  });

  it("supports browsers whose audio play method returns undefined", () => {
    playReturnsUndefined = true;
    const { result } = renderHook(() => useListeningAudio());
    act(() => result.current.play("initial-sounds:moon", "moon"));
    expect(result.current.status).toBe("loading");
    act(() => audioInstances[0]?.onplaying?.());
    expect(result.current.status).toBe("playing");
  });

  it("falls back when audio loading stalls", () => {
    vi.useFakeTimers();
    playReturnsUndefined = true;
    const { result } = renderHook(() => useListeningAudio());
    act(() => result.current.play("initial-sounds:moon", "moon"));
    act(() => vi.advanceTimersByTime(8_000));
    expect(speakFallback.mock.calls.some(([utterance]) => utterance.text === "moon")).toBe(true);
    expect(result.current.status).toBe("fallback");
  });

  it("reports an error when browser speech is silently dropped", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useListeningAudio());
    act(() => result.current.play("initial-sounds:moon", "moon"));
    act(() => audioInstances[0]?.onerror?.());
    act(() => vi.advanceTimersByTime(8_000));
    expect(cancelSpeech).toHaveBeenCalled();
    expect(result.current.status).toBe("error");
  });

  it("ignores stale browser-speech completion handlers", () => {
    const utterances: Array<{ onend: (() => void) | null }> = [];
    speakFallback.mockImplementation((utterance) => utterances.push(utterance));
    const { result } = renderHook(() => useListeningAudio());
    act(() => result.current.play("initial-sounds:moon", "moon"));
    act(() => audioInstances[0]?.onerror?.());
    const staleOnEnd = utterances.find((utterance) => utterance.onend)?.onend;
    act(() => result.current.play("initial-sounds:tiger", "tiger"));
    act(() => staleOnEnd?.());
    expect(result.current.status).toBe("playing");
  });
});
