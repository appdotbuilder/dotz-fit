import { db } from '../db';
import { achievementsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type DifficultyLevel } from '../schema';

export interface CookieTrifectaStatus {
  easy: boolean;
  medium: boolean;
  hard: boolean;
}

export const getCookieTrifectaStatus = async (userId: number): Promise<CookieTrifectaStatus> => {
  try {
    // Query achievements where user has cookie trifecta status for each difficulty level
    const cookieAchievements = await db.select()
      .from(achievementsTable)
      .where(
        and(
          eq(achievementsTable.user_id, userId),
          eq(achievementsTable.is_cookie_trifecta, true)
        )
      )
      .execute();

    // Check which difficulty levels have cookie trifecta achievements
    const status: CookieTrifectaStatus = {
      easy: false,
      medium: false,
      hard: false
    };

    cookieAchievements.forEach(achievement => {
      const difficultyLevel = achievement.difficulty_level.toLowerCase() as keyof CookieTrifectaStatus;
      status[difficultyLevel] = true;
    });

    return status;
  } catch (error) {
    console.error('Cookie trifecta status retrieval failed:', error);
    throw error;
  }
};