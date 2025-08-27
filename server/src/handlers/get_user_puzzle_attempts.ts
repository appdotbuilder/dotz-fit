import { db } from '../db';
import { puzzleAttemptsTable } from '../db/schema';
import { type PuzzleAttempt } from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getUserPuzzleAttempts = async (userId: number, puzzleId?: number): Promise<PuzzleAttempt[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(puzzleAttemptsTable.user_id, userId));
    
    // Optionally filter by puzzle_id
    if (puzzleId !== undefined) {
      conditions.push(eq(puzzleAttemptsTable.puzzle_id, puzzleId));
    }

    // Build and execute query in one chain
    const results = await db.select()
      .from(puzzleAttemptsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(puzzleAttemptsTable.started_at))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(attempt => ({
      ...attempt,
      completion_time: attempt.completion_time // Integer column - no conversion needed
    }));
  } catch (error) {
    console.error('Failed to get user puzzle attempts:', error);
    throw error;
  }
};