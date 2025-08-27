import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const deletePuzzle = async (puzzleId: number, creatorId: number): Promise<boolean> => {
  try {
    // Delete puzzle only if it belongs to the creator
    const result = await db.delete(puzzlesTable)
      .where(
        and(
          eq(puzzlesTable.id, puzzleId),
          eq(puzzlesTable.creator_id, creatorId)
        )
      )
      .execute();

    // Return true if a row was deleted, false otherwise
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Puzzle deletion failed:', error);
    throw error;
  }
};