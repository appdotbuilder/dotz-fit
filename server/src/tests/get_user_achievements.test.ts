import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable, achievementsTable } from '../db/schema';
import { type GetUserAchievementsInput } from '../schema';
import { getUserAchievements } from '../handlers/get_user_achievements';

// Test data
const testUser1 = {
  email: 'user1@example.com',
  display_name: 'User One',
  auth_provider: 'email' as const,
  auth_provider_id: 'user1_auth'
};

const testUser2 = {
  email: 'user2@example.com',
  display_name: 'User Two',
  auth_provider: 'google' as const,
  auth_provider_id: 'user2_auth'
};

const testPuzzle = {
  title: 'Test Puzzle',
  description: 'A puzzle for testing achievements',
  difficulty_level: 'Easy' as const,
  grid_width: 5,
  grid_height: 5,
  board_data: '{"regions": [], "layout": []}',
  dominoes_data: '{"dominoes": []}',
  conditions_data: '{"conditions": []}',
  is_published: true
};

describe('getUserAchievements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all achievements for a user', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();

    // Create test puzzle
    const [puzzle] = await db.insert(puzzlesTable)
      .values({ ...testPuzzle, creator_id: user1.id })
      .returning()
      .execute();

    // Create achievements for user1
    await db.insert(achievementsTable)
      .values([
        {
          user_id: user1.id,
          puzzle_id: puzzle.id,
          difficulty_level: 'Easy',
          completion_time: 120,
          is_cookie_trifecta: true
        },
        {
          user_id: user1.id,
          puzzle_id: puzzle.id,
          difficulty_level: 'Medium',
          completion_time: 300,
          is_cookie_trifecta: false
        }
      ])
      .execute();

    // Create achievement for user2 (should not be returned)
    await db.insert(achievementsTable)
      .values({
        user_id: user2.id,
        puzzle_id: puzzle.id,
        difficulty_level: 'Hard',
        completion_time: 600,
        is_cookie_trifecta: false
      })
      .execute();

    // Test getting all achievements for user1
    const input: GetUserAchievementsInput = {
      user_id: user1.id
    };

    const result = await getUserAchievements(input);

    // Should return 2 achievements for user1
    expect(result).toHaveLength(2);
    expect(result.every(achievement => achievement.user_id === user1.id)).toBe(true);

    // Verify achievement details
    const easyAchievement = result.find(a => a.difficulty_level === 'Easy');
    const mediumAchievement = result.find(a => a.difficulty_level === 'Medium');

    expect(easyAchievement).toBeDefined();
    expect(easyAchievement!.completion_time).toBe(120);
    expect(easyAchievement!.is_cookie_trifecta).toBe(true);

    expect(mediumAchievement).toBeDefined();
    expect(mediumAchievement!.completion_time).toBe(300);
    expect(mediumAchievement!.is_cookie_trifecta).toBe(false);
  });

  it('should filter achievements by difficulty level', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create test puzzle
    const [puzzle] = await db.insert(puzzlesTable)
      .values({ ...testPuzzle, creator_id: user.id })
      .returning()
      .execute();

    // Create achievements with different difficulty levels
    await db.insert(achievementsTable)
      .values([
        {
          user_id: user.id,
          puzzle_id: puzzle.id,
          difficulty_level: 'Easy',
          completion_time: 120,
          is_cookie_trifecta: true
        },
        {
          user_id: user.id,
          puzzle_id: puzzle.id,
          difficulty_level: 'Medium',
          completion_time: 300,
          is_cookie_trifecta: false
        },
        {
          user_id: user.id,
          puzzle_id: puzzle.id,
          difficulty_level: 'Hard',
          completion_time: 600,
          is_cookie_trifecta: false
        }
      ])
      .execute();

    // Test filtering by Easy difficulty
    const easyInput: GetUserAchievementsInput = {
      user_id: user.id,
      difficulty_level: 'Easy'
    };

    const easyResults = await getUserAchievements(easyInput);

    expect(easyResults).toHaveLength(1);
    expect(easyResults[0].difficulty_level).toBe('Easy');
    expect(easyResults[0].is_cookie_trifecta).toBe(true);

    // Test filtering by Medium difficulty
    const mediumInput: GetUserAchievementsInput = {
      user_id: user.id,
      difficulty_level: 'Medium'
    };

    const mediumResults = await getUserAchievements(mediumInput);

    expect(mediumResults).toHaveLength(1);
    expect(mediumResults[0].difficulty_level).toBe('Medium');
    expect(mediumResults[0].is_cookie_trifecta).toBe(false);
  });

  it('should return empty array for user with no achievements', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const input: GetUserAchievementsInput = {
      user_id: user.id
    };

    const result = await getUserAchievements(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserAchievementsInput = {
      user_id: 999999 // Non-existent user ID
    };

    const result = await getUserAchievements(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by difficulty with no matches', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create test puzzle
    const [puzzle] = await db.insert(puzzlesTable)
      .values({ ...testPuzzle, creator_id: user.id })
      .returning()
      .execute();

    // Create only Easy achievements
    await db.insert(achievementsTable)
      .values({
        user_id: user.id,
        puzzle_id: puzzle.id,
        difficulty_level: 'Easy',
        completion_time: 120,
        is_cookie_trifecta: false
      })
      .execute();

    // Filter by Hard difficulty (should return empty)
    const input: GetUserAchievementsInput = {
      user_id: user.id,
      difficulty_level: 'Hard'
    };

    const result = await getUserAchievements(input);

    expect(result).toHaveLength(0);
  });

  it('should include all achievement fields correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create test puzzle
    const [puzzle] = await db.insert(puzzlesTable)
      .values({ ...testPuzzle, creator_id: user.id })
      .returning()
      .execute();

    // Create achievement
    await db.insert(achievementsTable)
      .values({
        user_id: user.id,
        puzzle_id: puzzle.id,
        difficulty_level: 'Medium',
        completion_time: 450,
        is_cookie_trifecta: true
      })
      .execute();

    const input: GetUserAchievementsInput = {
      user_id: user.id
    };

    const result = await getUserAchievements(input);

    expect(result).toHaveLength(1);
    
    const achievement = result[0];
    expect(achievement.id).toBeDefined();
    expect(achievement.user_id).toBe(user.id);
    expect(achievement.puzzle_id).toBe(puzzle.id);
    expect(achievement.difficulty_level).toBe('Medium');
    expect(achievement.completion_time).toBe(450);
    expect(achievement.is_cookie_trifecta).toBe(true);
    expect(achievement.achieved_at).toBeInstanceOf(Date);
  });
});