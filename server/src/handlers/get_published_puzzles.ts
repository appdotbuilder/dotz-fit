import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { type Puzzle } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPublishedPuzzles = async (limit: number = 20, offset: number = 0): Promise<Puzzle[]> => {
  try {
    // Query published puzzles ordered by creation date (newest first)
    const results = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.is_published, true))
      .orderBy(desc(puzzlesTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert date fields to proper Date objects
    return results.map(puzzle => ({
      ...puzzle,
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    }));
  } catch (error) {
    console.error('Failed to fetch published puzzles:', error);
    throw error;
  }
};