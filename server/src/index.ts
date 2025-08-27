import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createPuzzleInputSchema,
  updatePuzzleInputSchema,
  getPuzzlesByDifficultyInputSchema,
  getPuzzlesByCreatorInputSchema,
  createPuzzleAttemptInputSchema,
  updatePuzzleAttemptInputSchema,
  createAchievementInputSchema,
  getUserAchievementsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUserByEmail } from './handlers/get_user_by_email';
import { createPuzzle } from './handlers/create_puzzle';
import { updatePuzzle } from './handlers/update_puzzle';
import { getPuzzleById } from './handlers/get_puzzle_by_id';
import { getPuzzlesByDifficulty } from './handlers/get_puzzles_by_difficulty';
import { getPuzzlesByCreator } from './handlers/get_puzzles_by_creator';
import { getPublishedPuzzles } from './handlers/get_published_puzzles';
import { getDailyPuzzle } from './handlers/get_daily_puzzle';
import { createPuzzleAttempt } from './handlers/create_puzzle_attempt';
import { updatePuzzleAttempt } from './handlers/update_puzzle_attempt';
import { getUserPuzzleAttempts } from './handlers/get_user_puzzle_attempts';
import { createAchievement } from './handlers/create_achievement';
import { getUserAchievements } from './handlers/get_user_achievements';
import { getCookieTrifectaStatus } from './handlers/get_cookie_trifecta_status';
import { deletePuzzle } from './handlers/delete_puzzle';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserByEmail: publicProcedure
    .input(z.string().email())
    .query(({ input }) => getUserByEmail(input)),

  // Puzzle management
  createPuzzle: publicProcedure
    .input(createPuzzleInputSchema)
    .mutation(({ input }) => createPuzzle(input)),

  updatePuzzle: publicProcedure
    .input(updatePuzzleInputSchema)
    .mutation(({ input }) => updatePuzzle(input)),

  getPuzzleById: publicProcedure
    .input(z.number())
    .query(({ input }) => getPuzzleById(input)),

  getPuzzlesByDifficulty: publicProcedure
    .input(getPuzzlesByDifficultyInputSchema)
    .query(({ input }) => getPuzzlesByDifficulty(input)),

  getPuzzlesByCreator: publicProcedure
    .input(getPuzzlesByCreatorInputSchema)
    .query(({ input }) => getPuzzlesByCreator(input)),

  getPublishedPuzzles: publicProcedure
    .input(z.object({
      limit: z.number().int().positive().optional().default(20),
      offset: z.number().int().nonnegative().optional().default(0)
    }))
    .query(({ input }) => getPublishedPuzzles(input.limit, input.offset)),

  getDailyPuzzle: publicProcedure
    .input(z.coerce.date().optional())
    .query(({ input }) => getDailyPuzzle(input)),

  deletePuzzle: publicProcedure
    .input(z.object({
      puzzleId: z.number(),
      creatorId: z.number()
    }))
    .mutation(({ input }) => deletePuzzle(input.puzzleId, input.creatorId)),

  // Puzzle attempts
  createPuzzleAttempt: publicProcedure
    .input(createPuzzleAttemptInputSchema)
    .mutation(({ input }) => createPuzzleAttempt(input)),

  updatePuzzleAttempt: publicProcedure
    .input(updatePuzzleAttemptInputSchema)
    .mutation(({ input }) => updatePuzzleAttempt(input)),

  getUserPuzzleAttempts: publicProcedure
    .input(z.object({
      userId: z.number(),
      puzzleId: z.number().optional()
    }))
    .query(({ input }) => getUserPuzzleAttempts(input.userId, input.puzzleId)),

  // Achievements
  createAchievement: publicProcedure
    .input(createAchievementInputSchema)
    .mutation(({ input }) => createAchievement(input)),

  getUserAchievements: publicProcedure
    .input(getUserAchievementsInputSchema)
    .query(({ input }) => getUserAchievements(input)),

  getCookieTrifectaStatus: publicProcedure
    .input(z.number())
    .query(({ input }) => getCookieTrifectaStatus(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();