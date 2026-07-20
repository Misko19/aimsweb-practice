import type { Assessment, Grade } from "./assessments";
import {
  SPELLING_WORDS,
  WINDOW_GARDEN_PASSAGE,
  listeningCueId,
  type ListeningAudioCueId,
} from "./listening-audio";

export type PracticeItem = {
  id: string;
  prompt: string;
  instruction?: string;
  context?: string;
  choices?: string[];
  answer: string;
  speak?: string;
  audioCue?: ListeningAudioCueId;
};

export type OralPassage = {
  title: string;
  text: string;
  wordCount: number;
};

type Rng = () => number;

const pick = <T,>(values: readonly T[], rng: Rng) => values[Math.floor(rng() * values.length)]!;
const shuffle = <T,>(values: readonly T[], rng: Rng) => {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith]!, shuffled[index]!];
  }
  return shuffled;
};

const wordsByLevel: Record<"early" | "middle" | "advanced", readonly (readonly [string, string, string, string])[]> = {
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
} as const;

const passages = {
  early: {
    title: "The Window Garden",
    text: WINDOW_GARDEN_PASSAGE,
  },
  middle: {
    title: "A Library for Tools",
    text: "The community center had shelves of books, but Lena imagined another kind of library. Neighbors owned drills, ladders, and garden tools that sat unused most of the week. Lena proposed a tool-lending room. Volunteers labeled every item and wrote simple safety guides. Within a month, families were borrowing equipment for repairs and returning it for the next project. The shared collection saved money and helped neighbors teach one another useful skills.",
  },
  advanced: {
    title: "Restoring the Night",
    text: "For generations, city lighting was designed with one goal: making darkness disappear. Researchers now understand that excessive nighttime light can disrupt migrating birds, obscure the stars, and waste energy. Some communities are responding with shielded fixtures that direct light downward and with warmer bulbs that reduce glare. These changes do not require streets to become unsafe or unwelcoming. Instead, careful design puts light where people need it while allowing parks and skies to recover a measure of natural darkness.",
  },
} as const;

type QuestionTuple = readonly [string, string, string, string];

const comprehensionQuestions: Record<"early" | "middle" | "advanced", readonly QuestionTuple[]> = {
  early: [
    ["How many bean seeds did Maya plant?", "Three", "One", "Ten"],
    ["Where did Maya place the pot?", "By the window", "Under her bed", "In the garage"],
    ["When did the green loop appear?", "On Friday", "On Monday", "At night"],
    ["What did Maya draw?", "The tiny sprout", "The empty pot", "The window"],
    ["What did Maya do every day?", "Measured the sprout", "Changed the soil", "Picked the leaves"],
    ["Why did Maya turn the pot?", "So each side could get sunlight", "To spill out the soil", "To hide the leaves"],
    ["What eventually reached over the rim?", "Broad leaves", "Bean pods", "Long roots"],
    ["What is the story mostly about?", "Caring for a growing plant", "Buying a notebook", "Cleaning a window"],
  ],
  middle: [
    ["What new kind of library did Lena imagine?", "A tool-lending room", "A music archive", "A seed exchange"],
    ["Why were many tools available to share?", "They sat unused much of the week", "They were all broken", "Stores stopped selling them"],
    ["Who labeled the items?", "Volunteers", "Book authors", "Construction crews"],
    ["What did volunteers write?", "Simple safety guides", "Long tool histories", "Purchase receipts"],
    ["How soon were families borrowing equipment?", "Within a month", "After five years", "The next morning"],
    ["What was a main benefit of the room?", "Neighbors shared useful equipment", "The center sold old books", "Repairs were forbidden"],
    ["What happened after equipment was used?", "It was returned for another project", "It was thrown away", "It became private property"],
    ["What is the passage mostly about?", "A practical idea that helped neighbors", "A competition between libraries", "A center closing its shelves"],
  ],
  advanced: [
    ["What was the traditional goal of city lighting?", "Making darkness disappear", "Protecting migrating birds", "Revealing more stars"],
    ["Which animal group can excessive light disrupt?", "Migrating birds", "Underground insects", "Ocean mammals"],
    ["What do shielded fixtures do?", "Direct light downward", "Make bulbs flash", "Remove every shadow"],
    ["Why do some communities choose warmer bulbs?", "To reduce glare", "To increase blue light", "To light the sky"],
    ["What tradeoff does the author reject?", "That reducing light harm requires unsafe streets", "That energy can be wasted", "That stars can be obscured"],
    ["What does careful design accomplish?", "Puts light where people need it", "Eliminates all nighttime activity", "Makes every park equally bright"],
    ["What does “a measure” most nearly mean here?", "An amount", "A ruler", "A law"],
    ["What is the passage’s central idea?", "Thoughtful lighting can serve people while reducing harm", "All city lighting should be removed", "Warm bulbs always use more energy"],
  ],
};

const progressPassage = "A class built a small weather station beside the school garden. Each morning, two students recorded the temperature, cloud cover, and rainfall. After several weeks, they compared the notes with plant growth. The sunniest beds dried quickly, while a shaded bed stayed damp longer. The class used the pattern to adjust its watering plan and keep every bed healthy.";

const progressQuestions: readonly QuestionTuple[] = [
  ["Where did the class build its weather station?", "Beside the school garden", "On the school roof", "Inside the library"],
  ["When did students record conditions?", "Each morning", "Once a month", "Every night"],
  ["How many students recorded the weather?", "Two", "Ten", "One"],
  ["What three conditions did they record?", "Temperature, clouds, and rainfall", "Wind, snow, and soil", "Sunrise, insects, and seeds"],
  ["What did they compare the notes with?", "Plant growth", "Lunch choices", "Bus schedules"],
  ["Which beds dried quickly?", "The sunniest beds", "The shaded bed", "Every bed"],
  ["What stayed damp longer?", "A shaded bed", "The weather station", "The school roof"],
  ["How did the class use the pattern?", "It adjusted the watering plan", "It removed the garden", "It stopped recording weather"],
];

const mazeQuestions: readonly QuestionTuple[] = [
  ["The rain stopped, so we ___ our walk.", "continued", "melted", "whispered"],
  ["Nia packed a snack ___ she left for practice.", "before", "unless", "although"],
  ["The puppy was ___ to greet us.", "eager", "distant", "silent"],
  ["We used a map to ___ the hidden trail.", "locate", "erase", "borrow"],
  ["The glass vase is ___, so carry it carefully.", "fragile", "enormous", "ordinary"],
  ["The class compared both plans before making a ___.", "decision", "shadow", "mixture"],
  ["Because the evidence was incomplete, the result remained ___.", "uncertain", "identical", "permanent"],
  ["The new evidence helped ___ the scientist’s explanation.", "support", "conceal", "interrupt"],
];

export function writingPromptForGrade(grade: Grade, rng: Rng = Math.random) {
  const prompts = levelForGrade(grade) === "early"
    ? ["Describe a place where you like to learn.", "Write about a time you helped someone.", "Imagine you found a tiny door. What happens next?", "Explain how to care for a plant."]
    : levelForGrade(grade) === "middle"
      ? ["Explain one way a community can share resources.", "Describe a challenge that taught you something.", "Should every student learn a practical skill? Explain.", "Write a story that begins with an unexpected message."]
      : ["Explain how a design choice can affect a community.", "Argue for one change that would improve daily life.", "Describe how new evidence can change a conclusion.", "Write about the tension between convenience and responsibility."];
  return pick(prompts, rng);
}

function levelForGrade(grade: Grade) {
  if (grade === "pre-k" || grade === "k" || Number(grade) <= 3) return "early" as const;
  if (Number(grade) <= 7) return "middle" as const;
  return "advanced" as const;
}

function numberLimit(grade: Grade) {
  if (grade === "pre-k") return 5;
  if (grade === "k") return 10;
  const n = Number(grade);
  if (n <= 1) return 20;
  if (n <= 3) return 100;
  if (n <= 5) return 500;
  return 1000;
}

function item(id: string, prompt: string, answer: string, choices?: string[], extra?: Partial<PracticeItem>): PracticeItem {
  return { id, prompt, answer, choices, ...extra };
}

function mathItem(slug: string, grade: Grade, id: string, rng: Rng): PracticeItem {
  const limit = numberLimit(grade);
  const a = 1 + Math.floor(rng() * limit);
  const b = Math.max(1, Math.floor(rng() * Math.min(limit, a + 1)));

  if (slug === "quantity-total") {
    const count = 1 + Math.floor(rng() * 8);
    return item(id, `How many stars?`, String(count), undefined, { context: "⭐ ".repeat(count).trim() });
  }
  if (slug === "number-naming") {
    return item(id, "What number is this?", String(a), undefined, { context: String(a) });
  }
  if (slug === "quantity-difference") {
    const larger = Math.max(a % 10, b % 10) + 2;
    const smaller = Math.min(a % 10, b % 10);
    return item(id, "How many more circles are in the first group?", String(larger - smaller), undefined, {
      context: `${"● ".repeat(larger)}\n${"● ".repeat(smaller)}`,
    });
  }
  if (slug === "number-comparison-pairs") {
    const first = 1 + Math.floor(rng() * limit);
    let second = 1 + Math.floor(rng() * limit);
    if (second === first) second = first === limit ? first - 1 : first + 1;
    const values = shuffle([first, second], rng);
    const answer = String(Math.max(first, second));
    return item(id, "Choose the greater number.", answer, values.map(String));
  }
  if (slug === "math-facts-one-digit") {
    const x = Math.floor(rng() * 10);
    const y = Math.floor(rng() * 10);
    const subtract = rng() > 0.5 && x >= y;
    return subtract ? item(id, `${x} − ${y} = ?`, String(x - y)) : item(id, `${x} + ${y} = ?`, String(x + y));
  }
  if (slug === "math-facts-tens") {
    const x = (1 + Math.floor(rng() * 9)) * 10;
    const y = (1 + Math.floor(rng() * 5)) * 10;
    return item(id, `${x} + ${y} = ?`, String(x + y));
  }
  if (slug === "number-comparison-triads") {
    const total = Math.max(4, a);
    const part = Math.max(1, Math.min(total - 1, b));
    return item(id, `${part} + ? = ${total}`, String(total - part));
  }
  if (slug === "math-cap") {
    const x = 2 + Math.floor(rng() * Math.min(12, Math.max(4, Number(grade) + 3)));
    const y = 2 + Math.floor(rng() * 9);
    if (rng() > 0.5) return item(id, `${x} × ${y} = ?`, String(x * y));
    return item(id, `A theater sets ${x} rows with ${y} seats in each row. How many seats are there?`, String(x * y));
  }
  if (slug === "concepts-applications") {
    if (grade === "pre-k" || grade === "k" || grade === "1") {
      const count = 2 + Math.floor(rng() * (grade === "1" ? 9 : 5));
      return item(id, `Kai has ${count} blocks and gets 1 more. How many blocks now?`, String(count + 1));
    }
    const groups = 2 + Math.floor(rng() * Math.min(8, Number(grade) || 2));
    const each = 2 + Math.floor(rng() * 8);
    return item(id, `A club packs ${groups} boxes with ${each} markers in each box. How many markers are packed?`, String(groups * each));
  }
  const useSubtraction = rng() > 0.55 && a >= b;
  return useSubtraction
    ? item(id, `${a} − ${b} = ?`, String(a - b))
    : item(id, `${a} + ${b} = ?`, String(a + b));
}

function readingItem(slug: string, grade: Grade, id: string, rng: Rng): PracticeItem {
  const level = levelForGrade(grade);
  if (slug === "print-concepts") {
    return pick([
      item(id, "Where do you begin reading a page in English?", "At the top left", ["At the top left", "At the bottom right", "In the middle"]),
      item(id, "What does a space between words show?", "One word ended and another begins", ["One word ended and another begins", "The story is over", "A letter is missing"]),
      item(id, "Which mark usually ends a telling sentence?", "A period", ["A period", "A comma", "An apostrophe"]),
      item(id, "What does an uppercase letter often show at the start of a sentence?", "The sentence is beginning", ["The sentence is beginning", "The page is ending", "The word is whispered"]),
      item(id, "Which way do lines of English print usually move?", "Left to right", ["Left to right", "Bottom to top", "Right to left"]),
      item(id, "What is the name on the front of a book called?", "The title", ["The title", "The margin", "The paragraph"]),
      item(id, "What does a question mark tell a reader?", "The sentence asks something", ["The sentence asks something", "A new chapter begins", "A word is missing"]),
      item(id, "What is a group of sentences about one idea called?", "A paragraph", ["A paragraph", "A letter", "A cover"]),
    ], rng);
  }
  if (slug === "initial-sounds" || slug === "letter-word-sounds") {
    const sets = [
      ["moon", "map", "fish", "sun"],
      ["tiger", "top", "leaf", "game"],
      ["boat", "bird", "cat", "rain"],
      ["sock", "sand", "kite", "pig"],
      ["goat", "game", "moon", "leaf"],
      ["rain", "ring", "boat", "sock"],
      ["leaf", "lamp", "tiger", "fish"],
      ["fish", "fan", "rain", "goat"],
    ] as const;
    const [target, answer, ...others] = pick(sets, rng);
    return item(id, `Which word begins with the same sound as “${target}”?`, answer, shuffle([answer, ...others], rng), { speak: target, audioCue: listeningCueId("initial-sounds", target) });
  }
  if (slug === "auditory-vocabulary" || slug === "vocabulary") {
    const [word, answer, wrongA, wrongB] = pick(wordsByLevel[level], rng);
    return item(id, `What does “${word}” mean?`, answer, shuffle([answer, wrongA, wrongB], rng), { speak: word, audioCue: listeningCueId("vocabulary", word, level) });
  }
  if (slug === "letter-naming") {
    const letter = pick("BCDFGHJKLMNPRSTVWYZ".split(""), rng);
    return item(id, "Type this letter.", letter.toLowerCase(), undefined, { context: rng() > 0.5 ? letter : letter.toLowerCase() });
  }
  if (slug === "phoneme-segmentation") {
    const values = pick([["ship", "3"], ["map", "3"], ["stop", "4"], ["fish", "3"], ["moon", "3"], ["chat", "3"], ["frog", "4"], ["sun", "3"]] as const, rng);
    return item(id, `How many separate sounds do you hear in “${values[0]}”?`, values[1], ["2", "3", "4"], { speak: values[0], audioCue: listeningCueId("phoneme-segmentation", values[0]) });
  }
  if (slug === "spelling") {
    const word = pick(SPELLING_WORDS[level], rng);
    return item(id, "Listen, then type the word.", word, undefined, { speak: word, audioCue: listeningCueId("spelling", word, level) });
  }
  if (slug === "nonsense-word-fluency") {
    const word = pick(["lat", "mip", "sog", "vab", "nup", "fep", "rish", "dax"], rng);
    return item(id, "Sound out this make-believe word. Which real word starts with the same sound?", word[0] === "m" ? "moon" : word[0] === "s" ? "sun" : word[0] === "n" ? "nest" : word[0] === "v" ? "van" : "lamp", shuffle([word[0] === "m" ? "moon" : word[0] === "s" ? "sun" : word[0] === "n" ? "nest" : word[0] === "v" ? "van" : "lamp", "fish", "cake"], rng), { context: word });
  }
  if (slug === "word-reading-fluency") {
    const [word, answer, wrongA] = pick(
      [["little", "small", "noisy"], ["quick", "fast", "empty"], ["under", "below", "above"], ["begin", "start", "stop"], ["glad", "happy", "angry"], ["large", "big", "tiny"], ["silent", "quiet", "bright"], ["finish", "end", "open"]] as const, rng);
    return item(id, "Read the word. Which word means nearly the same thing?", answer, shuffle([answer, wrongA, "round"], rng), { context: word });
  }

  const passage = passages[level];
  if (slug === "listening-comprehension") {
    const qa = pick(comprehensionQuestions.early, rng);
    return item(id, qa[0], qa[1], shuffle([qa[1], qa[2], qa[3]], rng), { context: "Tap the speaker and listen without reading.", speak: passages.early.text, audioCue: listeningCueId("listening-comprehension", "the-window-garden") });
  }
  if (slug === "reading-comprehension-progress") {
    const qa = pick(progressQuestions, rng);
    return item(id, qa[0], qa[1], shuffle([qa[1], qa[2], qa[3]], rng), { context: progressPassage });
  }
  if (slug === "reading-maze") {
    const qa = pick(mazeQuestions, rng);
    return item(id, qa[0], qa[1], shuffle([qa[1], qa[2], qa[3]], rng));
  }
  if (slug === "silent-reading-fluency" || slug === "reading-comprehension") {
    const qa = pick(comprehensionQuestions[level], rng);
    return item(id, qa[0], qa[1], shuffle([qa[1], qa[2], qa[3]], rng), { context: passage.text });
  }
  return item(id, "Choose the word that best completes the sentence: The puppy was ___ to greet us.", "eager", ["eager", "distant", "silent"]);
}

export function generatePracticeItems(assessment: Assessment, grade: Grade, count = 8, rng: Rng = Math.random) {
  const generated: PracticeItem[] = [];
  const seen = new Set<string>();
  const maxAttempts = Math.max(count * 20, 40);

  for (let attempt = 0; attempt < maxAttempts && generated.length < count; attempt += 1) {
    const candidate = assessment.domain === "Math"
      ? mathItem(assessment.slug, grade, `${assessment.slug}-${generated.length}`, rng)
      : readingItem(assessment.slug, grade, `${assessment.slug}-${generated.length}`, rng);
    const key = `${candidate.prompt}\u0000${candidate.context ?? ""}\u0000${candidate.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    generated.push(candidate);
  }

  return generated;
}

export function oralPassageForGrade(grade: Grade): OralPassage {
  const selected = passages[levelForGrade(grade)];
  return { ...selected, wordCount: selected.text.trim().split(/\s+/).length };
}

export function isCorrectAnswer(given: string, expected: string) {
  return given.trim().toLocaleLowerCase().replace(/[.,!?]/g, "") === expected.trim().toLocaleLowerCase().replace(/[.,!?]/g, "");
}
