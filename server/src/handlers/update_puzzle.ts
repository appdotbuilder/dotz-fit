import { db } from '../db';
import { puzzlesTable } from '../db/schema';
import { type UpdatePuzzleInput, type Puzzle } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePuzzle = async (input: UpdatePuzzleInput): Promise<Puzzle> => {
  try {
    // First, verify the puzzle exists
    const existingPuzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, input.id))
      .execute();

    if (existingPuzzles.length === 0) {
      throw new Error(`Puzzle with id ${input.id} not found`);
    }

    // Build the update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    // Add optional fields if they are provided in input
    if (input.title !== undefined) {
      updateData['title'] = input.title;
    }
    if (input.description !== undefined) {
      updateData['description'] = input.description;
    }
    if (input.difficulty_level !== undefined) {
      updateData['difficulty_level'] = input.difficulty_level;
    }
    if (input.grid_width !== undefined) {
      updateData['grid_width'] = input.grid_width;
    }
    if (input.grid_height !== undefined) {
      updateData['grid_height'] = input.grid_height;
    }
    if (input.board_data !== undefined) {
      updateData['board_data'] = input.board_data;
    }
    if (input.dominoes_data !== undefined) {
      updateData['dominoes_data'] = input.dominoes_data;
    }
    if (input.conditions_data !== undefined) {
      updateData['conditions_data'] = input.conditions_data;
    }
    if (input.solution_data !== undefined) {
      updateData['solution_data'] = input.solution_data;
    }
    if (input.is_published !== undefined) {
      updateData['is_published'] = input.is_published;
    }
    if (input.is_daily_puzzle !== undefined) {
      updateData['is_daily_puzzle'] = input.is_daily_puzzle;
    }
    if (input.daily_puzzle_date !== undefined) {
      updateData['daily_puzzle_date'] = input.daily_puzzle_date;
    }

    // Update the puzzle
    const result = await db.update(puzzlesTable)
      .set(updateData)
      .where(eq(puzzlesTable.id, input.id))
      .returning()
      .execute();

    const puzzle = result[0];
    
    // Convert date fields that come back as strings to Date objects
    return {
      ...puzzle,
      created_at: new Date(puzzle.created_at),
      updated_at: new Date(puzzle.updated_at),
      daily_puzzle_date: puzzle.daily_puzzle_date ? new Date(puzzle.daily_puzzle_date) : null
    };
  } catch (error) {
    console.error('Puzzle update failed:', error);
    throw error;
  }
};