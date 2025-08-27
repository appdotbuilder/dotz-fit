import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { type Puzzle } from '../schema';
import { eq } from 'drizzle-orm';

export const getPuzzleById = async (id: number): Promise<Puzzle | null> => {
  try {
    const results = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const puzzle = results[0];
    return {
      ...puzzle,
      created_at: puzzle.created_at,
      updated_at: puzzle.updated_at,
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    };
  } catch (error) {
    console.error('Failed to get puzzle by ID:', error);
    throw error;
  }
};