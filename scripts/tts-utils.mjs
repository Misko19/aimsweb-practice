export function findAudio(body) {
  if (body?.output_audio?.data) return body.output_audio;
  for (const step of [...(body?.steps ?? [])].reverse()) {
    if (step?.type !== "model_output") continue;
    const content = step.content?.find?.((part) => part?.type === "audio" && part?.data);
    if (content) return content;
  }
  return undefined;
}

export function audioFormat(audio) {
  const mimeType = String(audio?.mime_type ?? audio?.mimeType ?? "").toLowerCase();
  const sampleRate = Number(audio?.sample_rate ?? audio?.sampleRate ?? mimeType.match(/rate=(\d+)/)?.[1]);
  const channels = Number(audio?.channels ?? 1);
  if (!mimeType) throw new Error("Gemini audio response did not include a MIME type");
  if (!Number.isInteger(sampleRate) || sampleRate <= 0) throw new Error(`Gemini audio response has an invalid sample rate: ${sampleRate}`);
  if (channels !== 1) throw new Error(`Gemini audio response has unsupported channel count: ${channels}`);

  if (["audio/wav", "audio/x-wav", "audio/wave"].some((type) => mimeType.startsWith(type))) {
    return { mimeType, sampleRate, channels, isWav: true };
  }
  if (["audio/l16", "audio/pcm", "audio/raw"].some((type) => mimeType.startsWith(type))) {
    return { mimeType, sampleRate, channels, isWav: false };
  }
  throw new Error(`Gemini audio response has unsupported MIME type: ${mimeType}`);
}

export function wrapPcmAsWav(pcm, sampleRate, channels = 1, bitsPerSample = 16) {
  if (pcm.length < 2 || pcm.length % (channels * bitsPerSample / 8) !== 0) {
    throw new Error("PCM payload is empty or not aligned to complete samples");
  }
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export function readWavMetadata(wav) {
  if (wav.length < 12 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Audio is not a RIFF/WAVE file");
  }
  let format;
  let dataBytes;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkSize;
    if (end > wav.length) throw new Error(`WAV ${chunkId} chunk extends beyond the file`);
    if (chunkId === "fmt ") {
      if (chunkSize < 16) throw new Error("WAV fmt chunk is too short");
      format = {
        audioFormat: wav.readUInt16LE(start),
        channels: wav.readUInt16LE(start + 2),
        sampleRate: wav.readUInt32LE(start + 4),
        byteRate: wav.readUInt32LE(start + 8),
        blockAlign: wav.readUInt16LE(start + 12),
        bitsPerSample: wav.readUInt16LE(start + 14),
      };
    } else if (chunkId === "data") {
      dataBytes = chunkSize;
    }
    offset = end + (chunkSize % 2);
  }
  if (!format || dataBytes === undefined) throw new Error("WAV is missing its fmt or data chunk");
  if (format.audioFormat !== 1 || format.channels !== 1 || format.bitsPerSample !== 16) {
    throw new Error("WAV must contain mono 16-bit PCM audio");
  }
  if (format.byteRate !== format.sampleRate * format.blockAlign) throw new Error("WAV byte rate is inconsistent");
  return {
    ...format,
    dataBytes,
    durationSeconds: dataBytes / format.byteRate,
  };
}
