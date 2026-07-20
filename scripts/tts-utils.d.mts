export type GeminiAudioBlock = {
  data?: string;
  mime_type?: string;
  mimeType?: string;
  sample_rate?: number;
  sampleRate?: number;
  channels?: number;
};

export function findAudio(body: unknown): GeminiAudioBlock | undefined;
export function audioFormat(audio: GeminiAudioBlock | undefined): {
  mimeType: string;
  sampleRate: number;
  channels: number;
  isWav: boolean;
};
export function wrapPcmAsWav(pcm: Buffer, sampleRate: number, channels?: number, bitsPerSample?: number): Buffer;
export function readWavMetadata(wav: Buffer): {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataBytes: number;
  durationSeconds: number;
};
