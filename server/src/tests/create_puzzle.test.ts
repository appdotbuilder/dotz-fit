import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { puzzlesTable, usersTable } from '../db/schema';
import { type CreatePuzzleInput } from '../schema';
import { createPuzzle } from '../handlers/create_puzzle';
import { eq } from 'drizzle-orm';

// Test user data for creating puzzles with creators
const testUser = {
  email: 'creator@example.com',
  display_name: 'Puzzle Creator',
  auth_provider: 'email' as const,
  auth_provider_id: 'creator123'
};

// Basic puzzle input
const testPuzzleInput: CreatePuzzleInput = {
  title: 'Test Puzzle',
  description: 'A test puzzle for unit testing',
  difficulty_level: 'Medium',
  grid_width: 5,
  grid_height: 5,
  board_data: '{"regions": [{"id": 1, "cells": [[0,0], [0,1]], "color": "red"}]}',
  dominoes_data: '{"dominoes": [{"id": 1, "values": [1, 2]}]}',
  conditions_data: '{"conditions": [{"region_id": 1, "type": "sum", "target": 3}]}',
  solution_data: '{"placement": [{"domino_id": 1, "position": [[0,0], [0,1]]}]}',
  is_published: true,
  is_daily_puzzle: false
};

// System-generated puzzle input (no creator)
const systemPuzzleInput: CreatePuzzleInput = {
  title: 'Daily Puzzle',
  difficulty_level: 'Hard',
  grid_width: 6,
  grid_height: 6,
  board_data: '{"regions": [{"id": 1, "cells": [[0,0]], "color": "blue"}]}',
  dominoes_data: '{"dominoes": [{"id": 1, "values": [3, 4]}]}',
  conditions_data: '{"conditions": [{"region_id": 1, "type": "equality", "target": 7}]}',
  is_published: false,
  is_daily_puzzle: true,
  daily_puzzle_date: new Date('2024-01-15')
};

describe('createPuzzle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a puzzle with all fields', async () => {
    // Create a user first for the creator
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const puzzleInput = { ...testPuzzleInput, creator_id: userId };

    const result = await createPuzzle(puzzleInput);

    // Validate all fields
    expect(result.title).toEqual('Test Puzzle');
    expect(result.description).toEqual('A test puzzle for unit testing');
    expect(result.creator_id).toEqual(userId);
    expect(result.difficulty_level).toEqual('Medium');
    expect(result.grid_width).toEqual(5);
    expect(result.grid_height).toEqual(5);
    expect(result.board_data).toEqual(puzzleInput.board_data);
    expect(result.dominoes_data).toEqual(puzzleInput.dominoes_data);
    expect(result.conditions_data).toEqual(puzzleInput.conditions_data);
    expect(result.solution_data).toEqual(puzzleInput.solution_data || null);
    expect(result.is_published).toBe(true);
    expect(result.is_daily_puzzle).toBe(false);
    expect(result.daily_puzzle_date).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a system-generated puzzle without creator', async () => {
    const result = await createPuzzle(systemPuzzleInput);

    expect(result.title).toEqual('Daily Puzzle');
    expect(result.description).toBeNull();
    expect(result.creator_id).toBeNull();
    expect(result.difficulty_level).toEqual('Hard');
    expect(result.grid_width).toEqual(6);
    expect(result.grid_height).toEqual(6);
    expect(result.is_published).toBe(false); // Default value
    expect(result.is_daily_puzzle).toBe(true);
    expect(result.daily_puzzle_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should save puzzle to database correctly', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    const puzzleInput = { ...testPuzzleInput, creator_id: userId };

    const result = await createPuzzle(puzzleInput);

    // Query database to verify storage
    const puzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, result.id))
      .execute();

    expect(puzzles).toHaveLength(1);
    const savedPuzzle = puzzles[0];
    
    expect(savedPuzzle.title).toEqual('Test Puzzle');
    expect(savedPuzzle.creator_id).toEqual(userId);
    expect(savedPuzzle.difficulty_level).toEqual('Medium');
    expect(savedPuzzle.grid_width).toEqual(5);
    expect(savedPuzzle.grid_height).toEqual(5);
    expect(savedPuzzle.board_data).toEqual(puzzleInput.board_data);
    expect(savedPuzzle.is_published).toBe(true);
    expect(savedPuzzle.created_at).toBeInstanceOf(Date);
  });

  it('should handle minimal input with defaults', async () => {
    const minimalInput: CreatePuzzleInput = {
      title: 'Minimal Puzzle',
      difficulty_level: 'Easy',
      grid_width: 3,
      grid_height: 3,
      board_data: '{"regions": []}',
      dominoes_data: '{"dominoes": []}',
      conditions_data: '{"conditions": []}',
      is_published: false,
      is_daily_puzzle: false
    };

    const result = await createPuzzle(minimalInput);

    expect(result.title).toEqual('Minimal Puzzle');
    expect(result.description).toBeNull();
    expect(result.creator_id).toBeNull();
    expect(result.solution_data).toBeNull();
    expect(result.is_published).toBe(false); // Default
    expect(result.is_daily_puzzle).toBe(false); // Default
    expect(result.daily_puzzle_date).toBeNull();
  });

  it('should create daily puzzle with date', async () => {
    const dailyDate = new Date('2024-02-01');
    const dailyPuzzleInput: CreatePuzzleInput = {
      title: 'February 1st Daily',
      difficulty_level: 'Easy',
      grid_width: 4,
      grid_height: 4,
      board_data: '{"regions": []}',
      dominoes_data: '{"dominoes": []}',
      conditions_data: '{"conditions": []}',
      is_published: false,
      is_daily_puzzle: true,
      daily_puzzle_date: dailyDate
    };

    const result = await createPuzzle(dailyPuzzleInput);

    expect(result.is_daily_puzzle).toBe(true);
    expect(result.daily_puzzle_date).toBeInstanceOf(Date);
    expect(result.daily_puzzle_date?.toDateString()).toEqual(dailyDate.toDateString());
  });

  it('should throw error when creator does not exist', async () => {
    const puzzleInput = { ...testPuzzleInput, creator_id: 99999 };

    await expect(createPuzzle(puzzleInput)).rejects.toThrow();
  });

  it('should handle different difficulty levels', async () => {
    const easyPuzzle: CreatePuzzleInput = {
      ...systemPuzzleInput,
      title: 'Easy Test',
      difficulty_level: 'Easy'
    };

    const hardPuzzle: CreatePuzzleInput = {
      ...systemPuzzleInput,
      title: 'Hard Test',
      difficulty_level: 'Hard'
    };

    const easyResult = await createPuzzle(easyPuzzle);
    const hardResult = await createPuzzle(hardPuzzle);

    expect(easyResult.difficulty_level).toEqual('Easy');
    expect(hardResult.difficulty_level).toEqual('Hard');
    expect(easyResult.id).not.toEqual(hardResult.id);
  });

  it('should handle different grid sizes', async () => {
    const smallGrid: CreatePuzzleInput = {
      ...systemPuzzleInput,
      title: 'Small Grid',
      grid_width: 3,
      grid_height: 3
    };

    const largeGrid: CreatePuzzleInput = {
      ...systemPuzzleInput,
      title: 'Large Grid',
      grid_width: 10,
      grid_height: 10
    };

    const smallResult = await createPuzzle(smallGrid);
    const largeResult = await createPuzzle(largeGrid);

    expect(smallResult.grid_width).toEqual(3);
    expect(smallResult.grid_height).toEqual(3);
    expect(largeResult.grid_width).toEqual(10);
    expect(largeResult.grid_height).toEqual(10);
  });
});