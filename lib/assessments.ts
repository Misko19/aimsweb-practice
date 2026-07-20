export const GRADES = ["pre-k", "k", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const;

export type Grade = (typeof GRADES)[number];
export type Domain = "Reading" | "Math";
export type PracticeMode = "questions" | "oral-reading";

export type Assessment = {
  slug: string;
  name: string;
  abbreviation: string;
  domain: Domain;
  grades: readonly Grade[];
  description: string;
  officialTime: string;
  practiceTime: string;
  mode: PracticeMode;
  adultHelp?: boolean;
  benchmarkOnly?: boolean;
};

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => String(start + index) as Grade);

export const ASSESSMENTS: readonly Assessment[] = [
  {
    slug: "print-concepts",
    name: "Print Concepts",
    abbreviation: "PC",
    domain: "Reading",
    grades: ["pre-k", "k"],
    description: "Practice how books and printed words work.",
    officialTime: "about 2–3 min",
    practiceTime: "about 4 min",
    mode: "questions",
    adultHelp: true,
    benchmarkOnly: true,
  },
  {
    slug: "initial-sounds",
    name: "Initial Sounds",
    abbreviation: "IS",
    domain: "Reading",
    grades: ["pre-k", "k"],
    description: "Match spoken words that begin with the same sound.",
    officialTime: "about 2–3 min",
    practiceTime: "about 4 min",
    mode: "questions",
    adultHelp: true,
  },
  {
    slug: "auditory-vocabulary",
    name: "Auditory Vocabulary",
    abbreviation: "AV",
    domain: "Reading",
    grades: ["pre-k", "k", "1"],
    description: "Listen for a word and choose what it means.",
    officialTime: "about 2–4 min",
    practiceTime: "about 5 min",
    mode: "questions",
    benchmarkOnly: true,
  },
  {
    slug: "letter-naming",
    name: "Letter Naming Fluency",
    abbreviation: "LNF",
    domain: "Reading",
    grades: ["pre-k", "k", "1"],
    description: "Build speed and confidence naming letters.",
    officialTime: "1 min",
    practiceTime: "1 min",
    mode: "questions",
  },
  {
    slug: "letter-word-sounds",
    name: "Letter Word Sounds Fluency",
    abbreviation: "LWSF",
    domain: "Reading",
    grades: ["pre-k", "k", "1"],
    description: "Practice letter sounds, blends, and simple words.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "phoneme-segmentation",
    name: "Phoneme Segmentation",
    abbreviation: "PS",
    domain: "Reading",
    grades: ["k", "1"],
    description: "Break spoken words into their individual sounds.",
    officialTime: "about 2–3 min",
    practiceTime: "about 4 min",
    mode: "questions",
    adultHelp: true,
  },
  {
    slug: "listening-comprehension",
    name: "Listening Comprehension",
    abbreviation: "LC",
    domain: "Reading",
    grades: ["k", "1", "2"],
    description: "Listen to a short story and answer questions.",
    officialTime: "about 10–15 min",
    practiceTime: "about 6 min",
    mode: "questions",
  },
  {
    slug: "spelling",
    name: "Spelling",
    abbreviation: "SP",
    domain: "Reading",
    grades: ["k", "1", ...range(2, 12)],
    description: "Hear a word and type its spelling.",
    officialTime: "about 5–7 min",
    practiceTime: "about 5 min",
    mode: "questions",
    adultHelp: true,
    benchmarkOnly: true,
  },
  {
    slug: "nonsense-word-fluency",
    name: "Nonsense Word Fluency",
    abbreviation: "NWF",
    domain: "Reading",
    grades: ["k", "1"],
    description: "Sound out made-up words using phonics skills.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "word-reading-fluency",
    name: "Word Reading Fluency",
    abbreviation: "WRF",
    domain: "Reading",
    grades: ["k", "1"],
    description: "Read familiar words quickly and accurately.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "oral-reading-fluency",
    name: "Oral Reading Fluency",
    abbreviation: "ORF",
    domain: "Reading",
    grades: range(1, 12),
    description: "Read an original passage aloud for one minute.",
    officialTime: "about 1–2 min",
    practiceTime: "about 3 min",
    mode: "oral-reading",
    adultHelp: true,
  },
  {
    slug: "silent-reading-fluency",
    name: "Silent Reading Fluency",
    abbreviation: "SRF",
    domain: "Reading",
    grades: range(4, 12),
    description: "Read short sections silently and answer quickly.",
    officialTime: "about 5–15 min",
    practiceTime: "about 6 min",
    mode: "questions",
  },
  {
    slug: "vocabulary",
    name: "Vocabulary",
    abbreviation: "VO",
    domain: "Reading",
    grades: range(2, 12),
    description: "Choose the meaning of words in context.",
    officialTime: "about 3–15 min",
    practiceTime: "about 5 min",
    mode: "questions",
  },
  {
    slug: "reading-comprehension",
    name: "Reading Comprehension",
    abbreviation: "RC",
    domain: "Reading",
    grades: range(2, 12),
    description: "Read original passages and answer questions.",
    officialTime: "about 15–45 min",
    practiceTime: "about 8 min",
    mode: "questions",
  },
  {
    slug: "quantity-total",
    name: "Quantity Total Fluency",
    abbreviation: "QTF",
    domain: "Math",
    grades: ["pre-k", "k"],
    description: "Quickly count a small group of objects.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "number-naming",
    name: "Number Naming Fluency",
    abbreviation: "NNF",
    domain: "Math",
    grades: ["pre-k", "k", "1"],
    description: "Recognize and name written numbers.",
    officialTime: "about 1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "quantity-difference",
    name: "Quantity Difference Fluency",
    abbreviation: "QDF",
    domain: "Math",
    grades: ["pre-k", "k"],
    description: "Tell how many more objects one group has.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "number-comparison-pairs",
    name: "Number Comparison Fluency – Pairs",
    abbreviation: "NCF–P",
    domain: "Math",
    grades: ["1"],
    description: "Quickly choose the greater of two numbers.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "math-facts-one-digit",
    name: "Math Facts Fluency – 1 Digit",
    abbreviation: "MFF–1D",
    domain: "Math",
    grades: ["1"],
    description: "Practice one-digit addition and subtraction facts.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "math-facts-tens",
    name: "Math Facts Fluency – Tens",
    abbreviation: "MFF–T",
    domain: "Math",
    grades: ["1"],
    description: "Practice facts with multiples of ten.",
    officialTime: "1 min",
    practiceTime: "3 min",
    mode: "questions",
  },
  {
    slug: "number-comparison-triads",
    name: "Number Comparison Fluency – Triads",
    abbreviation: "NCF–T",
    domain: "Math",
    grades: range(2, 12),
    description: "Find how three numbers are related.",
    officialTime: "3 min",
    practiceTime: "4 min",
    mode: "questions",
  },
  {
    slug: "mental-computation",
    name: "Mental Computation Fluency",
    abbreviation: "MCF",
    domain: "Math",
    grades: range(2, 12),
    description: "Solve grade-appropriate calculations mentally.",
    officialTime: "4 min",
    practiceTime: "5 min",
    mode: "questions",
  },
  {
    slug: "concepts-applications",
    name: "Concepts & Applications",
    abbreviation: "CA",
    domain: "Math",
    grades: GRADES,
    description: "Use math ideas to solve real-world problems.",
    officialTime: "about 7–35 min",
    practiceTime: "about 7 min",
    mode: "questions",
  },
] as const;

export function gradeLabel(grade: Grade) {
  if (grade === "pre-k") return "Pre-K";
  if (grade === "k") return "Kindergarten";
  const numeric = Number(grade);
  const suffix = numeric === 1 ? "st" : numeric === 2 ? "nd" : numeric === 3 ? "rd" : "th";
  return `${numeric}${suffix} grade`;
}

export function assessmentsForGrade(grade: Grade) {
  return ASSESSMENTS.filter((assessment) => assessment.grades.includes(grade));
}

export function findAssessment(slug: string) {
  return ASSESSMENTS.find((assessment) => assessment.slug === slug);
}
