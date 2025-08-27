import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw error;
  }
};