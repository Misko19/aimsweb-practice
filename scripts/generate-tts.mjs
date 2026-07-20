import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  LISTENING_AUDIO_CUES,
  LISTENING_AUDIO_MODEL,
  LISTENING_AUDIO_VOICE,
} from "../lib/listening-audio.ts";
import { audioFormat, findAudio, readWavMetadata, wrapPcmAsWav } from "./tts-utils.mjs";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is required. Load it from .env with node --env-file=.env.");

const force = process.argv.includes("--force");
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : undefined;
const selectedCues = only ? LISTENING_AUDIO_CUES.filter(({ id }) => id === only) : LISTENING_AUDIO_CUES;
if (only && selectedCues.length === 0) throw new Error(`Unknown cue id: ${only}`);

const concurrency = Math.max(1, Math.min(4, Number(process.env.TTS_CONCURRENCY) || 1));
const requestIntervalMs = Math.max(0, Number(process.env.TTS_REQUEST_INTERVAL_MS) || 21_000);
let nextCue = 0;
let nextRequestAt = Date.now();

await Promise.all(Array.from({ length: concurrency }, async () => {
  while (nextCue < selectedCues.length) {
    const cue = selectedCues[nextCue++];
    await generateCue(cue);
  }
}));

await writeManifest();

async function generateCue(cue) {
  const outputPath = join(process.cwd(), "public", cue.src);
  if (!force && await fileHasContent(outputPath)) {
    console.log(`skip ${cue.id}`);
    return;
  }

  const prompt = promptFor(cue);
  const { data, format } = await requestAudio(prompt, cue.id);
  const wav = format.isWav ? data : wrapPcmAsWav(data, format.sampleRate, format.channels);
  const metadata = readWavMetadata(wav);
  if (metadata.sampleRate !== 24_000) throw new Error(`Gemini returned ${metadata.sampleRate} Hz audio for ${cue.id}; expected 24000 Hz`);
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  try {
    await writeFile(temporaryPath, wav);
    await rename(temporaryPath, outputPath);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
  console.log(`wrote ${cue.id} (${wav.length} bytes)`);
}

function promptFor(cue) {
  const direction = {
    "initial-sound": "Speak the single word naturally and clearly. Do not stretch, isolate, or emphasize its first sound.",
    vocabulary: "Speak the single vocabulary word clearly and naturally, exactly once.",
    phoneme: "Speak the single word clearly at a natural pace. Do not segment it, spell it, or add any sounds.",
    spelling: "Pronounce the single spelling word carefully at a measured pace. Say only the word, exactly once. Do not spell it or use it in a sentence.",
    story: "Read the story in a warm, engaging US English educator voice at an unhurried but natural listening-comprehension pace.",
  }[cue.delivery];

  return `Synthesize speech only. Use the clear Erinome voice for a grade-school learner. ${direction} Read the transcript exactly as written, with no introduction, label, commentary, or added words.\n\nTRANSCRIPT START\n${cue.text}\nTRANSCRIPT END`;
}

async function requestAudio(prompt, cueId) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await waitForRequestSlot();
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: LISTENING_AUDIO_MODEL,
          input: prompt,
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice: LISTENING_AUDIO_VOICE }] },
          store: false,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${JSON.stringify(body)}`);
      const audio = findAudio(body);
      if (!audio?.data) throw new Error(`Gemini returned no audio block for ${cueId}`);
      const format = audioFormat(audio);
      const data = Buffer.from(audio.data, "base64");
      if (data.length < 2) throw new Error(`Gemini returned empty audio for ${cueId}`);
      return { data, format };
    } catch (error) {
      lastError = error;
      if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** (attempt - 1) + Math.random() * 300));
    }
  }
  throw lastError;
}

async function waitForRequestSlot() {
  const waitMs = Math.max(0, nextRequestAt - Date.now());
  nextRequestAt = Math.max(nextRequestAt, Date.now()) + requestIntervalMs;
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
}

async function fileHasContent(path) {
  try {
    return (await stat(path)).size > 44;
  } catch {
    return false;
  }
}

async function writeManifest() {
  const entries = [];
  for (const cue of LISTENING_AUDIO_CUES) {
    const path = join(process.cwd(), "public", cue.src);
    const audio = await readFile(path);
    const metadata = readWavMetadata(audio);
    entries.push({
      id: cue.id,
      src: cue.src,
      bytes: audio.length,
      mimeType: "audio/wav",
      sampleRate: metadata.sampleRate,
      durationSeconds: Number(metadata.durationSeconds.toFixed(3)),
      audioSha256: createHash("sha256").update(audio).digest("hex"),
      sourceSha256: createHash("sha256").update(`${LISTENING_AUDIO_MODEL}\n${LISTENING_AUDIO_VOICE}\n${promptFor(cue)}`).digest("hex"),
    });
  }
  const manifestPath = join(process.cwd(), "public/audio/erinome/manifest.json");
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify({ model: LISTENING_AUDIO_MODEL, voice: LISTENING_AUDIO_VOICE, entries }, null, 2)}\n`);
}
