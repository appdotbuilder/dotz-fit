import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { type Puzzle } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getDailyPuzzle = async (date?: Date): Promise<Puzzle | null> => {
  try {
    // Default to today if no date provided
    const targetDate = date || new Date();
    
    // Format date to YYYY-MM-DD for comparison with daily_puzzle_date
    const formattedDate = targetDate.toISOString().split('T')[0];
    
    // Query for published daily puzzle on the specified date
    const result = await db.select()
      .from(puzzlesTable)
      .where(
        and(
          eq(puzzlesTable.is_daily_puzzle, true),
          eq(puzzlesTable.is_published, true),
          eq(puzzlesTable.daily_puzzle_date, formattedDate)
        )
      )
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const puzzle = result[0];
    return {
      ...puzzle,
      // Convert dates properly
      created_at: new Date(puzzle.created_at),
      updated_at: new Date(puzzle.updated_at),
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    };
  } catch (error) {
    console.error('Failed to fetch daily puzzle:', error);
    throw error;
  }
};