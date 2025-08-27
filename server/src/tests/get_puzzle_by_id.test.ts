import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { puzzlesTable, usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getPuzzleById } from '../handlers/get_puzzle_by_id';

// Test user for creating puzzles with creator_id
const testUser: CreateUserInput = {
  email: 'creator@example.com',
  display_name: 'Puzzle Creator',
  auth_provider: 'email',
  auth_provider_id: 'creator123'
};

// Test puzzle data for database insertion
const testPuzzleData = {
  title: 'Test Puzzle',
  description: 'A puzzle for testing',
  difficulty_level: 'Medium' as const,
  grid_width: 4,
  grid_height: 4,
  board_data: '{"regions": [{"id": 1, "cells": [[0,0],[0,1]]}]}',
  dominoes_data: '{"dominoes": [{"value1": 1, "value2": 2}]}',
  conditions_data: '{"conditions": [{"region_id": 1, "type": "sum", "target": 3}]}',
  solution_data: '{"solution": [{"domino_id": 1, "position": [0,0], "orientation": "horizontal"}]}',
  is_published: true,
  is_daily_puzzle: false,
  daily_puzzle_date: null
};

const systemPuzzleData = {
  title: 'System Puzzle',
  description: null,
  difficulty_level: 'Easy' as const,
  grid_width: 3,
  grid_height: 3,
  board_data: '{"regions": [{"id": 1, "cells": [[0,0]]}]}',
  dominoes_data: '{"dominoes": [{"value1": 1, "value2": 1}]}',
  conditions_data: '{"conditions": [{"region_id": 1, "type": "sum", "target": 2}]}',
  solution_data: null,
  is_published: false,
  is_daily_puzzle: true,
  daily_puzzle_date: '2024-01-01'
};

describe('getPuzzleById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return puzzle by ID', async () => {
    // Create a user first
    const userResults = await db.insert(usersTable)
      .values({
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create a puzzle
    const puzzleResults = await db.insert(puzzlesTable)
      .values({
        ...testPuzzleData,
        creator_id: userId
      })
      .returning()
      .execute();

    const createdPuzzle = puzzleResults[0];
    const result = await getPuzzleById(createdPuzzle.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdPuzzle.id);
    expect(result!.title).toBe('Test Puzzle');
    expect(result!.description).toBe('A puzzle for testing');
    expect(result!.creator_id).toBe(userId);
    expect(result!.difficulty_level).toBe('Medium');
    expect(result!.grid_width).toBe(4);
    expect(result!.grid_height).toBe(4);
    expect(result!.board_data).toBe('{"regions": [{"id": 1, "cells": [[0,0],[0,1]]}]}');
    expect(result!.dominoes_data).toBe('{"dominoes": [{"value1": 1, "value2": 2}]}');
    expect(result!.conditions_data).toBe('{"conditions": [{"region_id": 1, "type": "sum", "target": 3}]}');
    expect(result!.solution_data).toBe('{"solution": [{"domino_id": 1, "position": [0,0], "orientation": "horizontal"}]}');
    expect(result!.is_published).toBe(true);
    expect(result!.is_daily_puzzle).toBe(false);
    expect(result!.daily_puzzle_date).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent puzzle ID', async () => {
    const result = await getPuzzleById(99999);
    expect(result).toBeNull();
  });

  it('should handle system-generated puzzles without creator', async () => {
    // Create a system puzzle without creator_id
    const puzzleResults = await db.insert(puzzlesTable)
      .values({
        ...systemPuzzleData,
        creator_id: null
      })
      .returning()
      .execute();

    const createdPuzzle = puzzleResults[0];
    const result = await getPuzzleById(createdPuzzle.id);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdPuzzle.id);
    expect(result!.title).toBe('System Puzzle');
    expect(result!.description).toBeNull();
    expect(result!.creator_id).toBeNull();
    expect(result!.difficulty_level).toBe('Easy');
    expect(result!.is_daily_puzzle).toBe(true);
    expect(result!.daily_puzzle_date).toBeInstanceOf(Date);
    expect(result!.solution_data).toBeNull();
  });

  it('should handle daily puzzle with date', async () => {
    const dailyDateString = '2024-12-25';
    const expectedDate = new Date(dailyDateString);
    
    // Create a daily puzzle
    const puzzleResults = await db.insert(puzzlesTable)
      .values({
        title: 'Christmas Puzzle',
        description: 'Holiday special',
        creator_id: null,
        difficulty_level: 'Hard',
        grid_width: 5,
        grid_height: 5,
        board_data: '{"regions": []}',
        dominoes_data: '{"dominoes": []}',
        conditions_data: '{"conditions": []}',
        solution_data: null,
        is_published: true,
        is_daily_puzzle: true,
        daily_puzzle_date: dailyDateString
      })
      .returning()
      .execute();

    const createdPuzzle = puzzleResults[0];
    const result = await getPuzzleById(createdPuzzle.id);

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Christmas Puzzle');
    expect(result!.is_daily_puzzle).toBe(true);
    expect(result!.daily_puzzle_date).toBeInstanceOf(Date);
    expect(result!.daily_puzzle_date!.toISOString()).toBe(expectedDate.toISOString());
  });

  it('should handle puzzle with all nullable fields set to null', async () => {
    // Create a minimal puzzle with nullable fields as null
    const puzzleResults = await db.insert(puzzlesTable)
      .values({
        title: 'Minimal Puzzle',
        description: null,
        creator_id: null,
        difficulty_level: 'Easy',
        grid_width: 3,
        grid_height: 3,
        board_data: '{}',
        dominoes_data: '{}',
        conditions_data: '{}',
        solution_data: null,
        is_published: false,
        is_daily_puzzle: false,
        daily_puzzle_date: null
      })
      .returning()
      .execute();

    const createdPuzzle = puzzleResults[0];
    const result = await getPuzzleById(createdPuzzle.id);

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Minimal Puzzle');
    expect(result!.description).toBeNull();
    expect(result!.creator_id).toBeNull();
    expect(result!.solution_data).toBeNull();
    expect(result!.daily_puzzle_date).toBeNull();
    expect(result!.is_published).toBe(false);
  });
});