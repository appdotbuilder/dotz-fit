import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deletePuzzle } from '../handlers/delete_puzzle';

// Test data
const testUser = {
  email: 'creator@example.com',
  display_name: 'Puzzle Creator',
  auth_provider: 'email' as const,
  auth_provider_id: 'creator123'
};

const anotherUser = {
  email: 'other@example.com',
  display_name: 'Other User',
  auth_provider: 'google' as const,
  auth_provider_id: 'other456'
};

const testPuzzle = {
  title: 'Test Puzzle',
  description: 'A puzzle for testing deletion',
  difficulty_level: 'Medium' as const,
  grid_width: 4,
  grid_height: 4,
  board_data: '{"grid": [[1,1,2,2],[1,1,2,2],[3,3,4,4],[3,3,4,4]]}',
  dominoes_data: '{"dominoes": [{"id": 1, "values": [1,2]}]}',
  conditions_data: '{"conditions": [{"region": 1, "type": "sum", "target": 10}]}',
  is_published: true
};

describe('deletePuzzle', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete puzzle when creator is correct', async () => {
    // Create test user
    const [creator] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test puzzle
    const [puzzle] = await db.insert(puzzlesTable)
      .values({
        ...testPuzzle,
        creator_id: creator.id
      })
      .returning()
      .execute();

    // Delete the puzzle
    const result = await deletePuzzle(puzzle.id, creator.id);

    expect(result).toBe(true);

    // Verify puzzle was deleted from database
    const puzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, puzzle.id))
      .execute();

    expect(puzzles).toHaveLength(0);
  });

  it('should return false when puzzle does not exist', async () => {
    // Create test user
    const [creator] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Try to delete non-existent puzzle
    const result = await deletePuzzle(999, creator.id);

    expect(result).toBe(false);
  });

  it('should return false when creator id does not match', async () => {
    // Create test users
    const [creator] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [otherUser] = await db.insert(usersTable)
      .values(anotherUser)
      .returning()
      .execute();

    // Create puzzle owned by creator
    const [puzzle] = await db.insert(puzzlesTable)
      .values({
        ...testPuzzle,
        creator_id: creator.id
      })
      .returning()
      .execute();

    // Try to delete with wrong creator id
    const result = await deletePuzzle(puzzle.id, otherUser.id);

    expect(result).toBe(false);

    // Verify puzzle still exists in database
    const puzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, puzzle.id))
      .execute();

    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].title).toEqual('Test Puzzle');
  });

  it('should return false when trying to delete system puzzle (null creator)', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create system puzzle (creator_id is null)
    const [systemPuzzle] = await db.insert(puzzlesTable)
      .values({
        ...testPuzzle,
        title: 'System Puzzle',
        creator_id: null
      })
      .returning()
      .execute();

    // Try to delete system puzzle
    const result = await deletePuzzle(systemPuzzle.id, user.id);

    expect(result).toBe(false);

    // Verify system puzzle still exists
    const puzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, systemPuzzle.id))
      .execute();

    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].title).toEqual('System Puzzle');
  });

  it('should delete only the correct puzzle when creator has multiple puzzles', async () => {
    // Create test user
    const [creator] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create multiple puzzles for the creator
    const [puzzle1] = await db.insert(puzzlesTable)
      .values({
        ...testPuzzle,
        title: 'Puzzle 1',
        creator_id: creator.id
      })
      .returning()
      .execute();

    const [puzzle2] = await db.insert(puzzlesTable)
      .values({
        ...testPuzzle,
        title: 'Puzzle 2',
        creator_id: creator.id
      })
      .returning()
      .execute();

    // Delete only one puzzle
    const result = await deletePuzzle(puzzle1.id, creator.id);

    expect(result).toBe(true);

    // Verify only puzzle1 was deleted
    const remainingPuzzles = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.creator_id, creator.id))
      .execute();

    expect(remainingPuzzles).toHaveLength(1);
    expect(remainingPuzzles[0].title).toEqual('Puzzle 2');
    expect(remainingPuzzles[0].id).toEqual(puzzle2.id);
  });
});