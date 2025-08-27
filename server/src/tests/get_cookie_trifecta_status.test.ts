import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable, achievementsTable } from '../db/schema';
import { getCookieTrifectaStatus } from '../handlers/get_cookie_trifecta_status';

describe('getCookieTrifectaStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUserId: number;
  let testPuzzleId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        display_name: 'Test User',
        auth_provider: 'email',
        auth_provider_id: 'test123'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test puzzle
    const puzzleResult = await db.insert(puzzlesTable)
      .values({
        title: 'Test Puzzle',
        difficulty_level: 'Easy',
        grid_width: 5,
        grid_height: 5,
        board_data: '{}',
        dominoes_data: '{}',
        conditions_data: '{}',
        is_published: true
      })
      .returning()
      .execute();
    
    testPuzzleId = puzzleResult[0].id;
  });

  it('should return all false when user has no cookie trifecta achievements', async () => {
    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(false);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(false);
  });

  it('should return true for easy when user has easy cookie trifecta', async () => {
    // Create cookie trifecta achievement for easy difficulty
    await db.insert(achievementsTable)
      .values({
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        difficulty_level: 'Easy',
        completion_time: 30,
        is_cookie_trifecta: true
      })
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(true);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(false);
  });

  it('should return true for medium when user has medium cookie trifecta', async () => {
    // Create cookie trifecta achievement for medium difficulty
    await db.insert(achievementsTable)
      .values({
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        difficulty_level: 'Medium',
        completion_time: 45,
        is_cookie_trifecta: true
      })
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(false);
    expect(result.medium).toBe(true);
    expect(result.hard).toBe(false);
  });

  it('should return true for hard when user has hard cookie trifecta', async () => {
    // Create cookie trifecta achievement for hard difficulty
    await db.insert(achievementsTable)
      .values({
        user_id: testUserId,
        puzzle_id: testPuzzleId,
        difficulty_level: 'Hard',
        completion_time: 60,
        is_cookie_trifecta: true
      })
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(false);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(true);
  });

  it('should return true for multiple difficulties when user has multiple cookie trifectas', async () => {
    // Create cookie trifecta achievements for easy and hard difficulties
    await db.insert(achievementsTable)
      .values([
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Easy',
          completion_time: 30,
          is_cookie_trifecta: true
        },
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Hard',
          completion_time: 60,
          is_cookie_trifecta: true
        }
      ])
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(true);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(true);
  });

  it('should return all true when user has cookie trifectas for all difficulties', async () => {
    // Create cookie trifecta achievements for all difficulties
    await db.insert(achievementsTable)
      .values([
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Easy',
          completion_time: 30,
          is_cookie_trifecta: true
        },
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Medium',
          completion_time: 45,
          is_cookie_trifecta: true
        },
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Hard',
          completion_time: 60,
          is_cookie_trifecta: true
        }
      ])
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(true);
    expect(result.medium).toBe(true);
    expect(result.hard).toBe(true);
  });

  it('should ignore non-cookie-trifecta achievements', async () => {
    // Create regular achievements (not cookie trifecta)
    await db.insert(achievementsTable)
      .values([
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Easy',
          completion_time: 120,
          is_cookie_trifecta: false
        },
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Medium',
          completion_time: 180,
          is_cookie_trifecta: false
        }
      ])
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(false);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(false);
  });

  it('should only return cookie trifecta status for the specified user', async () => {
    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        display_name: 'Other User',
        auth_provider: 'email',
        auth_provider_id: 'other123'
      })
      .returning()
      .execute();
    
    const otherUserId = otherUserResult[0].id;

    // Create cookie trifecta achievement for other user
    await db.insert(achievementsTable)
      .values({
        user_id: otherUserId,
        puzzle_id: testPuzzleId,
        difficulty_level: 'Easy',
        completion_time: 30,
        is_cookie_trifecta: true
      })
      .execute();

    // Test user should have no cookie trifecta status
    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(false);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(false);
  });

  it('should handle multiple cookie trifecta achievements of same difficulty', async () => {
    // Create multiple cookie trifecta achievements for the same difficulty
    await db.insert(achievementsTable)
      .values([
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Easy',
          completion_time: 30,
          is_cookie_trifecta: true
        },
        {
          user_id: testUserId,
          puzzle_id: testPuzzleId,
          difficulty_level: 'Easy',
          completion_time: 25,
          is_cookie_trifecta: true
        }
      ])
      .execute();

    const result = await getCookieTrifectaStatus(testUserId);

    expect(result.easy).toBe(true);
    expect(result.medium).toBe(false);
    expect(result.hard).toBe(false);
  });
});