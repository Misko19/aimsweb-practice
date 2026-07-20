import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { GRADES } from "../assessments";
import * as authSchema from "./auth-schema";

export * from "./auth-schema";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const parentSettings = sqliteTable("parent_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => authSchema.user.id, { onDelete: "cascade" }),
  privacyVersion: text("privacy_version").notNull(),
  privacyAcceptedAt: timestamp("privacy_accepted_at").notNull(),
  createdAt: timestamp("created_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
});

export const childProfile = sqliteTable(
  "child_profile",
  {
    id: text("id").primaryKey(),
    parentUserId: text("parent_user_id")
      .notNull()
      .references(() => authSchema.user.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    grade: text("grade", { enum: GRADES }).notNull(),
    avatar: text("avatar", { enum: ["fox", "owl", "otter", "turtle"] }).notNull(),
    createdAt: timestamp("created_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  },
  (table) => [index("child_parent_idx").on(table.parentUserId)],
);

export const practiceAttempt = sqliteTable(
  "practice_attempt",
  {
    id: text("id").primaryKey(),
    clientAttemptId: text("client_attempt_id").notNull(),
    parentUserId: text("parent_user_id")
      .notNull()
      .references(() => authSchema.user.id, { onDelete: "cascade" }),
    childProfileId: text("child_profile_id")
      .notNull()
      .references(() => childProfile.id, { onDelete: "cascade" }),
    assessmentSlug: text("assessment_slug").notNull(),
    grade: text("grade", { enum: GRADES }).notNull(),
    correct: integer("correct").notNull(),
    total: integer("total").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    kind: text("kind", { enum: ["accuracy", "words-read"] }).notNull(),
    completedAt: timestamp("completed_at").notNull(),
    createdAt: timestamp("created_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
  },
  (table) => [
    index("attempt_parent_child_idx").on(table.parentUserId, table.childProfileId),
    index("attempt_child_completed_idx").on(table.childProfileId, table.completedAt),
    uniqueIndex("attempt_parent_client_unique").on(table.parentUserId, table.clientAttemptId),
  ],
);

export const schema = { ...authSchema, parentSettings, childProfile, practiceAttempt };
