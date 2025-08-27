import { db } from '../db';
import { puzzlesTable, usersTable } from '../db/schema';
import { type CreatePuzzleInput, type Puzzle } from '../schema';
import { eq } from 'drizzle-orm';

export const createPuzzle = async (input: CreatePuzzleInput): Promise<Puzzle> => {
  try {
    // Validate creator exists if creator_id is provided
    if (input.creator_id) {
      const creator = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.creator_id))
        .execute();

      if (creator.length === 0) {
        throw new Error(`Creator with ID ${input.creator_id} does not exist`);
      }
    }

    // Insert puzzle record
    const result = await db.insert(puzzlesTable)
      .values({
        title: input.title,
        description: input.description || null,
        creator_id: input.creator_id || null,
        difficulty_level: input.difficulty_level,
        grid_width: input.grid_width,
        grid_height: input.grid_height,
        board_data: input.board_data,
        dominoes_data: input.dominoes_data,
        conditions_data: input.conditions_data,
        solution_data: input.solution_data || null,
        is_published: input.is_published || false,
        is_daily_puzzle: input.is_daily_puzzle || false,
        daily_puzzle_date: input.daily_puzzle_date ? input.daily_puzzle_date.toISOString().split('T')[0] : null
      })
      .returning()
      .execute();

    // Convert date string back to Date object for return type consistency
    const puzzle = result[0];
    return {
      ...puzzle,
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    };
  } catch (error) {
    console.error('Puzzle creation failed:', error);
    throw error;
  }
};