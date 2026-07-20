import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSESSMENTS } from "./assessments";
import { LISTENING_AUDIO_CUES, listeningAudioCue, listeningCueId } from "./listening-audio";
import { readWavMetadata } from "../scripts/tts-utils.mjs";
import { generatePracticeItems } from "./practice";

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16_807) % 2_147_483_647;
    return (value - 1) / 2_147_483_646;
  };
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

describe("listening audio", () => {
  it("has a unique, generated WAV file for every cue", () => {
    expect(LISTENING_AUDIO_CUES).toHaveLength(65);
    expect(new Set(LISTENING_AUDIO_CUES.map(({ id }) => id)).size).toBe(LISTENING_AUDIO_CUES.length);
    expect(new Set(LISTENING_AUDIO_CUES.map(({ src }) => src)).size).toBe(LISTENING_AUDIO_CUES.length);
    for (const cue of LISTENING_AUDIO_CUES) {
      const path = join(process.cwd(), "public", cue.src);
      expect(existsSync(path), cue.id).toBe(true);
      const wav = readFileSync(path);
      expect(statSync(path).size, cue.id).toBeGreaterThan(44);
      expect(readWavMetadata(wav), cue.id).toMatchObject({
        audioFormat: 1,
        channels: 1,
        sampleRate: 24_000,
        bitsPerSample: 16,
      });
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

  it("degrades safely when a newly-authored item has no audio mapping", () => {
    expect(listeningCueId("spelling", "not-in-the-catalog", "early")).toBeUndefined();
  });

  it("has a deterministic manifest that matches every generated file", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/audio/erinome/manifest.json"), "utf8")) as {
      generatedAt?: string;
      entries: Array<{ id: string; src: string; bytes: number; mimeType: string; sampleRate: number; durationSeconds: number; audioSha256: string }>;
    };
    expect(manifest.generatedAt).toBeUndefined();
    expect(manifest.entries).toHaveLength(LISTENING_AUDIO_CUES.length);
    expect(manifest.entries.map(({ id }) => id)).toEqual(LISTENING_AUDIO_CUES.map(({ id }) => id));
    for (const entry of manifest.entries) {
      const wav = readFileSync(join(process.cwd(), "public", entry.src));
      const metadata = readWavMetadata(wav);
      expect(entry.bytes, entry.id).toBe(wav.length);
      expect(entry.mimeType, entry.id).toBe("audio/wav");
      expect(entry.sampleRate, entry.id).toBe(24_000);
      expect(entry.durationSeconds, entry.id).toBeCloseTo(metadata.durationSeconds, 3);
      expect(entry.audioSha256, entry.id).toBe(createHash("sha256").update(wav).digest("hex"));
    }
  });

  it("keeps the offline Gemini key out of browser and application source", () => {
    const secretVariable = ["GEMINI", "API", "KEY"].join("_");
    for (const directory of ["app", "components", "lib"]) {
      for (const path of sourceFiles(join(process.cwd(), directory))) {
        expect(readFileSync(path, "utf8"), path).not.toContain(secretVariable);
      }
    }
  });
});
