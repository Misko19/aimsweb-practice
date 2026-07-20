import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findAssessment } from "@/lib/assessments";
import { PracticeSession } from "./PracticeSession";

const cancelSpeech = vi.fn();

beforeEach(() => {
  cancelSpeech.mockClear();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: cancelSpeech, speak: vi.fn() },
  });
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      clear: () => values.clear(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PracticeSession hardening", () => {
  it("automatically ends the oral reading clock at sixty seconds", () => {
    vi.useFakeTimers();
    render(<PracticeSession assessment={findAssessment("oral-reading-fluency")!} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.queryByRole("button", { name: /done reading/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/enter how many words/i)).toBeInTheDocument();
  });

  it("cancels browser speech when a session unmounts", () => {
    const { unmount } = render(<PracticeSession assessment={findAssessment("listening-comprehension")!} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    unmount();
    expect(cancelSpeech).toHaveBeenCalled();
  });

  it("records an original writing response as a word-count result", () => {
    render(<PracticeSession assessment={findAssessment("written-expression")!} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Plants need light and water to grow well." } });
    fireEvent.click(screen.getByRole("button", { name: "Finish writing" }));
    expect(screen.getByText("words written in an original response")).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem("brightpath-attempts") ?? "[]");
    expect(saved[0].kind).toBe("word-count");
  });

  it("clamps a long writing session to the server duration limit", () => {
    vi.useFakeTimers();
    render(<PracticeSession assessment={findAssessment("written-expression")!} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "A complete response." } });
    act(() => vi.advanceTimersByTime(5_400_000));
    fireEvent.click(screen.getByRole("button", { name: "Finish writing" }));
    const saved = JSON.parse(window.localStorage.getItem("brightpath-attempts") ?? "[]");
    expect(saved[0].durationSeconds).toBe(3_600);
  });

  it("keeps the listening control focusable and announces an audio error", async () => {
    vi.stubGlobal("Audio", class {
      currentTime = 0;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onplaying: (() => void) | null = null;
      pause() {}
      load() {}
      removeAttribute() {}
      play() { return Promise.reject(new Error("media unavailable")); }
    });
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
    render(<PracticeSession assessment={findAssessment("listening-comprehension")!} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    const listen = screen.getByRole("button", { name: "Listen" });
    expect(listen).toBeEnabled();
    fireEvent.click(listen);
    expect(await screen.findByRole("status")).toHaveTextContent("Audio is unavailable right now");
    expect(listen).toBeEnabled();
  });
});
