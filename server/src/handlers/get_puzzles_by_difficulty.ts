import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { type GetPuzzlesByDifficultyInput, type Puzzle } from '../schema';
import { eq } from 'drizzle-orm';

export const getPuzzlesByDifficulty = async (input: GetPuzzlesByDifficultyInput): Promise<Puzzle[]> => {
  try {
    const results = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.difficulty_level, input.difficulty_level))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert date strings to Date objects to match Zod schema
    return results.map(puzzle => ({
      ...puzzle,
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    }));
  } catch (error) {
    console.error('Failed to get puzzles by difficulty:', error);
    throw error;
  }
};