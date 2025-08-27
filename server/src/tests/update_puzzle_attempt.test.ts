import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable, puzzleAttemptsTable } from '../db/schema';
import { type UpdatePuzzleAttemptInput, type CreateUserInput, type CreatePuzzleInput, type CreatePuzzleAttemptInput } from '../schema';
import { updatePuzzleAttempt } from '../handlers/update_puzzle_attempt';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (): Promise<number> => {
  const userInput: CreateUserInput = {
    email: 'test@example.com',
    display_name: 'Test User',
    auth_provider: 'email',
    auth_provider_id: 'test123'
  };

  const result = await db.insert(usersTable)
    .values(userInput)
    .returning()
    .execute();

  return result[0].id;
};

// Helper function to create a test puzzle
const createTestPuzzle = async (creatorId?: number): Promise<number> => {
  const result = await db.insert(puzzlesTable)
    .values({
      title: 'Test Puzzle',
      description: 'A test puzzle',
      creator_id: creatorId || null,
      difficulty_level: 'Easy',
      grid_width: 4,
      grid_height: 4,
      board_data: '{"regions": []}',
      dominoes_data: '{"dominoes": []}',
      conditions_data: '{"conditions": []}',
      solution_data: '{"solution": []}',
      is_published: true,
      is_daily_puzzle: false,
      daily_puzzle_date: null
    })
    .returning()
    .execute();

  return result[0].id;
};

// Helper function to create a test puzzle attempt
const createTestPuzzleAttempt = async (userId: number, puzzleId: number): Promise<number> => {
  const attemptInput: CreatePuzzleAttemptInput = {
    user_id: userId,
    puzzle_id: puzzleId,
    attempt_data: '{"progress": "initial"}'
  };

  const result = await db.insert(puzzleAttemptsTable)
    .values({
      user_id: attemptInput.user_id || null,
      puzzle_id: attemptInput.puzzle_id,
      attempt_data: attemptInput.attempt_data
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('updatePuzzleAttempt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update attempt data only', async () => {
    const userId = await createTestUser();
    const puzzleId = await createTestPuzzle(userId);
    const attemptId = await createTestPuzzleAttempt(userId, puzzleId);

    const updateInput: UpdatePuzzleAttemptInput = {
      id: attemptId,
      attempt_data: '{"progress": "halfway"}'
    };

    const result = await updatePuzzleAttempt(updateInput);

    expect(result.id).toBe(attemptId);
    expect(result.attempt_data).toBe('{"progress": "halfway"}');
    expect(result.is_completed).toBe(false); // Should remain unchanged
    expect(result.completion_time).toBe(null); // Should remain unchanged
    expect(result.completed_at).toBe(null); // Should remain unchanged
  });

  it('should mark attempt as completed with completion time', async () => {
    const userId = await createTestUser();
    const puzzleId = await createTestPuzzle(userId);
    const attemptId = await createTestPuzzleAttempt(userId, puzzleId);

    const completedAt = new Date();
    const updateInput: UpdatePuzzleAttemptInput = {
      id: attemptId,
      attempt_data: '{"progress": "complete"}',
      is_completed: true,
      completion_time: 300, // 5 minutes in seconds
      completed_at: completedAt
    };

    const result = await updatePuzzleAttempt(updateInput);

    expect(result.id).toBe(attemptId);
    expect(result.attempt_data).toBe('{"progress": "complete"}');
    expect(result.is_completed).toBe(true);
    expect(result.completion_time).toBe(300);
    expect(result.completed_at).toEqual(completedAt);
  });

  it('should update partial fields only', async () => {
    const userId = await createTestUser();
    const puzzleId = await createTestPuzzle(userId);
    const attemptId = await createTestPuzzleAttempt(userId, puzzleId);

    // First, get the original attempt to verify unchanged fields
    const originalAttempt = await db.select()
      .from(puzzleAttemptsTable)
      .where(eq(puzzleAttemptsTable.id, attemptId))
      .execute();

    const updateInput: UpdatePuzzleAttemptInput = {
      id: attemptId,
      is_completed: true // Only update completion status
    };

    const result = await updatePuzzleAttempt(updateInput);

    expect(result.id).toBe(attemptId);
    expect(result.is_completed).toBe(true);
    // These fields should remain unchanged
    expect(result.attempt_data).toBe(originalAttempt[0].attempt_data);
    expect(result.completion_time).toBe(originalAttempt[0].completion_time);
    expect(result.completed_at).toBe(originalAttempt[0].completed_at);
  });

  it('should persist changes to database', async () => {
    const userId = await createTestUser();
    const puzzleId = await createTestPuzzle(userId);
    const attemptId = await createTestPuzzleAttempt(userId, puzzleId);

    const updateInput: UpdatePuzzleAttemptInput = {
      id: attemptId,
      attempt_data: '{"progress": "final"}',
      is_completed: true,
      completion_time: 450
    };

    await updatePuzzleAttempt(updateInput);

    // Verify changes were saved to database
    const savedAttempt = await db.select()
      .from(puzzleAttemptsTable)
      .where(eq(puzzleAttemptsTable.id, attemptId))
      .execute();

    expect(savedAttempt).toHaveLength(1);
    expect(savedAttempt[0].attempt_data).toBe('{"progress": "final"}');
    expect(savedAttempt[0].is_completed).toBe(true);
    expect(savedAttempt[0].completion_time).toBe(450);
  });

  it('should handle guest attempt updates (null user_id)', async () => {
    const userId = await createTestUser();
    const puzzleId = await createTestPuzzle(userId);

    // Create a guest attempt (null user_id)
    const guestAttempt = await db.insert(puzzleAttemptsTable)
      .values({
        user_id: null,
        puzzle_id: puzzleId,
        attempt_data: '{"progress": "guest_initial"}'
      })
      .returning()
      .execute();

    const updateInput: UpdatePuzzleAttemptInput = {
      id: guestAttempt[0].id,
      attempt_data: '{"progress": "guest_updated"}'
    };

    const result = await updatePuzzleAttempt(updateInput);

    expect(result.id).toBe(guestAttempt[0].id);
    expect(result.user_id).toBe(null);
    expect(result.attempt_data).toBe('{"progress": "guest_updated"}');
  });

  it('should throw error for non-existent attempt', async () => {
    const updateInput: UpdatePuzzleAttemptInput = {
      id: 99999, // Non-existent ID
      attempt_data: '{"progress": "updated"}'
    };

    await expect(updatePuzzleAttempt(updateInput))
      .rejects
      .toThrow(/Puzzle attempt with id 99999 not found/i);
  });

  it('should handle null values correctly', async () => {
    const userId = await createTestUser();
    const puzzleId = await createTestPuzzle(userId);
    const attemptId = await createTestPuzzleAttempt(userId, puzzleId);

    // First complete the attempt
    await updatePuzzleAttempt({
      id: attemptId,
      is_completed: true,
      completion_time: 300,
      completed_at: new Date()
    });

    // Then reset completion fields to null
    const updateInput: UpdatePuzzleAttemptInput = {
      id: attemptId,
      is_completed: false,
      completion_time: null,
      completed_at: null
    };

    const result = await updatePuzzleAttempt(updateInput);

    expect(result.is_completed).toBe(false);
    expect(result.completion_time).toBe(null);
    expect(result.completed_at).toBe(null);
  });
});