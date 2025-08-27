import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { puzzleAttemptsTable, usersTable, puzzlesTable } from '../db/schema';
import { type CreatePuzzleAttemptInput } from '../schema';
import { createPuzzleAttempt } from '../handlers/create_puzzle_attempt';
import { eq } from 'drizzle-orm';

describe('createPuzzleAttempt', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a puzzle attempt for registered user', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create a test puzzle
    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Test Puzzle',
        description: 'A puzzle for testing',
        creator_id: userId,
        difficulty_level: 'Easy',
        grid_width: 4,
        grid_height: 4,
        board_data: '{"regions":[{"id":1,"cells":[[0,0],[0,1]]}]}',
        dominoes_data: '{"dominoes":[{"id":1,"value1":1,"value2":2}]}',
        conditions_data: '{"conditions":[{"region_id":1,"type":"sum","target":3}]}',
        solution_data: '{"solution":[[1,2],[0,0]]}',
        is_published: true,
        is_daily_puzzle: false
      })
      .returning()
      .execute();
    const puzzleId = puzzleResult[0].id;

    const testInput: CreatePuzzleAttemptInput = {
      user_id: userId,
      puzzle_id: puzzleId,
      attempt_data: '{"currentState":{"dominoesPlaced":[],"progress":"started"}}'
    };

    const result = await createPuzzleAttempt(testInput);

    // Verify basic fields
    expect(result.user_id).toEqual(userId);
    expect(result.puzzle_id).toEqual(puzzleId);
    expect(result.attempt_data).toEqual('{"currentState":{"dominoesPlaced":[],"progress":"started"}}');
    expect(result.is_completed).toEqual(false);
    expect(result.completion_time).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
  });

  it('should create a puzzle attempt for guest user', async () => {
    // Create a test user for puzzle creation
    const userResult = await db.insert(usersTable)
      .values({
        email: 'creator@example.com',
        display_name: 'Creator',
        auth_provider: 'email',
        auth_provider_id: 'creator123'
      })
      .returning()
      .execute();
    const creatorId = userResult[0].id;

    // Create a test puzzle
    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Guest Puzzle',
        description: 'A puzzle for guest play',
        creator_id: creatorId,
        difficulty_level: 'Medium',
        grid_width: 5,
        grid_height: 5,
        board_data: '{"regions":[{"id":1,"cells":[[0,0],[0,1],[1,0]]}]}',
        dominoes_data: '{"dominoes":[{"id":1,"value1":3,"value2":4}]}',
        conditions_data: '{"conditions":[{"region_id":1,"type":"sum","target":7}]}',
        is_published: true,
        is_daily_puzzle: false
      })
      .returning()
      .execute();
    const puzzleId = puzzleResult[0].id;

    const testInput: CreatePuzzleAttemptInput = {
      user_id: null,
      puzzle_id: puzzleId,
      attempt_data: '{"currentState":{"dominoesPlaced":[],"progress":"guest_started"}}'
    };

    const result = await createPuzzleAttempt(testInput);

    // Verify guest attempt fields
    expect(result.user_id).toBeNull();
    expect(result.puzzle_id).toEqual(puzzleId);
    expect(result.attempt_data).toEqual('{"currentState":{"dominoesPlaced":[],"progress":"guest_started"}}');
    expect(result.is_completed).toEqual(false);
    expect(result.completion_time).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.started_at).toBeInstanceOf(Date);
  });

  it('should save puzzle attempt to database', async () => {
    // Create prerequisites
    const userResult = await db.insert(usersTable)
      .values({
        email: 'dbtest@example.com',
        display_name: 'DB Test User',
        auth_provider: 'google',
        auth_provider_id: 'google123'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'DB Test Puzzle',
        difficulty_level: 'Hard',
        grid_width: 6,
        grid_height: 6,
        board_data: '{"regions":[{"id":1,"cells":[[0,0]]}]}',
        dominoes_data: '{"dominoes":[{"id":1,"value1":5,"value2":6}]}',
        conditions_data: '{"conditions":[{"region_id":1,"type":"product","target":30}]}',
        is_published: true
      })
      .returning()
      .execute();
    const puzzleId = puzzleResult[0].id;

    const testInput: CreatePuzzleAttemptInput = {
      user_id: userId,
      puzzle_id: puzzleId,
      attempt_data: '{"state":"database_test","moves":["move1","move2"]}'
    };

    const result = await createPuzzleAttempt(testInput);

    // Query database to verify persistence
    const attempts = await db.select()
      .from(puzzleAttemptsTable)
      .where(eq(puzzleAttemptsTable.id, result.id))
      .execute();

    expect(attempts).toHaveLength(1);
    const savedAttempt = attempts[0];
    expect(savedAttempt.user_id).toEqual(userId);
    expect(savedAttempt.puzzle_id).toEqual(puzzleId);
    expect(savedAttempt.attempt_data).toEqual('{"state":"database_test","moves":["move1","move2"]}');
    expect(savedAttempt.is_completed).toEqual(false);
    expect(savedAttempt.completion_time).toBeNull();
    expect(savedAttempt.completed_at).toBeNull();
    expect(savedAttempt.started_at).toBeInstanceOf(Date);
  });

  it('should handle undefined user_id as null', async () => {
    // Create a puzzle for testing
    const userResult = await db.insert(usersTable)
      .values({
        email: 'creator@example.com',
        display_name: 'Creator',
        auth_provider: 'facebook',
        auth_provider_id: 'fb123'
      })
      .returning()
      .execute();

    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Undefined User Test',
        creator_id: userResult[0].id,
        difficulty_level: 'Easy',
        grid_width: 3,
        grid_height: 3,
        board_data: '{"regions":[]}',
        dominoes_data: '{"dominoes":[]}',
        conditions_data: '{"conditions":[]}',
        is_published: true
      })
      .returning()
      .execute();

    const testInput: CreatePuzzleAttemptInput = {
      // user_id is undefined/not provided
      puzzle_id: puzzleResult[0].id,
      attempt_data: '{"state":"undefined_user_test"}'
    };

    const result = await createPuzzleAttempt(testInput);

    expect(result.user_id).toBeNull();
    expect(result.puzzle_id).toEqual(puzzleResult[0].id);
    expect(result.attempt_data).toEqual('{"state":"undefined_user_test"}');
  });

  it('should create attempt even with non-existent puzzle id', async () => {
    // Note: Since the schema doesn't enforce foreign key constraints,
    // this will succeed but represents orphaned data
    const testInput: CreatePuzzleAttemptInput = {
      user_id: 999, // Non-existent user
      puzzle_id: 999, // Non-existent puzzle
      attempt_data: '{"state":"orphaned_test"}'
    };

    const result = await createPuzzleAttempt(testInput);
    
    expect(result.user_id).toEqual(999);
    expect(result.puzzle_id).toEqual(999);
    expect(result.attempt_data).toEqual('{"state":"orphaned_test"}');
    expect(result.is_completed).toEqual(false);
    expect(result.completion_time).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should create multiple attempts for same puzzle and user', async () => {
    // Set up prerequisites
    const userResult = await db.insert(usersTable)
      .values({
        email: 'multi@example.com',
        display_name: 'Multi User',
        auth_provider: 'email',
        auth_provider_id: 'multi123'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Multi Attempt Puzzle',
        creator_id: userId,
        difficulty_level: 'Medium',
        grid_width: 4,
        grid_height: 4,
        board_data: '{"regions":[]}',
        dominoes_data: '{"dominoes":[]}',
        conditions_data: '{"conditions":[]}',
        is_published: true
      })
      .returning()
      .execute();
    const puzzleId = puzzleResult[0].id;

    // Create first attempt
    const attempt1Input: CreatePuzzleAttemptInput = {
      user_id: userId,
      puzzle_id: puzzleId,
      attempt_data: '{"attempt":1,"state":"first"}'
    };

    // Create second attempt
    const attempt2Input: CreatePuzzleAttemptInput = {
      user_id: userId,
      puzzle_id: puzzleId,
      attempt_data: '{"attempt":2,"state":"second"}'
    };

    const result1 = await createPuzzleAttempt(attempt1Input);
    const result2 = await createPuzzleAttempt(attempt2Input);

    // Verify both attempts were created with different IDs
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.attempt_data).toEqual('{"attempt":1,"state":"first"}');
    expect(result2.attempt_data).toEqual('{"attempt":2,"state":"second"}');
    expect(result1.user_id).toEqual(userId);
    expect(result2.user_id).toEqual(userId);
    expect(result1.puzzle_id).toEqual(puzzleId);
    expect(result2.puzzle_id).toEqual(puzzleId);
  });
});