import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSESSMENTS } from "./assessments";
import { LISTENING_AUDIO_CUES, listeningAudioCue } from "./listening-audio";
import { generatePracticeItems } from "./practice";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return (value - 1) / 2_147_483_646;
  };
}

describe("listening audio", () => {
  it("has a unique, generated WAV file for every cue", () => {
    expect(LISTENING_AUDIO_CUES).toHaveLength(65);
    expect(new Set(LISTENING_AUDIO_CUES.map(({ id }) => id)).size).toBe(LISTENING_AUDIO_CUES.length);
    expect(new Set(LISTENING_AUDIO_CUES.map(({ src }) => src)).size).toBe(LISTENING_AUDIO_CUES.length);
    for (const cue of LISTENING_AUDIO_CUES) {
      const path = join(process.cwd(), "public", cue.src);
      expect(existsSync(path), cue.id).toBe(true);
      expect(statSync(path).size, cue.id).toBeGreaterThan(44);
    }
  });

  it("resolves every listening item to a known cue", () => {
    const generatedCueIds = new Set<string>();
    for (const assessment of ASSESSMENTS.filter(({ mode }) => mode === "questions")) {
      for (const [gradeIndex, grade] of assessment.grades.entries()) {
        for (const item of generatePracticeItems(assessment, grade, 8, seeded(100 + gradeIndex))) {
          if (!item.speak) continue;
          expect(item.audioCue, `${assessment.slug}:${grade}:${item.speak}`).toBeTruthy();
          expect(listeningAudioCue(item.audioCue!)).toBeTruthy();
          generatedCueIds.add(item.audioCue!);
        }
      }
    }
    expect(generatedCueIds).toEqual(new Set(LISTENING_AUDIO_CUES.map(({ id }) => id)));
  });
});
