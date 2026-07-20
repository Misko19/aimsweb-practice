import type { Assessment, Grade } from "./assessments";

export type PracticeItem = {
  id: string;
  prompt: string;
  instruction?: string;
  context?: string;
  choices?: string[];
  answer: string;
  speak?: string;
};

export type OralPassage = {
  title: string;
  text: string;
  wordCount: number;
};

type Rng = () => number;

const pick = <T,>(values: readonly T[], rng: Rng) => values[Math.floor(rng() * values.length)]!;
const shuffle = <T,>(values: readonly T[], rng: Rng) =>
  [...values].sort(() => rng() - 0.5);

const wordsByLevel: Record<"early" | "middle" | "advanced", readonly (readonly [string, string, string, string])[]> = {
  early: [
    ["tiny", "very small", "very loud", "very slow"],
    ["glad", "happy", "sleepy", "empty"],
    ["begin", "start", "hide", "carry"],
    ["swift", "fast", "soft", "round"],
  ],
  middle: [
    ["observe", "watch carefully", "forget", "divide"],
    ["scarce", "hard to find", "brightly colored", "easy to carry"],
    ["reluctant", "not eager", "very certain", "full of energy"],
    ["conclude", "decide after thinking", "begin again", "ask permission"],
  ],
  advanced: [
    ["ambiguous", "open to more than one meaning", "perfectly balanced", "easily measured"],
    ["mitigate", "make less severe", "copy exactly", "prove impossible"],
    ["pragmatic", "focused on practical results", "guided by nostalgia", "unable to change"],
    ["corroborate", "support with more evidence", "hide from view", "argue without evidence"],
  ],
} as const;

const passages = {
  early: {
    title: "The Window Garden",
    text: "Maya planted three bean seeds in a pot by the window. Each morning, she checked the dark soil. On Friday, a green loop pushed into the light. Maya drew the tiny sprout in her notebook. She measured it every day and turned the pot so each side could face the sun. Soon, broad leaves reached over the rim.",
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
  const a = Math.max(1, Math.floor(rng() * limit));
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
    const values = a === b ? [a, b + 1] : [a, b];
    const answer = String(Math.max(...values));
    return item(id, "Choose the greater number.", answer, values.map(String));
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
  if (slug === "concepts-applications") {
    if (grade === "pre-k" || grade === "k") {
      const count = 2 + Math.floor(rng() * 5);
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
    ], rng);
  }
  if (slug === "initial-sounds" || slug === "letter-word-sounds") {
    const sets = [
      ["moon", "map", "fish", "sun"],
      ["tiger", "top", "leaf", "game"],
      ["boat", "bird", "cat", "rain"],
      ["sock", "sand", "kite", "pig"],
    ] as const;
    const [target, answer, ...others] = pick(sets, rng);
    return item(id, `Which word begins with the same sound as “${target}”?`, answer, shuffle([answer, ...others], rng), { speak: target });
  }
  if (slug === "auditory-vocabulary" || slug === "vocabulary") {
    const [word, answer, wrongA, wrongB] = pick(wordsByLevel[level], rng);
    return item(id, `What does “${word}” mean?`, answer, shuffle([answer, wrongA, wrongB], rng), { speak: word });
  }
  if (slug === "letter-naming") {
    const letter = pick("BCDFGHJKLMNPRSTVWYZ".split(""), rng);
    return item(id, "Type the name of this letter.", letter.toLowerCase(), undefined, { context: rng() > 0.5 ? letter : letter.toLowerCase() });
  }
  if (slug === "phoneme-segmentation") {
    const values = pick([["ship", "3"], ["map", "3"], ["stop", "4"], ["fish", "3"], ["moon", "3"]] as const, rng);
    return item(id, `How many separate sounds do you hear in “${values[0]}”?`, values[1], ["2", "3", "4"], { speak: values[0] });
  }
  if (slug === "spelling") {
    const word = pick(level === "early" ? ["ship", "green", "play", "jump"] : level === "middle" ? ["journey", "separate", "curious", "necessary"] : ["conscientious", "accommodate", "rhythm", "perseverance"], rng);
    return item(id, "Listen, then type the word.", word, undefined, { speak: word });
  }
  if (slug === "nonsense-word-fluency") {
    const word = pick(["lat", "mip", "sog", "vab", "nup"], rng);
    return item(id, "Sound out this make-believe word. Which real word starts with the same sound?", word[0] === "m" ? "moon" : word[0] === "s" ? "sun" : word[0] === "n" ? "nest" : word[0] === "v" ? "van" : "lamp", shuffle([word[0] === "m" ? "moon" : word[0] === "s" ? "sun" : word[0] === "n" ? "nest" : word[0] === "v" ? "van" : "lamp", "fish", "cake"], rng), { context: word });
  }
  if (slug === "word-reading-fluency") {
    const [word, answer, wrongA] = pick([["little", "small", "noisy"], ["quick", "fast", "empty"], ["under", "below", "above"]] as const, rng);
    return item(id, "Read the word. Which word means nearly the same thing?", answer, shuffle([answer, wrongA, "round"], rng), { context: word });
  }

  const passage = passages[level];
  if (slug === "listening-comprehension") {
    return item(id, "What did Maya do after the sprout appeared?", "She drew and measured it", ["She drew and measured it", "She moved it outside", "She gave it away"], { context: "Tap the speaker and listen without reading.", speak: passages.early.text });
  }
  if (slug === "silent-reading-fluency" || slug === "reading-comprehension") {
    const qa = level === "early"
      ? ["Why did Maya turn the pot?", "So each side could get sunlight", "To spill out the soil", "To hide the leaves"]
      : level === "middle"
        ? ["What was the main benefit of the tool-lending room?", "Neighbors could share useful equipment", "The center could sell old books", "Volunteers could avoid repairs"]
        : ["What is the passage’s central idea?", "Thoughtful lighting can serve people while reducing harm", "All city lighting should be removed", "Warm bulbs always use more energy"];
    return item(id, qa[0], qa[1], shuffle([qa[1], qa[2], qa[3]], rng), { context: passage.text });
  }
  return item(id, "Choose the word that best completes the sentence: The puppy was ___ to greet us.", "eager", ["eager", "distant", "silent"]);
}

export function generatePracticeItems(assessment: Assessment, grade: Grade, count = 8, rng: Rng = Math.random) {
  return Array.from({ length: count }, (_, index) =>
    assessment.domain === "Math"
      ? mathItem(assessment.slug, grade, `${assessment.slug}-${index}`, rng)
      : readingItem(assessment.slug, grade, `${assessment.slug}-${index}`, rng),
  );
}

export function oralPassageForGrade(grade: Grade): OralPassage {
  const selected = passages[levelForGrade(grade)];
  return { ...selected, wordCount: selected.text.trim().split(/\s+/).length };
}

export function isCorrectAnswer(given: string, expected: string) {
  return given.trim().toLocaleLowerCase().replace(/[.,!?]/g, "") === expected.trim().toLocaleLowerCase().replace(/[.,!?]/g, "");
}
