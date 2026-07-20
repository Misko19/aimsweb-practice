import { describe, expect, it } from "vitest";
import { audioFormat, findAudio, readWavMetadata, wrapPcmAsWav } from "./tts-utils.mjs";

describe("TTS audio utilities", () => {
  it("finds and validates Interactions API audio metadata", () => {
    const audio = findAudio({
      steps: [{ type: "model_output", content: [{ type: "audio", data: "AA==", mime_type: "audio/L16", sample_rate: 24_000, channels: 1 }] }],
    });
    expect(audioFormat(audio)).toEqual({
      mimeType: "audio/l16",
      sampleRate: 24_000,
      channels: 1,
      isWav: false,
    });
  });

  it("rejects missing or unsupported response formats", () => {
    expect(() => audioFormat({ data: "AA==", sample_rate: 24_000 })).toThrow(/MIME type/);
    expect(() => audioFormat({ data: "AA==", mime_type: "audio/mpeg", sample_rate: 24_000 })).toThrow(/unsupported MIME/);
    expect(() => audioFormat({ data: "AA==", mime_type: "audio/L16", sample_rate: 44_100, channels: 2 })).toThrow(/channel count/);
  });

  it("wraps aligned PCM and parses RIFF chunks", () => {
    const wav = wrapPcmAsWav(Buffer.alloc(48_000), 24_000);
    expect(readWavMetadata(wav)).toEqual({
      audioFormat: 1,
      channels: 1,
      sampleRate: 24_000,
      byteRate: 48_000,
      blockAlign: 2,
      bitsPerSample: 16,
      dataBytes: 48_000,
      durationSeconds: 1,
    });
  });

  it("rejects malformed WAV data", () => {
    expect(() => readWavMetadata(Buffer.from("not a wav"))).toThrow(/RIFF/);
    expect(() => wrapPcmAsWav(Buffer.alloc(3), 24_000)).toThrow(/aligned/);
  });
});
