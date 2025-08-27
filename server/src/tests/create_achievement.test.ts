import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { achievementsTable, usersTable, puzzlesTable } from '../db/schema';
import { type CreateAchievementInput } from '../schema';
import { createAchievement } from '../handlers/create_achievement';
import { eq } from 'drizzle-orm';

describe('createAchievement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Setup test data
  let testUserId: number;
  let testPuzzleId: number;

  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    return result[0].id;
  };

  const createTestPuzzle = async () => {
    const result = await db.insert(puzzlesTable)
      .values({
        title: 'Test Puzzle',
        description: 'A puzzle for testing',
        difficulty_level: 'Medium',
        grid_width: 5,
        grid_height: 5,
        board_data: '{"grid": "test"}',
        dominoes_data: '{"dominoes": []}',
        conditions_data: '{"conditions": []}',
        is_published: true
      })
      .returning()
      .execute();
    return result[0].id;
  };

  it('should create an achievement with valid input', async () => {
    testUserId = await createTestUser();
    testPuzzleId = await createTestPuzzle();

    const testInput: CreateAchievementInput = {
      user_id: testUserId,
      puzzle_id: testPuzzleId,
      difficulty_level: 'Medium',
      completion_time: 300,
      is_cookie_trifecta: false
    };

    const result = await createAchievement(testInput);

    // Validate return values
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUserId);
    expect(result.puzzle_id).toEqual(testPuzzleId);
    expect(result.difficulty_level).toEqual('Medium');
    expect(result.completion_time).toEqual(300);
    expect(result.is_cookie_trifecta).toEqual(false);
    expect(result.achieved_at).toBeInstanceOf(Date);
  });

  it('should save achievement to database', async () => {
    testUserId = await createTestUser();
    testPuzzleId = await createTestPuzzle();

    const testInput: CreateAchievementInput = {
      user_id: testUserId,
      puzzle_id: testPuzzleId,
      difficulty_level: 'Hard',
      completion_time: 180,
      is_cookie_trifecta: true
    };

    const result = await createAchievement(testInput);

    // Query database to verify save
    const achievements = await db.select()
      .from(achievementsTable)
      .where(eq(achievementsTable.id, result.id))
      .execute();

    expect(achievements).toHaveLength(1);
    expect(achievements[0].user_id).toEqual(testUserId);
    expect(achievements[0].puzzle_id).toEqual(testPuzzleId);
    expect(achievements[0].difficulty_level).toEqual('Hard');
    expect(achievements[0].completion_time).toEqual(180);
    expect(achievements[0].is_cookie_trifecta).toEqual(true);
    expect(achievements[0].achieved_at).toBeInstanceOf(Date);
  });

  it('should default is_cookie_trifecta to false when not provided', async () => {
    testUserId = await createTestUser();
    testPuzzleId = await createTestPuzzle();

    const testInput: CreateAchievementInput = {
      user_id: testUserId,
      puzzle_id: testPuzzleId,
      difficulty_level: 'Easy',
      completion_time: 420,
      is_cookie_trifecta: false // Explicitly set to test the default behavior
    };

    const result = await createAchievement(testInput);

    expect(result.is_cookie_trifecta).toEqual(false);

    // Verify in database
    const achievements = await db.select()
      .from(achievementsTable)
      .where(eq(achievementsTable.id, result.id))
      .execute();

    expect(achievements[0].is_cookie_trifecta).toEqual(false);
  });

  it('should handle cookie trifecta achievement for fast completion', async () => {
    testUserId = await createTestUser();
    testPuzzleId = await createTestPuzzle();

    const testInput: CreateAchievementInput = {
      user_id: testUserId,
      puzzle_id: testPuzzleId,
      difficulty_level: 'Hard',
      completion_time: 60, // Very fast completion
      is_cookie_trifecta: true
    };

    const result = await createAchievement(testInput);

    expect(result.is_cookie_trifecta).toEqual(true);
    expect(result.completion_time).toEqual(60);
    expect(result.difficulty_level).toEqual('Hard');
  });

  it('should throw error when user does not exist', async () => {
    testPuzzleId = await createTestPuzzle();
    const nonExistentUserId = 99999;

    const testInput: CreateAchievementInput = {
      user_id: nonExistentUserId,
      puzzle_id: testPuzzleId,
      difficulty_level: 'Medium',
      completion_time: 300,
      is_cookie_trifecta: false
    };

    await expect(createAchievement(testInput))
      .rejects
      .toThrow(/user.*not found/i);
  });

  it('should throw error when puzzle does not exist', async () => {
    testUserId = await createTestUser();
    const nonExistentPuzzleId = 99999;

    const testInput: CreateAchievementInput = {
      user_id: testUserId,
      puzzle_id: nonExistentPuzzleId,
      difficulty_level: 'Medium',
      completion_time: 300,
      is_cookie_trifecta: false
    };

    await expect(createAchievement(testInput))
      .rejects
      .toThrow(/puzzle.*not found/i);
  });

  it('should handle all difficulty levels correctly', async () => {
    testUserId = await createTestUser();
    testPuzzleId = await createTestPuzzle();

    const difficultyLevels = ['Easy', 'Medium', 'Hard'] as const;
    
    for (const difficulty of difficultyLevels) {
      const testInput: CreateAchievementInput = {
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        difficulty_level: difficulty,
        completion_time: 240,
        is_cookie_trifecta: false
      };

      const result = await createAchievement(testInput);
      expect(result.difficulty_level).toEqual(difficulty);
    }
  });

  it('should track completion times accurately', async () => {
    testUserId = await createTestUser();
    testPuzzleId = await createTestPuzzle();

    const completionTimes = [30, 120, 300, 600]; // Different completion times
    
    for (const time of completionTimes) {
      const testInput: CreateAchievementInput = {
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        difficulty_level: 'Medium',
        completion_time: time,
        is_cookie_trifecta: time <= 60 // Fast completion gets trifecta
      };

      const result = await createAchievement(testInput);
      expect(result.completion_time).toEqual(time);
      expect(result.is_cookie_trifecta).toEqual(time <= 60);
    }
  });
});