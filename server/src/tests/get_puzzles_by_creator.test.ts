import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable } from '../db/schema';
import { type GetPuzzlesByCreatorInput, type CreateUserInput, type CreatePuzzleInput } from '../schema';
import { getPuzzlesByCreator } from '../handlers/get_puzzles_by_creator';
import { eq } from 'drizzle-orm';

// Test user input
const testUser: CreateUserInput = {
  email: 'creator@example.com',
  display_name: 'Test Creator',
  auth_provider: 'email',
  auth_provider_id: 'creator123'
};

// Test puzzle input (with all required fields)
const createTestPuzzle = (title: string, creatorId: number): CreatePuzzleInput => ({
  title,
  description: `A test puzzle: ${title}`,
  creator_id: creatorId,
  difficulty_level: 'Medium',
  grid_width: 5,
  grid_height: 5,
  board_data: '{"regions":[{"id":1,"cells":[[0,0],[0,1]]}]}',
  dominoes_data: '{"dominoes":[{"top":1,"bottom":2}]}',
  conditions_data: '{"conditions":[{"regionId":1,"type":"sum","value":5}]}',
  solution_data: '{"solution":[{"domino":0,"position":{"row":0,"col":0,"orientation":"vertical"}}]}',
  is_published: true,
  is_daily_puzzle: false
});

describe('getPuzzlesByCreator', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch puzzles created by a specific user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test puzzles sequentially to ensure different timestamps
    const puzzle1 = createTestPuzzle('First Puzzle', userId);
    
    await db.insert(puzzlesTable)
      .values({
        title: puzzle1.title,
        description: puzzle1.description,
        creator_id: puzzle1.creator_id,
        difficulty_level: puzzle1.difficulty_level,
        grid_width: puzzle1.grid_width,
        grid_height: puzzle1.grid_height,
        board_data: puzzle1.board_data,
        dominoes_data: puzzle1.dominoes_data,
        conditions_data: puzzle1.conditions_data,
        solution_data: puzzle1.solution_data,
        is_published: puzzle1.is_published,
        is_daily_puzzle: puzzle1.is_daily_puzzle
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const puzzle2 = createTestPuzzle('Second Puzzle', userId);
    
    await db.insert(puzzlesTable)
      .values({
        title: puzzle2.title,
        description: puzzle2.description,
        creator_id: puzzle2.creator_id,
        difficulty_level: puzzle2.difficulty_level,
        grid_width: puzzle2.grid_width,
        grid_height: puzzle2.grid_height,
        board_data: puzzle2.board_data,
        dominoes_data: puzzle2.dominoes_data,
        conditions_data: puzzle2.conditions_data,
        solution_data: puzzle2.solution_data,
        is_published: puzzle2.is_published,
        is_daily_puzzle: puzzle2.is_daily_puzzle
      })
      .execute();

    // Test input with default pagination
    const input: GetPuzzlesByCreatorInput = {
      creator_id: userId,
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByCreator(input);

    // Verify results
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Second Puzzle'); // Should be newest first (desc order)
    expect(result[1].title).toEqual('First Puzzle');
    expect(result[0].creator_id).toEqual(userId);
    expect(result[1].creator_id).toEqual(userId);
    expect(result[0].difficulty_level).toEqual('Medium');
    expect(result[0].is_published).toBe(true);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for non-existent creator', async () => {
    const input: GetPuzzlesByCreatorInput = {
      creator_id: 999, // Non-existent user
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByCreator(input);

    expect(result).toHaveLength(0);
  });

  it('should respect pagination limits', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple test puzzles sequentially to ensure different timestamps
    const puzzle1 = createTestPuzzle('Puzzle 1', userId);
    await db.insert(puzzlesTable)
      .values({
        title: puzzle1.title,
        description: puzzle1.description,
        creator_id: puzzle1.creator_id,
        difficulty_level: puzzle1.difficulty_level,
        grid_width: puzzle1.grid_width,
        grid_height: puzzle1.grid_height,
        board_data: puzzle1.board_data,
        dominoes_data: puzzle1.dominoes_data,
        conditions_data: puzzle1.conditions_data,
        solution_data: puzzle1.solution_data,
        is_published: puzzle1.is_published,
        is_daily_puzzle: puzzle1.is_daily_puzzle
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const puzzle2 = createTestPuzzle('Puzzle 2', userId);
    await db.insert(puzzlesTable)
      .values({
        title: puzzle2.title,
        description: puzzle2.description,
        creator_id: puzzle2.creator_id,
        difficulty_level: puzzle2.difficulty_level,
        grid_width: puzzle2.grid_width,
        grid_height: puzzle2.grid_height,
        board_data: puzzle2.board_data,
        dominoes_data: puzzle2.dominoes_data,
        conditions_data: puzzle2.conditions_data,
        solution_data: puzzle2.solution_data,
        is_published: puzzle2.is_published,
        is_daily_puzzle: puzzle2.is_daily_puzzle
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const puzzle3 = createTestPuzzle('Puzzle 3', userId);
    await db.insert(puzzlesTable)
      .values({
        title: puzzle3.title,
        description: puzzle3.description,
        creator_id: puzzle3.creator_id,
        difficulty_level: puzzle3.difficulty_level,
        grid_width: puzzle3.grid_width,
        grid_height: puzzle3.grid_height,
        board_data: puzzle3.board_data,
        dominoes_data: puzzle3.dominoes_data,
        conditions_data: puzzle3.conditions_data,
        solution_data: puzzle3.solution_data,
        is_published: puzzle3.is_published,
        is_daily_puzzle: puzzle3.is_daily_puzzle
      })
      .execute();

    // Test with limit = 2
    const input: GetPuzzlesByCreatorInput = {
      creator_id: userId,
      limit: 2,
      offset: 0
    };

    const result = await getPuzzlesByCreator(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Puzzle 3'); // Most recent first
    expect(result[1].title).toEqual('Puzzle 2');
  });

  it('should respect pagination offset', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple test puzzles sequentially to ensure different timestamps
    const puzzleA = createTestPuzzle('Puzzle A', userId);
    await db.insert(puzzlesTable)
      .values({
        title: puzzleA.title,
        description: puzzleA.description,
        creator_id: puzzleA.creator_id,
        difficulty_level: puzzleA.difficulty_level,
        grid_width: puzzleA.grid_width,
        grid_height: puzzleA.grid_height,
        board_data: puzzleA.board_data,
        dominoes_data: puzzleA.dominoes_data,
        conditions_data: puzzleA.conditions_data,
        solution_data: puzzleA.solution_data,
        is_published: puzzleA.is_published,
        is_daily_puzzle: puzzleA.is_daily_puzzle
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const puzzleB = createTestPuzzle('Puzzle B', userId);
    await db.insert(puzzlesTable)
      .values({
        title: puzzleB.title,
        description: puzzleB.description,
        creator_id: puzzleB.creator_id,
        difficulty_level: puzzleB.difficulty_level,
        grid_width: puzzleB.grid_width,
        grid_height: puzzleB.grid_height,
        board_data: puzzleB.board_data,
        dominoes_data: puzzleB.dominoes_data,
        conditions_data: puzzleB.conditions_data,
        solution_data: puzzleB.solution_data,
        is_published: puzzleB.is_published,
        is_daily_puzzle: puzzleB.is_daily_puzzle
      })
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const puzzleC = createTestPuzzle('Puzzle C', userId);
    await db.insert(puzzlesTable)
      .values({
        title: puzzleC.title,
        description: puzzleC.description,
        creator_id: puzzleC.creator_id,
        difficulty_level: puzzleC.difficulty_level,
        grid_width: puzzleC.grid_width,
        grid_height: puzzleC.grid_height,
        board_data: puzzleC.board_data,
        dominoes_data: puzzleC.dominoes_data,
        conditions_data: puzzleC.conditions_data,
        solution_data: puzzleC.solution_data,
        is_published: puzzleC.is_published,
        is_daily_puzzle: puzzleC.is_daily_puzzle
      })
      .execute();

    // Test with offset = 1
    const input: GetPuzzlesByCreatorInput = {
      creator_id: userId,
      limit: 20,
      offset: 1
    };

    const result = await getPuzzlesByCreator(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Puzzle B'); // Second newest
    expect(result[1].title).toEqual('Puzzle A'); // Oldest
  });

  it('should include puzzles with null creator_id excluded', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create one puzzle by user and one system puzzle (creator_id = null)
    const userPuzzle = createTestPuzzle('User Puzzle', userId);
    
    await db.insert(puzzlesTable)
      .values([
        {
          title: userPuzzle.title,
          description: userPuzzle.description,
          creator_id: userPuzzle.creator_id,
          difficulty_level: userPuzzle.difficulty_level,
          grid_width: userPuzzle.grid_width,
          grid_height: userPuzzle.grid_height,
          board_data: userPuzzle.board_data,
          dominoes_data: userPuzzle.dominoes_data,
          conditions_data: userPuzzle.conditions_data,
          solution_data: userPuzzle.solution_data,
          is_published: userPuzzle.is_published,
          is_daily_puzzle: userPuzzle.is_daily_puzzle
        },
        {
          title: 'System Puzzle',
          description: 'A system-generated puzzle',
          creator_id: null, // System puzzle
          difficulty_level: 'Easy',
          grid_width: 4,
          grid_height: 4,
          board_data: '{"regions":[{"id":1,"cells":[[0,0],[0,1]]}]}',
          dominoes_data: '{"dominoes":[{"top":1,"bottom":2}]}',
          conditions_data: '{"conditions":[{"regionId":1,"type":"sum","value":3}]}',
          solution_data: null,
          is_published: true,
          is_daily_puzzle: false
        }
      ])
      .execute();

    const input: GetPuzzlesByCreatorInput = {
      creator_id: userId,
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByCreator(input);

    // Should only return the user's puzzle, not the system puzzle
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User Puzzle');
    expect(result[0].creator_id).toEqual(userId);
  });

  it('should validate puzzles are saved correctly in database', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create and insert a test puzzle
    const testPuzzle = createTestPuzzle('Validation Puzzle', userId);
    
    const insertResult = await db.insert(puzzlesTable)
      .values({
        title: testPuzzle.title,
        description: testPuzzle.description,
        creator_id: testPuzzle.creator_id,
        difficulty_level: testPuzzle.difficulty_level,
        grid_width: testPuzzle.grid_width,
        grid_height: testPuzzle.grid_height,
        board_data: testPuzzle.board_data,
        dominoes_data: testPuzzle.dominoes_data,
        conditions_data: testPuzzle.conditions_data,
        solution_data: testPuzzle.solution_data,
        is_published: testPuzzle.is_published,
        is_daily_puzzle: testPuzzle.is_daily_puzzle
      })
      .returning()
      .execute();

    const puzzleId = insertResult[0].id;

    // Verify the puzzle was saved correctly
    const savedPuzzle = await db.select()
      .from(puzzlesTable)
      .where(eq(puzzlesTable.id, puzzleId))
      .execute();

    expect(savedPuzzle).toHaveLength(1);
    expect(savedPuzzle[0].title).toEqual('Validation Puzzle');
    expect(savedPuzzle[0].creator_id).toEqual(userId);
    expect(savedPuzzle[0].difficulty_level).toEqual('Medium');
    expect(savedPuzzle[0].grid_width).toEqual(5);
    expect(savedPuzzle[0].grid_height).toEqual(5);
    expect(savedPuzzle[0].is_published).toBe(true);
    expect(savedPuzzle[0].created_at).toBeInstanceOf(Date);
    expect(savedPuzzle[0].updated_at).toBeInstanceOf(Date);

    // Now test the handler
    const input: GetPuzzlesByCreatorInput = {
      creator_id: userId,
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByCreator(input);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(puzzleId);
    expect(result[0].title).toEqual('Validation Puzzle');
  });
});