import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { puzzlesTable, usersTable } from '../db/schema';
import { type UpdatePuzzleInput, type CreateUserInput } from '../schema';
import { updatePuzzle } from '../handlers/update_puzzle';
import { eq } from 'drizzle-orm';

// Test helper to create a user
const createTestUser = async (): Promise<number> => {
  const userData: CreateUserInput = {
    email: 'test@example.com',
    display_name: 'Test User',
    auth_provider: 'email',
    auth_provider_id: 'test123'
  };

  const result = await db.insert(usersTable)
    .values(userData)
    .returning()
    .execute();

  return result[0].id;
};

// Test helper to create a puzzle
const createTestPuzzle = async (creatorId: number) => {
  const puzzleData = {
    title: 'Original Puzzle',
    description: 'Original description',
    creator_id: creatorId,
    difficulty_level: 'Easy' as const,
    grid_width: 5,
    grid_height: 5,
    board_data: '{"regions": []}',
    dominoes_data: '[{"value1": 1, "value2": 2}]',
    conditions_data: '[{"type": "sum", "value": 10}]',
    solution_data: '{"solution": "test"}',
    is_published: false,
    is_daily_puzzle: false,
    daily_puzzle_date: null
  };

  const result = await db.insert(puzzlesTable)
    .values(puzzleData)
    .returning()
    .execute();

  return result[0];
};

describe('updatePuzzle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update puzzle title', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    const updateInput: UpdatePuzzleInput = {
      id: puzzle.id,
      title: 'Updated Title'
    };

    const result = await updatePuzzle(updateInput);

    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.difficulty_level).toEqual('Easy'); // Unchanged
    expect(result.id).toEqual(puzzle.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > puzzle.updated_at).toBe(true);
  });

  it('should update multiple fields', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    const updateInput: UpdatePuzzleInput = {
      id: puzzle.id,
      title: 'Multi-Updated Title',
      difficulty_level: 'Hard',
      grid_width: 8,
      grid_height: 6,
      is_published: true,
      is_daily_puzzle: true,
      daily_puzzle_date: new Date('2024-01-15')
    };

    const result = await updatePuzzle(updateInput);

    expect(result.title).toEqual('Multi-Updated Title');
    expect(result.difficulty_level).toEqual('Hard');
    expect(result.grid_width).toEqual(8);
    expect(result.grid_height).toEqual(6);
    expect(result.is_published).toBe(true);
    expect(result.is_daily_puzzle).toBe(true);
    expect(result.daily_puzzle_date).toEqual(new Date('2024-01-15'));
    
    // Unchanged fields
    expect(result.description).toEqual('Original description');
    expect(result.creator_id).toEqual(userId);
    expect(result.board_data).toEqual('{"regions": []}');
  });

  it('should handle nullable fields correctly', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    const updateInput: UpdatePuzzleInput = {
      id: puzzle.id,
      description: null,
      solution_data: null,
      daily_puzzle_date: null
    };

    const result = await updatePuzzle(updateInput);

    expect(result.description).toBe(null);
    expect(result.solution_data).toBe(null);
    expect(result.daily_puzzle_date).toBe(null);
    
    // Other fields should remain unchanged
    expect(result.title).toEqual('Original Puzzle');
    expect(result.is_published).toBe(false);
  });

  it('should update JSON data fields', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    const updateInput: UpdatePuzzleInput = {
      id: puzzle.id,
      board_data: '{"regions": [{"id": 1, "cells": []}]}',
      dominoes_data: '[{"value1": 3, "value2": 4}, {"value1": 5, "value2": 6}]',
      conditions_data: '[{"type": "product", "value": 20}]'
    };

    const result = await updatePuzzle(updateInput);

    expect(result.board_data).toEqual('{"regions": [{"id": 1, "cells": []}]}');
    expect(result.dominoes_data).toEqual('[{"value1": 3, "value2": 4}, {"value1": 5, "value2": 6}]');
    expect(result.conditions_data).toEqual('[{"type": "product", "value": 20}]');
    
    // Other fields should remain unchanged
    expect(result.title).toEqual('Original Puzzle');
    expect(result.difficulty_level).toEqual('Easy');
  });

  it('should persist changes to database', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    const updateInput: UpdatePuzzleInput = {
      id: puzzle.id,
      title: 'Database Persisted Title',
      difficulty_level: 'Medium'
    };

    await updatePuzzle(updateInput);

    // Query database directly to verify persistence
    const puzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, puzzle.id))
      .execute();

    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].title).toEqual('Database Persisted Title');
    expect(puzzles[0].difficulty_level).toEqual('Medium');
    expect(puzzles[0].updated_at).toBeInstanceOf(Date);
    expect(puzzles[0].updated_at > puzzle.updated_at).toBe(true);
  });

  it('should throw error when puzzle does not exist', async () => {
    const updateInput: UpdatePuzzleInput = {
      id: 999, // Non-existent puzzle ID
      title: 'Updated Title'
    };

    await expect(updatePuzzle(updateInput)).rejects.toThrow(/Puzzle with id 999 not found/i);
  });

  it('should handle updating only updated_at when no other fields provided', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    const updateInput: UpdatePuzzleInput = {
      id: puzzle.id
      // No other fields provided
    };

    const result = await updatePuzzle(updateInput);

    // All original fields should remain the same except updated_at
    expect(result.title).toEqual('Original Puzzle');
    expect(result.description).toEqual('Original description');
    expect(result.difficulty_level).toEqual('Easy');
    expect(result.grid_width).toEqual(5);
    expect(result.grid_height).toEqual(5);
    expect(result.is_published).toBe(false);
    expect(result.is_daily_puzzle).toBe(false);
    
    // But updated_at should be newer
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > puzzle.updated_at).toBe(true);
  });

  it('should update boolean fields correctly', async () => {
    const userId = await createTestUser();
    const puzzle = await createTestPuzzle(userId);

    // First update: set booleans to true
    const updateInput1: UpdatePuzzleInput = {
      id: puzzle.id,
      is_published: true,
      is_daily_puzzle: true
    };

    const result1 = await updatePuzzle(updateInput1);
    expect(result1.is_published).toBe(true);
    expect(result1.is_daily_puzzle).toBe(true);

    // Second update: set booleans back to false
    const updateInput2: UpdatePuzzleInput = {
      id: puzzle.id,
      is_published: false,
      is_daily_puzzle: false
    };

    const result2 = await updatePuzzle(updateInput2);
    expect(result2.is_published).toBe(false);
    expect(result2.is_daily_puzzle).toBe(false);
  });
});