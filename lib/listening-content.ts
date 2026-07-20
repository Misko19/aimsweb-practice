export type ListeningLevel = "early" | "middle" | "advanced";
export type VocabularyItem = readonly [word: string, answer: string, wrongA: string, wrongB: string];

export const VOCABULARY_ITEMS: Record<ListeningLevel, readonly VocabularyItem[]> = {
  early: [
    ["tiny", "very small", "very loud", "very slow"],
    ["glad", "happy", "sleepy", "empty"],
    ["begin", "start", "hide", "carry"],
    ["swift", "fast", "soft", "round"],
    ["enormous", "very large", "very quiet", "very old"],
    ["protect", "keep safe", "take apart", "move quickly"],
    ["reply", "answer", "question", "picture"],
    ["fragile", "easy to break", "hard to lift", "full of water"],
  ],
  middle: [
    ["observe", "watch carefully", "forget", "divide"],
    ["scarce", "hard to find", "brightly colored", "easy to carry"],
    ["reluctant", "not eager", "very certain", "full of energy"],
    ["conclude", "decide after thinking", "begin again", "ask permission"],
    ["fortunate", "having good luck", "feeling confused", "moving slowly"],
    ["contrast", "show differences", "repeat exactly", "join permanently"],
    ["essential", "completely necessary", "barely visible", "recently discovered"],
    ["adapt", "change to fit", "refuse to move", "measure precisely"],
  ],
  advanced: [
    ["ambiguous", "open to more than one meaning", "perfectly balanced", "easily measured"],
    ["mitigate", "make less severe", "copy exactly", "prove impossible"],
    ["pragmatic", "focused on practical results", "guided by nostalgia", "unable to change"],
    ["corroborate", "support with more evidence", "hide from view", "argue without evidence"],
    ["ubiquitous", "present almost everywhere", "rarely understood", "carefully hidden"],
    ["nuance", "a subtle distinction", "a final decision", "a loud objection"],
    ["resilient", "able to recover", "likely to disappear", "unwilling to learn"],
    ["scrutinize", "examine closely", "summarize briefly", "discard immediately"],
  ],
};

export const PHONEME_ITEMS = [
  ["ship", "3"],
  ["map", "3"],
  ["stop", "4"],
  ["fish", "3"],
  ["moon", "3"],
  ["chat", "3"],
  ["frog", "4"],
  ["sun", "3"],
] as const;

export const SPELLING_WORDS = {
  early: ["ship", "green", "play", "jump", "bright", "float", "smile", "train"],
  middle: ["journey", "separate", "curious", "necessary", "calendar", "favorite", "mystery", "exercise"],
  advanced: ["conscientious", "accommodate", "rhythm", "perseverance", "indispensable", "entrepreneur", "questionnaire", "maintenance"],
} as const;
