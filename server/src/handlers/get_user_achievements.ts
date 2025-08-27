import { db } from '../db';
import { achievementsTable } from '../db/schema';
import { type GetUserAchievementsInput, type Achievement } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getUserAchievements = async (input: GetUserAchievementsInput): Promise<Achievement[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [eq(achievementsTable.user_id, input.user_id)];

    // Add difficulty filter if provided
    if (input.difficulty_level) {
      conditions.push(eq(achievementsTable.difficulty_level, input.difficulty_level));
    }

    // Build query with conditions
    const query = db.select()
      .from(achievementsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    // Execute query
    const results = await query.execute();

    // Return achievements (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get user achievements:', error);
    throw error;
  }
};