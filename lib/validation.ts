import { z } from "zod";
import { GRADES } from "./assessments";
import { PRIVACY_VERSION } from "./privacy";

export const avatars = ["fox", "owl", "otter", "turtle"] as const;

export const consentInput = z.object({
  accepted: z.literal(true),
  privacyVersion: z.literal(PRIVACY_VERSION),
  timezone: z.string().min(1).max(100).refine((value) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
  }, "Enter a valid timezone."),
});

export const childProfileInput = z.object({
  nickname: z.string().trim().min(1, "Enter a nickname.").max(30, "Keep the nickname under 30 characters."),
  grade: z.enum(GRADES),
  avatar: z.enum(avatars),
});

export const attemptInput = z.object({
  clientAttemptId: z.string().min(8).max(100),
  childProfileId: z.string().min(8).max(100),
  assessmentSlug: z.string().min(1).max(100),
  grade: z.enum(GRADES),
  correct: z.number().int().min(0).max(10_000),
  total: z.number().int().positive().max(10_000),
  durationSeconds: z.number().int().positive().max(3_600),
  kind: z.enum(["accuracy", "words-read", "word-count"]),
  completedAt: z.iso.datetime(),
}).refine((value) => value.correct <= value.total, { message: "Correct answers cannot exceed the total." });
