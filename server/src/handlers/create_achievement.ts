import { db } from '../db';
import { achievementsTable, usersTable, puzzlesTable } from '../db/schema';
import { type CreateAchievementInput, type Achievement } from '../schema';
import { eq } from 'drizzle-orm';

export const createAchievement = async (input: CreateAchievementInput): Promise<Achievement> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Verify that the puzzle exists
    const puzzle = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, input.puzzle_id))
      .execute();

    if (puzzle.length === 0) {
      throw new Error(`Puzzle with id ${input.puzzle_id} not found`);
    }

    // Insert achievement record
    const result = await db.insert(achievementsTable)
      .values({
        user_id: input.user_id,
        puzzle_id: input.puzzle_id,
        difficulty_level: input.difficulty_level,
        completion_time: input.completion_time,
        is_cookie_trifecta: input.is_cookie_trifecta ?? false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Achievement creation failed:', error);
    throw error;
  }
};