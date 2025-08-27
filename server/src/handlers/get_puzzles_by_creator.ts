import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { type GetPuzzlesByCreatorInput, type Puzzle } from '../schema';

export const getPuzzlesByCreator = async (input: GetPuzzlesByCreatorInput): Promise<Puzzle[]> => {
  try {
    // Build the query to fetch puzzles by creator
    const results = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.creator_id, input.creator_id))
      .orderBy(desc(puzzlesTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert date fields to proper Date objects to match schema expectations
    return results.map(puzzle => ({
      ...puzzle,
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    }));
  } catch (error) {
    console.error('Failed to fetch puzzles by creator:', error);
    throw error;
  }
};