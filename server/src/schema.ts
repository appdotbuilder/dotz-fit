import { z } from 'zod';

// Enum schemas
export const difficultyLevelSchema = z.enum(['Easy', 'Medium', 'Hard']);
export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;

export const authProviderSchema = z.enum(['google', 'facebook', 'email']);
export type AuthProvider = z.infer<typeof authProviderSchema>;

export const conditionTypeSchema = z.enum(['sum', 'product', 'difference', 'equality', 'greater_than', 'less_than']);
export type ConditionType = z.infer<typeof conditionTypeSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  display_name: z.string(),
  auth_provider: authProviderSchema,
  auth_provider_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Puzzle schema
export const puzzleSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  creator_id: z.number().nullable(), // null for system-generated puzzles
  difficulty_level: difficultyLevelSchema,
  grid_width: z.number().int().positive(),
  grid_height: z.number().int().positive(),
  board_data: z.string(), // JSON string containing board layout and regions
  dominoes_data: z.string(), // JSON string containing available dominoes
  conditions_data: z.string(), // JSON string containing region conditions
  solution_data: z.string().nullable(), // JSON string containing solution layout
  is_published: z.boolean(),
  is_daily_puzzle: z.boolean(),
  daily_puzzle_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Puzzle = z.infer<typeof puzzleSchema>;

// Achievement schema
export const achievementSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  puzzle_id: z.number(),
  difficulty_level: difficultyLevelSchema,
  completion_time: z.number().positive(), // in seconds
  is_cookie_trifecta: z.boolean(), // fast completion achievement
  achieved_at: z.coerce.date()
});

export type Achievement = z.infer<typeof achievementSchema>;

// Puzzle attempt schema
export const puzzleAttemptSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable(), // null for guest attempts
  puzzle_id: z.number(),
  attempt_data: z.string(), // JSON string containing current puzzle state
  is_completed: z.boolean(),
  completion_time: z.number().nullable(), // in seconds, null if not completed
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type PuzzleAttempt = z.infer<typeof puzzleAttemptSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
  auth_provider: authProviderSchema,
  auth_provider_id: z.string().min(1)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schemas for creating puzzles
export const createPuzzleInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  creator_id: z.number().optional(), // optional for system-generated puzzles
  difficulty_level: difficultyLevelSchema,
  grid_width: z.number().int().min(3).max(10),
  grid_height: z.number().int().min(3).max(10),
  board_data: z.string().min(1), // JSON string
  dominoes_data: z.string().min(1), // JSON string
  conditions_data: z.string().min(1), // JSON string
  solution_data: z.string().nullable().optional(),
  is_published: z.boolean().optional().default(false),
  is_daily_puzzle: z.boolean().optional().default(false),
  daily_puzzle_date: z.coerce.date().nullable().optional()
});

export type CreatePuzzleInput = z.infer<typeof createPuzzleInputSchema>;

// Input schemas for updating puzzles
export const updatePuzzleInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  difficulty_level: difficultyLevelSchema.optional(),
  grid_width: z.number().int().min(3).max(10).optional(),
  grid_height: z.number().int().min(3).max(10).optional(),
  board_data: z.string().min(1).optional(),
  dominoes_data: z.string().min(1).optional(),
  conditions_data: z.string().min(1).optional(),
  solution_data: z.string().nullable().optional(),
  is_published: z.boolean().optional(),
  is_daily_puzzle: z.boolean().optional(),
  daily_puzzle_date: z.coerce.date().nullable().optional()
});

export type UpdatePuzzleInput = z.infer<typeof updatePuzzleInputSchema>;

// Input schemas for creating achievements
export const createAchievementInputSchema = z.object({
  user_id: z.number(),
  puzzle_id: z.number(),
  difficulty_level: difficultyLevelSchema,
  completion_time: z.number().positive(),
  is_cookie_trifecta: z.boolean().optional().default(false)
});

export type CreateAchievementInput = z.infer<typeof createAchievementInputSchema>;

// Input schemas for creating puzzle attempts
export const createPuzzleAttemptInputSchema = z.object({
  user_id: z.number().nullable().optional(),
  puzzle_id: z.number(),
  attempt_data: z.string().min(1)
});

export type CreatePuzzleAttemptInput = z.infer<typeof createPuzzleAttemptInputSchema>;

// Input schemas for updating puzzle attempts
export const updatePuzzleAttemptInputSchema = z.object({
  id: z.number(),
  attempt_data: z.string().min(1).optional(),
  is_completed: z.boolean().optional(),
  completion_time: z.number().positive().nullable().optional(),
  completed_at: z.coerce.date().nullable().optional()
});

export type UpdatePuzzleAttemptInput = z.infer<typeof updatePuzzleAttemptInputSchema>;

// Query schemas
export const getPuzzlesByDifficultyInputSchema = z.object({
  difficulty_level: difficultyLevelSchema,
  limit: z.number().int().positive().optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetPuzzlesByDifficultyInput = z.infer<typeof getPuzzlesByDifficultyInputSchema>;

export const getPuzzlesByCreatorInputSchema = z.object({
  creator_id: z.number(),
  limit: z.number().int().positive().optional().default(20),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetPuzzlesByCreatorInput = z.infer<typeof getPuzzlesByCreatorInputSchema>;

export const getUserAchievementsInputSchema = z.object({
  user_id: z.number(),
  difficulty_level: difficultyLevelSchema.optional()
});

export type GetUserAchievementsInput = z.infer<typeof getUserAchievementsInputSchema>;