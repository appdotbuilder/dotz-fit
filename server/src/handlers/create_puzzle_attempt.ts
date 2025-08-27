import { db } from '../db';
import { puzzleAttemptsTable } from '../db/schema';
import { type CreatePuzzleAttemptInput, type PuzzleAttempt } from '../schema';

export const createPuzzleAttempt = async (input: CreatePuzzleAttemptInput): Promise<PuzzleAttempt> => {
  try {
    // Insert puzzle attempt record
    const result = await db.insert(puzzleAttemptsTable)
      .values({
        user_id: input.user_id || null,
        puzzle_id: input.puzzle_id,
        attempt_data: input.attempt_data,
        is_completed: false,
        completion_time: null,
        completed_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Puzzle attempt creation failed:', error);
    throw error;
  }
};