import { db } from '../db';
import { puzzleAttemptsTable } from '../db/schema';
import { type UpdatePuzzleAttemptInput, type PuzzleAttempt } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePuzzleAttempt = async (input: UpdatePuzzleAttemptInput): Promise<PuzzleAttempt> => {
  try {
    // Build update values only for fields that are provided
    const updateValues: any = {};
    
    if (input.attempt_data !== undefined) {
      updateValues.attempt_data = input.attempt_data;
    }
    
    if (input.is_completed !== undefined) {
      updateValues.is_completed = input.is_completed;
    }
    
    if (input.completion_time !== undefined) {
      updateValues.completion_time = input.completion_time;
    }
    
    if (input.completed_at !== undefined) {
      updateValues.completed_at = input.completed_at;
    }

    // Always update the updated_at timestamp implicitly handled by database
    
    // Update the puzzle attempt record
    const result = await db.update(puzzleAttemptsTable)
      .set(updateValues)
      .where(eq(puzzleAttemptsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Puzzle attempt with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Puzzle attempt update failed:', error);
    throw error;
  }
};