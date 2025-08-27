import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable, puzzleAttemptsTable } from '../db/schema';
import { getUserPuzzleAttempts } from '../handlers/get_user_puzzle_attempts';
import { eq } from 'drizzle-orm';

describe('getUserPuzzleAttempts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all attempts for a user', async () => {
    // Create test user directly
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create test puzzle directly
    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Test Puzzle',
        description: 'A test puzzle',
        difficulty_level: 'Easy',
        grid_width: 4,
        grid_height: 4,
        board_data: '{"regions": [{"id": 1, "cells": [0,1,4,5]}]}',
        dominoes_data: '{"dominoes": [{"dots": [1,2]}]}',
        conditions_data: '{"conditions": [{"type": "sum", "value": 10}]}',
        solution_data: '{"solution": "test"}'
      })
      .returning()
      .execute();
    const puzzle = puzzleResult[0];

    // Create multiple attempts for the user
    await db.insert(puzzleAttemptsTable)
      .values([
        {
          user_id: user.id,
          puzzle_id: puzzle.id,
          attempt_data: '{"current_state": "test1"}'
        },
        {
          user_id: user.id,
          puzzle_id: puzzle.id,
          attempt_data: '{"current_state": "test2"}'
        }
      ])
      .execute();

    // Get all attempts for the user
    const results = await getUserPuzzleAttempts(user.id);

    expect(results).toHaveLength(2);
    expect(results[0].user_id).toEqual(user.id);
    expect(results[1].user_id).toEqual(user.id);
    expect(results[0].puzzle_id).toEqual(puzzle.id);
    expect(results[1].puzzle_id).toEqual(puzzle.id);
    
    // Verify ordering (most recent first)
    expect(results[0].started_at >= results[1].started_at).toBe(true);
  });

  it('should return attempts for a specific puzzle', async () => {
    // Create test user directly
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create two test puzzles directly
    const puzzleResults = await db.insert(puzzlesTable)
      .values([
        {
          title: 'Test Puzzle 1',
          difficulty_level: 'Easy',
          grid_width: 4,
          grid_height: 4,
          board_data: '{"regions": [{"id": 1, "cells": [0,1,4,5]}]}',
          dominoes_data: '{"dominoes": [{"dots": [1,2]}]}',
          conditions_data: '{"conditions": [{"type": "sum", "value": 10}]}'
        },
        {
          title: 'Test Puzzle 2',
          difficulty_level: 'Medium',
          grid_width: 5,
          grid_height: 5,
          board_data: '{"regions": [{"id": 2, "cells": [0,1,2,3,4]}]}',
          dominoes_data: '{"dominoes": [{"dots": [3,4]}]}',
          conditions_data: '{"conditions": [{"type": "sum", "value": 15}]}'
        }
      ])
      .returning()
      .execute();
    const puzzle1 = puzzleResults[0];
    const puzzle2 = puzzleResults[1];

    // Create attempts for both puzzles
    await db.insert(puzzleAttemptsTable)
      .values([
        {
          user_id: user.id,
          puzzle_id: puzzle1.id,
          attempt_data: '{"current_state": "puzzle1_attempt"}'
        },
        {
          user_id: user.id,
          puzzle_id: puzzle2.id,
          attempt_data: '{"current_state": "puzzle2_attempt"}'
        }
      ])
      .execute();

    // Get attempts for specific puzzle
    const results = await getUserPuzzleAttempts(user.id, puzzle1.id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user.id);
    expect(results[0].puzzle_id).toEqual(puzzle1.id);
    expect(results[0].attempt_data).toEqual('{"current_state": "puzzle1_attempt"}');
    expect(results[0].is_completed).toEqual(false);
    expect(results[0].completion_time).toBeNull();
    expect(results[0].started_at).toBeInstanceOf(Date);
    expect(results[0].completed_at).toBeNull();
  });

  it('should return empty array when user has no attempts', async () => {
    // Create user directly
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const results = await getUserPuzzleAttempts(user.id);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return empty array when user has no attempts for specific puzzle', async () => {
    // Create user and puzzle directly
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const puzzleResults = await db.insert(puzzlesTable)
      .values([
        {
          title: 'Target Puzzle',
          difficulty_level: 'Easy',
          grid_width: 4,
          grid_height: 4,
          board_data: '{"regions": [{"id": 1, "cells": [0,1,4,5]}]}',
          dominoes_data: '{"dominoes": [{"dots": [1,2]}]}',
          conditions_data: '{"conditions": [{"type": "sum", "value": 10}]}'
        },
        {
          title: 'Other Puzzle',
          difficulty_level: 'Medium',
          grid_width: 5,
          grid_height: 5,
          board_data: '{"regions": [{"id": 2, "cells": [0,1,2,3,4]}]}',
          dominoes_data: '{"dominoes": [{"dots": [3,4]}]}',
          conditions_data: '{"conditions": [{"type": "sum", "value": 15}]}'
        }
      ])
      .returning()
      .execute();
    const targetPuzzle = puzzleResults[0];
    const otherPuzzle = puzzleResults[1];

    // Create attempt for the other puzzle only
    await db.insert(puzzleAttemptsTable)
      .values({
        user_id: user.id,
        puzzle_id: otherPuzzle.id,
        attempt_data: '{"current_state": "other_puzzle"}'
      })
      .execute();

    // Get attempts for the target puzzle (should be empty)
    const results = await getUserPuzzleAttempts(user.id, targetPuzzle.id);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should only return attempts for the specified user', async () => {
    // Create two users directly
    const userResults = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          display_name: 'User One',
          auth_provider: 'email',
          auth_provider_id: 'test123'
        },
        {
          email: 'user2@example.com',
          display_name: 'User Two',
          auth_provider: 'email',
          auth_provider_id: 'test456'
        }
      ])
      .returning()
      .execute();
    const user1 = userResults[0];
    const user2 = userResults[1];
    
    // Create puzzle directly
    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Shared Puzzle',
        difficulty_level: 'Easy',
        grid_width: 4,
        grid_height: 4,
        board_data: '{"regions": [{"id": 1, "cells": [0,1,4,5]}]}',
        dominoes_data: '{"dominoes": [{"dots": [1,2]}]}',
        conditions_data: '{"conditions": [{"type": "sum", "value": 10}]}'
      })
      .returning()
      .execute();
    const puzzle = puzzleResult[0];

    // Create attempts for both users
    await db.insert(puzzleAttemptsTable)
      .values([
        {
          user_id: user1.id,
          puzzle_id: puzzle.id,
          attempt_data: '{"current_state": "user1_attempt"}'
        },
        {
          user_id: user2.id,
          puzzle_id: puzzle.id,
          attempt_data: '{"current_state": "user2_attempt"}'
        }
      ])
      .execute();

    // Get attempts for user1 only
    const results = await getUserPuzzleAttempts(user1.id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user1.id);
    expect(results[0].attempt_data).toEqual('{"current_state": "user1_attempt"}');
  });

  it('should handle completed attempts with completion data', async () => {
    // Create user and puzzle directly
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Completable Puzzle',
        difficulty_level: 'Easy',
        grid_width: 4,
        grid_height: 4,
        board_data: '{"regions": [{"id": 1, "cells": [0,1,4,5]}]}',
        dominoes_data: '{"dominoes": [{"dots": [1,2]}]}',
        conditions_data: '{"conditions": [{"type": "sum", "value": 10}]}'
      })
      .returning()
      .execute();
    const puzzle = puzzleResult[0];

    // Create a completed attempt directly
    const completedAt = new Date();
    await db.insert(puzzleAttemptsTable)
      .values({
        user_id: user.id,
        puzzle_id: puzzle.id,
        attempt_data: '{"current_state": "completed"}',
        is_completed: true,
        completion_time: 300, // 5 minutes in seconds
        completed_at: completedAt
      })
      .execute();

    const results = await getUserPuzzleAttempts(user.id);

    expect(results).toHaveLength(1);
    expect(results[0].is_completed).toBe(true);
    expect(results[0].completion_time).toEqual(300);
    expect(results[0].completed_at).toBeInstanceOf(Date);
    expect(typeof results[0].completion_time).toBe('number');
  });

  it('should handle guest attempts (null user_id) correctly', async () => {
    // Create puzzle directly
    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Guest Puzzle',
        difficulty_level: 'Easy',
        grid_width: 4,
        grid_height: 4,
        board_data: '{"regions": [{"id": 1, "cells": [0,1,4,5]}]}',
        dominoes_data: '{"dominoes": [{"dots": [1,2]}]}',
        conditions_data: '{"conditions": [{"type": "sum", "value": 10}]}'
      })
      .returning()
      .execute();
    const puzzle = puzzleResult[0];

    // Create user and both guest and user attempts
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    await db.insert(puzzleAttemptsTable)
      .values([
        {
          user_id: null, // Guest attempt
          puzzle_id: puzzle.id,
          attempt_data: '{"current_state": "guest_attempt"}'
        },
        {
          user_id: user.id,
          puzzle_id: puzzle.id,
          attempt_data: '{"current_state": "user_attempt"}'
        }
      ])
      .execute();

    // Get attempts for the logged-in user - should not include guest attempts
    const results = await getUserPuzzleAttempts(user.id);

    expect(results).toHaveLength(1);
    expect(results[0].user_id).toEqual(user.id);
    expect(results[0].attempt_data).toEqual('{"current_state": "user_attempt"}');
  });
});