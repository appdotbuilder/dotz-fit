import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const difficultyLevelEnum = pgEnum('difficulty_level', ['Easy', 'Medium', 'Hard']);
export const authProviderEnum = pgEnum('auth_provider', ['google', 'facebook', 'email']);
export const conditionTypeEnum = pgEnum('condition_type', ['sum', 'product', 'difference', 'equality', 'greater_than', 'less_than']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  display_name: text('display_name').notNull(),
  auth_provider: authProviderEnum('auth_provider').notNull(),
  auth_provider_id: text('auth_provider_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Puzzles table
export const puzzlesTable = pgTable('puzzles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // nullable by default
  creator_id: integer('creator_id'), // nullable for system-generated puzzles
  difficulty_level: difficultyLevelEnum('difficulty_level').notNull(),
  grid_width: integer('grid_width').notNull(),
  grid_height: integer('grid_height').notNull(),
  board_data: text('board_data').notNull(), // JSON string containing board layout and regions
  dominoes_data: text('dominoes_data').notNull(), // JSON string containing available dominoes
  conditions_data: text('conditions_data').notNull(), // JSON string containing region conditions
  solution_data: text('solution_data'), // nullable - JSON string containing solution layout
  is_published: boolean('is_published').default(false).notNull(),
  is_daily_puzzle: boolean('is_daily_puzzle').default(false).notNull(),
  daily_puzzle_date: date('daily_puzzle_date'), // nullable - only set for daily puzzles
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Achievements table
export const achievementsTable = pgTable('achievements', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  puzzle_id: integer('puzzle_id').notNull(),
  difficulty_level: difficultyLevelEnum('difficulty_level').notNull(),
  completion_time: integer('completion_time').notNull(), // in seconds
  is_cookie_trifecta: boolean('is_cookie_trifecta').default(false).notNull(),
  achieved_at: timestamp('achieved_at').defaultNow().notNull()
});

// Puzzle attempts table
export const puzzleAttemptsTable = pgTable('puzzle_attempts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id'), // nullable for guest attempts
  puzzle_id: integer('puzzle_id').notNull(),
  attempt_data: text('attempt_data').notNull(), // JSON string containing current puzzle state
  is_completed: boolean('is_completed').default(false).notNull(),
  completion_time: integer('completion_time'), // nullable - in seconds, null if not completed
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at') // nullable - only set when completed
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdPuzzles: many(puzzlesTable),
  achievements: many(achievementsTable),
  puzzleAttempts: many(puzzleAttemptsTable)
}));

export const puzzlesRelations = relations(puzzlesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [puzzlesTable.creator_id],
    references: [usersTable.id]
  }),
  achievements: many(achievementsTable),
  attempts: many(puzzleAttemptsTable)
}));

export const achievementsRelations = relations(achievementsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [achievementsTable.user_id],
    references: [usersTable.id]
  }),
  puzzle: one(puzzlesTable, {
    fields: [achievementsTable.puzzle_id],
    references: [puzzlesTable.id]
  })
}));

export const puzzleAttemptsRelations = relations(puzzleAttemptsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [puzzleAttemptsTable.user_id],
    references: [usersTable.id]
  }),
  puzzle: one(puzzlesTable, {
    fields: [puzzleAttemptsTable.puzzle_id],
    references: [puzzlesTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Puzzle = typeof puzzlesTable.$inferSelect;
export type NewPuzzle = typeof puzzlesTable.$inferInsert;

export type Achievement = typeof achievementsTable.$inferSelect;
export type NewAchievement = typeof achievementsTable.$inferInsert;

export type PuzzleAttempt = typeof puzzleAttemptsTable.$inferSelect;
export type NewPuzzleAttempt = typeof puzzleAttemptsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  puzzles: puzzlesTable,
  achievements: achievementsTable,
  puzzleAttempts: puzzleAttemptsTable
};