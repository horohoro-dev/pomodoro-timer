import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ==========================================
// ユーザーテーブル（idのみ、個人情報なし）
// ==========================================

export const users = pgTable("user", {
  id: text("id").primaryKey(),
});

// ==========================================
// ポモドーロセッションテーブル
// ==========================================

export const pomodoroSessions = pgTable("pomodoro_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { mode: "date" }).notNull(),
  endTime: timestamp("end_time", { mode: "date" }),
  duration: integer("duration").notNull(),
  type: text("type", { enum: ["work", "break"] }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});
