import { PHONEME_ITEMS, SPELLING_WORDS, VOCABULARY_ITEMS } from "./listening-content";

export const LISTENING_AUDIO_MODEL = "gemini-3.1-flash-tts-preview";
export const LISTENING_AUDIO_VOICE = "Erinome";

export const WINDOW_GARDEN_PASSAGE = "Maya planted three bean seeds in a pot by the window. Each morning, she checked the dark soil. On Friday, a green loop pushed into the light. Maya drew the tiny sprout in her notebook. She measured it every day and turned the pot so each side could face the sun. Soon, broad leaves reached over the rim.";

export const INITIAL_SOUND_WORDS = ["moon", "tiger", "boat", "sock", "goat", "rain", "leaf", "fish"] as const;

export type ListeningDelivery = "initial-sound" | "vocabulary" | "phoneme" | "spelling" | "story";
export type ListeningAudioCueId = `${string}:${string}`;

export type ListeningAudioCue = {
  id: ListeningAudioCueId;
  text: string;
  src: string;
  delivery: ListeningDelivery;
};

const wordCues = (
  namespace: string,
  words: readonly string[],
  delivery: ListeningDelivery,
  level?: string,
): ListeningAudioCue[] => words.map((text) => ({
  id: [namespace, level, text].filter(Boolean).join(":") as ListeningAudioCueId,
  text,
  src: `/audio/erinome/${[namespace, level, `${text}.wav`].filter(Boolean).join("/")}`,
  delivery,
}));

export const LISTENING_AUDIO_CUES: readonly ListeningAudioCue[] = [
  ...wordCues("initial-sounds", INITIAL_SOUND_WORDS, "initial-sound"),
  ...wordCues("vocabulary", VOCABULARY_ITEMS.early.map(([word]) => word), "vocabulary", "early"),
  ...wordCues("vocabulary", VOCABULARY_ITEMS.middle.map(([word]) => word), "vocabulary", "middle"),
  ...wordCues("vocabulary", VOCABULARY_ITEMS.advanced.map(([word]) => word), "vocabulary", "advanced"),
  ...wordCues("phoneme-segmentation", PHONEME_ITEMS.map(([word]) => word), "phoneme"),
  ...wordCues("spelling", SPELLING_WORDS.early, "spelling", "early"),
  ...wordCues("spelling", SPELLING_WORDS.middle, "spelling", "middle"),
  ...wordCues("spelling", SPELLING_WORDS.advanced, "spelling", "advanced"),
  {
    id: "listening-comprehension:the-window-garden",
    text: WINDOW_GARDEN_PASSAGE,
    src: "/audio/erinome/listening-comprehension/the-window-garden.wav",
    delivery: "story",
  },
];

const cuesById = new Map(LISTENING_AUDIO_CUES.map((cue) => [cue.id, cue]));

export function listeningCueId(namespace: string, text: string, level?: string): ListeningAudioCueId | undefined {
  const id = [namespace, level, text].filter(Boolean).join(":") as ListeningAudioCueId;
  return cuesById.has(id) ? id : undefined;
}

export function listeningAudioCue(id: ListeningAudioCueId): ListeningAudioCue {
  const cue = cuesById.get(id);
  if (!cue) throw new Error(`Unknown listening audio cue: ${id}`);
  return cue;
}
