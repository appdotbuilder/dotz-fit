import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { puzzlesTable, usersTable } from '../db/schema';
import { type CreatePuzzleInput } from '../schema';
import { getDailyPuzzle } from '../handlers/get_daily_puzzle';

// Test data
const testUser = {
  email: 'creator@example.com',
  display_name: 'Test Creator',
  auth_provider: 'email' as const,
  auth_provider_id: 'auth123'
};

const basePuzzleInput: CreatePuzzleInput = {
  title: 'Daily Test Puzzle',
  description: 'A puzzle for daily testing',
  difficulty_level: 'Medium',
  grid_width: 5,
  grid_height: 5,
  board_data: '{"regions": [{"id": 1, "cells": [[0,0], [0,1]]}]}',
  dominoes_data: '{"dominoes": [{"top": 1, "bottom": 2}]}',
  conditions_data: '{"conditions": [{"region_id": 1, "type": "sum", "value": 3}]}',
  solution_data: '{"solution": []}',
  is_published: true,
  is_daily_puzzle: true
};

describe('getDailyPuzzle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when no daily puzzle exists for date', async () => {
    const testDate = new Date('2024-01-15');
    const result = await getDailyPuzzle(testDate);
    
    expect(result).toBeNull();
  });

  it('should return daily puzzle for specified date', async () => {
    // Create a user first (for creator_id)
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create daily puzzle for specific date
    const testDate = new Date('2024-01-15');
    await db.insert(puzzlesTable)
      .values({
        ...basePuzzleInput,
        creator_id: userId,
        daily_puzzle_date: '2024-01-15'
      })
      .execute();

    const result = await getDailyPuzzle(testDate);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Daily Test Puzzle');
    expect(result!.is_daily_puzzle).toBe(true);
    expect(result!.is_published).toBe(true);
    expect(result!.daily_puzzle_date).toEqual(testDate);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should default to today when no date provided', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create daily puzzle for today
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    await db.insert(puzzlesTable)
      .values({
        ...basePuzzleInput,
        creator_id: userId,
        daily_puzzle_date: todayString
      })
      .execute();

    const result = await getDailyPuzzle(); // No date parameter

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Daily Test Puzzle');
    expect(result!.is_daily_puzzle).toBe(true);
    expect(result!.daily_puzzle_date).toEqual(new Date(todayString));
  });

  it('should not return unpublished daily puzzles', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create unpublished daily puzzle
    const testDate = new Date('2024-01-15');
    await db.insert(puzzlesTable)
      .values({
        ...basePuzzleInput,
        creator_id: userId,
        is_published: false, // Not published
        daily_puzzle_date: '2024-01-15'
      })
      .execute();

    const result = await getDailyPuzzle(testDate);

    expect(result).toBeNull();
  });

  it('should not return non-daily puzzles', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create regular (non-daily) puzzle
    const testDate = new Date('2024-01-15');
    await db.insert(puzzlesTable)
      .values({
        ...basePuzzleInput,
        creator_id: userId,
        is_daily_puzzle: false, // Not a daily puzzle
        daily_puzzle_date: '2024-01-15'
      })
      .execute();

    const result = await getDailyPuzzle(testDate);

    expect(result).toBeNull();
  });

  it('should return only one puzzle when multiple exist for same date', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;
    
    // Create two daily puzzles for the same date
    const testDate = new Date('2024-01-15');
    await db.insert(puzzlesTable)
      .values([
        {
          ...basePuzzleInput,
          title: 'First Daily Puzzle',
          creator_id: userId,
          daily_puzzle_date: '2024-01-15'
        },
        {
          ...basePuzzleInput,
          title: 'Second Daily Puzzle',
          creator_id: userId,
          daily_puzzle_date: '2024-01-15'
        }
      ])
      .execute();

    const result = await getDailyPuzzle(testDate);

    expect(result).not.toBeNull();
    expect(result!.is_daily_puzzle).toBe(true);
    expect(result!.is_published).toBe(true);
    // Should return one of the puzzles (first one due to limit(1))
    expect(['First Daily Puzzle', 'Second Daily Puzzle']).toContain(result!.title);
  });

  it('should handle system-generated puzzles without creator', async () => {
    // Create daily puzzle without creator (system-generated)
    const testDate = new Date('2024-01-15');
    await db.insert(puzzlesTable)
      .values({
        ...basePuzzleInput,
        creator_id: null, // System-generated puzzle
        daily_puzzle_date: '2024-01-15'
      })
      .execute();

    const result = await getDailyPuzzle(testDate);

    expect(result).not.toBeNull();
    expect(result!.creator_id).toBeNull();
    expect(result!.is_daily_puzzle).toBe(true);
    expect(result!.daily_puzzle_date).toEqual(testDate);
  });
});