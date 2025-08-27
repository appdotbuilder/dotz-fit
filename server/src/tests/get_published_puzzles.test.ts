import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { puzzlesTable, usersTable } from '../db/schema';
import { type CreatePuzzleInput } from '../schema';
import { getPublishedPuzzles } from '../handlers/get_published_puzzles';

// Test user data
const testUser = {
  email: 'creator@example.com',
  display_name: 'Puzzle Creator',
  auth_provider: 'email' as const,
  auth_provider_id: 'creator123'
};

// Base puzzle input
const basePuzzleInput: CreatePuzzleInput = {
  title: 'Test Puzzle',
  description: 'A test puzzle',
  difficulty_level: 'Medium',
  grid_width: 5,
  grid_height: 5,
  board_data: '{"regions": [{"id": 1, "cells": [[0,0], [0,1]]}]}',
  dominoes_data: '{"dominoes": [{"value1": 1, "value2": 2}]}',
  conditions_data: '{"conditions": [{"region": 1, "type": "sum", "value": 5}]}',
  is_published: false,
  is_daily_puzzle: false
};

describe('getPublishedPuzzles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only published puzzles', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create published and unpublished puzzles
    await db.insert(puzzlesTable).values([
      {
        title: 'Published Puzzle 1',
        description: basePuzzleInput.description,
        creator_id: user.id,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: true,
        is_daily_puzzle: false
      },
      {
        title: 'Published Puzzle 2',
        description: basePuzzleInput.description,
        creator_id: user.id,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: true,
        is_daily_puzzle: false
      },
      {
        title: 'Unpublished Puzzle',
        description: basePuzzleInput.description,
        creator_id: user.id,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: false,
        is_daily_puzzle: false
      }
    ]).execute();

    const result = await getPublishedPuzzles();

    expect(result).toHaveLength(2);
    expect(result.every(puzzle => puzzle.is_published)).toBe(true);
    expect(result.map(p => p.title)).toContain('Published Puzzle 1');
    expect(result.map(p => p.title)).toContain('Published Puzzle 2');
    expect(result.map(p => p.title)).not.toContain('Unpublished Puzzle');
  });

  it('should return empty array when no published puzzles exist', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create only unpublished puzzles
    await db.insert(puzzlesTable).values([
      {
        title: 'Unpublished Puzzle 1',
        description: basePuzzleInput.description,
        creator_id: user.id,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: false,
        is_daily_puzzle: false
      },
      {
        title: 'Unpublished Puzzle 2',
        description: basePuzzleInput.description,
        creator_id: user.id,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: false,
        is_daily_puzzle: false
      }
    ]).execute();

    const result = await getPublishedPuzzles();

    expect(result).toHaveLength(0);
  });

  it('should respect limit parameter', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create multiple published puzzles
    const puzzlesToCreate = Array.from({ length: 5 }, (_, i) => ({
      title: `Published Puzzle ${i + 1}`,
      description: basePuzzleInput.description,
      creator_id: user.id,
      difficulty_level: basePuzzleInput.difficulty_level,
      grid_width: basePuzzleInput.grid_width,
      grid_height: basePuzzleInput.grid_height,
      board_data: basePuzzleInput.board_data,
      dominoes_data: basePuzzleInput.dominoes_data,
      conditions_data: basePuzzleInput.conditions_data,
      is_published: true,
      is_daily_puzzle: false
    }));

    await db.insert(puzzlesTable)
      .values(puzzlesToCreate)
      .execute();

    const result = await getPublishedPuzzles(3);

    expect(result).toHaveLength(3);
    expect(result.every(puzzle => puzzle.is_published)).toBe(true);
  });

  it('should respect offset parameter for pagination', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create multiple published puzzles with distinct titles
    const puzzlesToCreate = Array.from({ length: 5 }, (_, i) => ({
      title: `Published Puzzle ${String(i + 1).padStart(2, '0')}`, // Ensure consistent ordering
      description: basePuzzleInput.description,
      creator_id: user.id,
      difficulty_level: basePuzzleInput.difficulty_level,
      grid_width: basePuzzleInput.grid_width,
      grid_height: basePuzzleInput.grid_height,
      board_data: basePuzzleInput.board_data,
      dominoes_data: basePuzzleInput.dominoes_data,
      conditions_data: basePuzzleInput.conditions_data,
      is_published: true,
      is_daily_puzzle: false
    }));

    await db.insert(puzzlesTable)
      .values(puzzlesToCreate)
      .execute();

    // Get first page
    const firstPage = await getPublishedPuzzles(2, 0);
    // Get second page  
    const secondPage = await getPublishedPuzzles(2, 2);

    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(2);

    // Ensure no overlap between pages
    const firstPageIds = firstPage.map(p => p.id);
    const secondPageIds = secondPage.map(p => p.id);
    const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
    expect(hasOverlap).toBe(false);
  });

  it('should order puzzles by creation date (newest first)', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create puzzles with slight time delays to ensure different timestamps
    const firstPuzzle = await db.insert(puzzlesTable).values({
      title: 'First Puzzle',
      description: basePuzzleInput.description,
      creator_id: user.id,
      difficulty_level: basePuzzleInput.difficulty_level,
      grid_width: basePuzzleInput.grid_width,
      grid_height: basePuzzleInput.grid_height,
      board_data: basePuzzleInput.board_data,
      dominoes_data: basePuzzleInput.dominoes_data,
      conditions_data: basePuzzleInput.conditions_data,
      is_published: true,
      is_daily_puzzle: false
    }).returning().execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const secondPuzzle = await db.insert(puzzlesTable).values({
      title: 'Second Puzzle',
      description: basePuzzleInput.description,
      creator_id: user.id,
      difficulty_level: basePuzzleInput.difficulty_level,
      grid_width: basePuzzleInput.grid_width,
      grid_height: basePuzzleInput.grid_height,
      board_data: basePuzzleInput.board_data,
      dominoes_data: basePuzzleInput.dominoes_data,
      conditions_data: basePuzzleInput.conditions_data,
      is_published: true,
      is_daily_puzzle: false
    }).returning().execute();

    const result = await getPublishedPuzzles();

    expect(result).toHaveLength(2);
    // Newest first - second puzzle should come before first puzzle
    expect(result[0].title).toBe('Second Puzzle');
    expect(result[1].title).toBe('First Puzzle');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should include system-generated puzzles (null creator_id)', async () => {
    // Create system-generated published puzzle
    await db.insert(puzzlesTable).values({
      title: 'System Puzzle',
      description: basePuzzleInput.description,
      creator_id: null, // System-generated
      difficulty_level: basePuzzleInput.difficulty_level,
      grid_width: basePuzzleInput.grid_width,
      grid_height: basePuzzleInput.grid_height,
      board_data: basePuzzleInput.board_data,
      dominoes_data: basePuzzleInput.dominoes_data,
      conditions_data: basePuzzleInput.conditions_data,
      is_published: true,
      is_daily_puzzle: false
    }).execute();

    const result = await getPublishedPuzzles();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('System Puzzle');
    expect(result[0].creator_id).toBeNull();
    expect(result[0].is_published).toBe(true);
  });

  it('should handle mixed creator types (user and system puzzles)', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create both user and system puzzles
    await db.insert(puzzlesTable).values([
      {
        title: 'User Puzzle',
        description: basePuzzleInput.description,
        creator_id: user.id,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: true,
        is_daily_puzzle: false
      },
      {
        title: 'System Puzzle',
        description: basePuzzleInput.description,
        creator_id: null,
        difficulty_level: basePuzzleInput.difficulty_level,
        grid_width: basePuzzleInput.grid_width,
        grid_height: basePuzzleInput.grid_height,
        board_data: basePuzzleInput.board_data,
        dominoes_data: basePuzzleInput.dominoes_data,
        conditions_data: basePuzzleInput.conditions_data,
        is_published: true,
        is_daily_puzzle: false
      }
    ]).execute();

    const result = await getPublishedPuzzles();

    expect(result).toHaveLength(2);
    expect(result.every(puzzle => puzzle.is_published)).toBe(true);
    
    const userPuzzle = result.find(p => p.title === 'User Puzzle');
    const systemPuzzle = result.find(p => p.title === 'System Puzzle');
    
    expect(userPuzzle?.creator_id).toBe(user.id);
    expect(systemPuzzle?.creator_id).toBeNull();
  });

  it('should use default pagination values correctly', async () => {
    // Create a user first
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create more than default limit (20) puzzles
    const puzzlesToCreate = Array.from({ length: 25 }, (_, i) => ({
      title: `Published Puzzle ${i + 1}`,
      description: basePuzzleInput.description,
      creator_id: user.id,
      difficulty_level: basePuzzleInput.difficulty_level,
      grid_width: basePuzzleInput.grid_width,
      grid_height: basePuzzleInput.grid_height,
      board_data: basePuzzleInput.board_data,
      dominoes_data: basePuzzleInput.dominoes_data,
      conditions_data: basePuzzleInput.conditions_data,
      is_published: true,
      is_daily_puzzle: false
    }));

    await db.insert(puzzlesTable)
      .values(puzzlesToCreate)
      .execute();

    // Call without parameters (should use defaults: limit=20, offset=0)
    const result = await getPublishedPuzzles();

    expect(result).toHaveLength(20); // Default limit
    expect(result.every(puzzle => puzzle.is_published)).toBe(true);
  });
});