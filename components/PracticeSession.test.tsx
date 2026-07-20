import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findAssessment } from "@/lib/assessments";
import { PracticeSession } from "./PracticeSession";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("PracticeSession", () => {
  it("locks a free-text answer against repeated Enter presses", () => {
    vi.useFakeTimers();
    const assessment = findAssessment("letter-naming")!;
    const { container } = render(<PracticeSession assessment={assessment} grade="k" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    const answer = container.querySelector(".question-context")?.textContent ?? "";
    const input = screen.getByLabelText("Your answer");
    fireEvent.change(input, { target: { value: answer } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    act(() => vi.advanceTimersByTime(700));
    expect(screen.getByText(/Question 2 of/)).toBeInTheDocument();
  });

  it("clears a pending submission when the session unmounts", () => {
    vi.useFakeTimers();
    const assessment = findAssessment("vocabulary")!;
    const { unmount } = render(<PracticeSession assessment={assessment} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    fireEvent.click(screen.getAllByRole("button").find((button) => button.getAttribute("aria-pressed") === "false")!);
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    unmount();
    act(() => vi.advanceTimersByTime(700));
    expect(window.localStorage.getItem("brightpath-attempts")).toBeNull();
  });

  it("rejects invalid oral-reading word counts", () => {
    const assessment = findAssessment("oral-reading-fluency")!;
    render(<PracticeSession assessment={assessment} grade="2" />);
    fireEvent.click(screen.getByRole("button", { name: /Let's go/ }));
    fireEvent.click(screen.getByRole("button", { name: /done reading/i }));
    const input = screen.getByLabelText(/enter how many words/i);
    const submit = screen.getByRole("button", { name: "See my result" });
    fireEvent.change(input, { target: { value: "-1" } });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: "1.5" } });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: "10" } });
    expect(submit).toBeEnabled();
  });
});
