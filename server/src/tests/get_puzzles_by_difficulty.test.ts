import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, puzzlesTable } from '../db/schema';
import { type CreateUserInput, type CreatePuzzleInput, type GetPuzzlesByDifficultyInput } from '../schema';
import { getPuzzlesByDifficulty } from '../handlers/get_puzzles_by_difficulty';

// Test user data for puzzle creation
const testUser: CreateUserInput = {
  email: 'puzzlecreator@example.com',
  display_name: 'Puzzle Creator',
  auth_provider: 'email',
  auth_provider_id: 'user123'
};

// Test puzzle data for different difficulty levels
const easyPuzzle: CreatePuzzleInput = {
  title: 'Easy Test Puzzle',
  description: 'A simple puzzle for testing',
  difficulty_level: 'Easy',
  grid_width: 4,
  grid_height: 4,
  board_data: '{"regions":[{"id":1,"cells":[0,1]},{"id":2,"cells":[2,3]}]}',
  dominoes_data: '{"dominoes":[{"id":1,"values":[1,2]},{"id":2,"values":[3,4]}]}',
  conditions_data: '{"conditions":[{"region_id":1,"type":"sum","value":3}]}',
  solution_data: '{"placement":[{"domino_id":1,"cells":[0,1]}]}',
  is_published: true,
  is_daily_puzzle: false
};

const mediumPuzzle: CreatePuzzleInput = {
  title: 'Medium Test Puzzle',
  description: 'A medium difficulty puzzle',
  difficulty_level: 'Medium',
  grid_width: 6,
  grid_height: 6,
  board_data: '{"regions":[{"id":1,"cells":[0,1,2]},{"id":2,"cells":[3,4,5]}]}',
  dominoes_data: '{"dominoes":[{"id":1,"values":[2,3]},{"id":2,"values":[4,5]}]}',
  conditions_data: '{"conditions":[{"region_id":1,"type":"sum","value":8}]}',
  solution_data: '{"placement":[{"domino_id":1,"cells":[0,1]}]}',
  is_published: true,
  is_daily_puzzle: false
};

const hardPuzzle: CreatePuzzleInput = {
  title: 'Hard Test Puzzle',
  description: 'A challenging puzzle',
  difficulty_level: 'Hard',
  grid_width: 8,
  grid_height: 8,
  board_data: '{"regions":[{"id":1,"cells":[0,1,2,3]},{"id":2,"cells":[4,5,6,7]}]}',
  dominoes_data: '{"dominoes":[{"id":1,"values":[3,4]},{"id":2,"values":[5,6]}]}',
  conditions_data: '{"conditions":[{"region_id":1,"type":"sum","value":12}]}',
  solution_data: '{"placement":[{"domino_id":1,"cells":[0,1]}]}',
  is_published: true,
  is_daily_puzzle: false
};

describe('getPuzzlesByDifficulty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return puzzles filtered by difficulty level', async () => {
    // Create a user first
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

    // Create puzzles with different difficulty levels
    await db.insert(puzzlesTable)
      .values({
        title: easyPuzzle.title,
        description: easyPuzzle.description,
        difficulty_level: easyPuzzle.difficulty_level,
        grid_width: easyPuzzle.grid_width,
        grid_height: easyPuzzle.grid_height,
        board_data: easyPuzzle.board_data,
        dominoes_data: easyPuzzle.dominoes_data,
        conditions_data: easyPuzzle.conditions_data,
        solution_data: easyPuzzle.solution_data,
        is_published: easyPuzzle.is_published,
        is_daily_puzzle: easyPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    await db.insert(puzzlesTable)
      .values({
        title: mediumPuzzle.title,
        description: mediumPuzzle.description,
        difficulty_level: mediumPuzzle.difficulty_level,
        grid_width: mediumPuzzle.grid_width,
        grid_height: mediumPuzzle.grid_height,
        board_data: mediumPuzzle.board_data,
        dominoes_data: mediumPuzzle.dominoes_data,
        conditions_data: mediumPuzzle.conditions_data,
        solution_data: mediumPuzzle.solution_data,
        is_published: mediumPuzzle.is_published,
        is_daily_puzzle: mediumPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    await db.insert(puzzlesTable)
      .values({
        title: hardPuzzle.title,
        description: hardPuzzle.description,
        difficulty_level: hardPuzzle.difficulty_level,
        grid_width: hardPuzzle.grid_width,
        grid_height: hardPuzzle.grid_height,
        board_data: hardPuzzle.board_data,
        dominoes_data: hardPuzzle.dominoes_data,
        conditions_data: hardPuzzle.conditions_data,
        solution_data: hardPuzzle.solution_data,
        is_published: hardPuzzle.is_published,
        is_daily_puzzle: hardPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    // Add another easy puzzle
    await db.insert(puzzlesTable)
      .values({
        title: 'Another Easy Puzzle',
        description: easyPuzzle.description,
        difficulty_level: easyPuzzle.difficulty_level,
        grid_width: easyPuzzle.grid_width,
        grid_height: easyPuzzle.grid_height,
        board_data: easyPuzzle.board_data,
        dominoes_data: easyPuzzle.dominoes_data,
        conditions_data: easyPuzzle.conditions_data,
        solution_data: easyPuzzle.solution_data,
        is_published: easyPuzzle.is_published,
        is_daily_puzzle: easyPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    const input: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Easy',
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByDifficulty(input);

    expect(result).toHaveLength(2);
    result.forEach(puzzle => {
      expect(puzzle.difficulty_level).toEqual('Easy');
      expect(puzzle.title).toContain('Easy');
      expect(puzzle.id).toBeDefined();
      expect(puzzle.created_at).toBeInstanceOf(Date);
      expect(puzzle.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return medium difficulty puzzles only', async () => {
    // Create a user first
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

    // Create puzzles with different difficulty levels
    await db.insert(puzzlesTable)
      .values({
        title: easyPuzzle.title,
        description: easyPuzzle.description,
        difficulty_level: easyPuzzle.difficulty_level,
        grid_width: easyPuzzle.grid_width,
        grid_height: easyPuzzle.grid_height,
        board_data: easyPuzzle.board_data,
        dominoes_data: easyPuzzle.dominoes_data,
        conditions_data: easyPuzzle.conditions_data,
        solution_data: easyPuzzle.solution_data,
        is_published: easyPuzzle.is_published,
        is_daily_puzzle: easyPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    await db.insert(puzzlesTable)
      .values({
        title: mediumPuzzle.title,
        description: mediumPuzzle.description,
        difficulty_level: mediumPuzzle.difficulty_level,
        grid_width: mediumPuzzle.grid_width,
        grid_height: mediumPuzzle.grid_height,
        board_data: mediumPuzzle.board_data,
        dominoes_data: mediumPuzzle.dominoes_data,
        conditions_data: mediumPuzzle.conditions_data,
        solution_data: mediumPuzzle.solution_data,
        is_published: mediumPuzzle.is_published,
        is_daily_puzzle: mediumPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    await db.insert(puzzlesTable)
      .values({
        title: hardPuzzle.title,
        description: hardPuzzle.description,
        difficulty_level: hardPuzzle.difficulty_level,
        grid_width: hardPuzzle.grid_width,
        grid_height: hardPuzzle.grid_height,
        board_data: hardPuzzle.board_data,
        dominoes_data: hardPuzzle.dominoes_data,
        conditions_data: hardPuzzle.conditions_data,
        solution_data: hardPuzzle.solution_data,
        is_published: hardPuzzle.is_published,
        is_daily_puzzle: hardPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    const input: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Medium',
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByDifficulty(input);

    expect(result).toHaveLength(1);
    expect(result[0].difficulty_level).toEqual('Medium');
    expect(result[0].title).toEqual('Medium Test Puzzle');
  });

  it('should respect pagination with limit and offset', async () => {
    // Create a user first
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

    // Create multiple easy puzzles
    for (let i = 0; i < 5; i++) {
      await db.insert(puzzlesTable)
        .values({
          title: `Easy Puzzle ${i + 1}`,
          description: easyPuzzle.description,
          difficulty_level: easyPuzzle.difficulty_level,
          grid_width: easyPuzzle.grid_width,
          grid_height: easyPuzzle.grid_height,
          board_data: easyPuzzle.board_data,
          dominoes_data: easyPuzzle.dominoes_data,
          conditions_data: easyPuzzle.conditions_data,
          solution_data: easyPuzzle.solution_data,
          is_published: easyPuzzle.is_published,
          is_daily_puzzle: easyPuzzle.is_daily_puzzle,
          creator_id: userId
        })
        .execute();
    }

    // Test with limit = 3
    const firstPageInput: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Easy',
      limit: 3,
      offset: 0
    };

    const firstPage = await getPuzzlesByDifficulty(firstPageInput);
    expect(firstPage).toHaveLength(3);

    // Test with offset = 3, limit = 3 (should get remaining 2)
    const secondPageInput: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Easy',
      limit: 3,
      offset: 3
    };

    const secondPage = await getPuzzlesByDifficulty(secondPageInput);
    expect(secondPage).toHaveLength(2);

    // Ensure no overlap
    const firstPageIds = firstPage.map(p => p.id);
    const secondPageIds = secondPage.map(p => p.id);
    const hasOverlap = firstPageIds.some(id => secondPageIds.includes(id));
    expect(hasOverlap).toBe(false);
  });

  it('should return empty array when no puzzles match difficulty', async () => {
    const input: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Hard',
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByDifficulty(input);

    expect(result).toHaveLength(0);
  });

  it('should handle system-generated puzzles (null creator_id)', async () => {
    // Create a system-generated puzzle
    await db.insert(puzzlesTable)
      .values({
        title: easyPuzzle.title,
        description: easyPuzzle.description,
        difficulty_level: easyPuzzle.difficulty_level,
        grid_width: easyPuzzle.grid_width,
        grid_height: easyPuzzle.grid_height,
        board_data: easyPuzzle.board_data,
        dominoes_data: easyPuzzle.dominoes_data,
        conditions_data: easyPuzzle.conditions_data,
        solution_data: easyPuzzle.solution_data,
        is_published: easyPuzzle.is_published,
        is_daily_puzzle: easyPuzzle.is_daily_puzzle,
        creator_id: null // System-generated puzzle
      })
      .execute();

    const input: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Easy',
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByDifficulty(input);

    expect(result).toHaveLength(1);
    expect(result[0].difficulty_level).toEqual('Easy');
    expect(result[0].creator_id).toBeNull();
  });

  it('should use default pagination values when not provided', async () => {
    // Create a user first
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

    // Create puzzle
    await db.insert(puzzlesTable)
      .values({
        title: easyPuzzle.title,
        description: easyPuzzle.description,
        difficulty_level: easyPuzzle.difficulty_level,
        grid_width: easyPuzzle.grid_width,
        grid_height: easyPuzzle.grid_height,
        board_data: easyPuzzle.board_data,
        dominoes_data: easyPuzzle.dominoes_data,
        conditions_data: easyPuzzle.conditions_data,
        solution_data: easyPuzzle.solution_data,
        is_published: easyPuzzle.is_published,
        is_daily_puzzle: easyPuzzle.is_daily_puzzle,
        creator_id: userId
      })
      .execute();

    // Input with only difficulty_level (limit and offset should use defaults)
    const input: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Easy',
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByDifficulty(input);

    expect(result).toHaveLength(1);
    expect(result[0].difficulty_level).toEqual('Easy');
  });

  it('should include all puzzle fields in response', async () => {
    // Create a user first
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

    // Create puzzle with all fields
    await db.insert(puzzlesTable)
      .values({
        title: easyPuzzle.title,
        description: easyPuzzle.description,
        difficulty_level: easyPuzzle.difficulty_level,
        grid_width: easyPuzzle.grid_width,
        grid_height: easyPuzzle.grid_height,
        board_data: easyPuzzle.board_data,
        dominoes_data: easyPuzzle.dominoes_data,
        conditions_data: easyPuzzle.conditions_data,
        solution_data: easyPuzzle.solution_data,
        is_published: easyPuzzle.is_published,
        creator_id: userId,
        is_daily_puzzle: true,
        daily_puzzle_date: '2024-01-15'
      })
      .execute();

    const input: GetPuzzlesByDifficultyInput = {
      difficulty_level: 'Easy',
      limit: 20,
      offset: 0
    };

    const result = await getPuzzlesByDifficulty(input);

    expect(result).toHaveLength(1);
    const puzzle = result[0];
    
    // Verify all expected fields are present
    expect(puzzle.id).toBeDefined();
    expect(puzzle.title).toEqual('Easy Test Puzzle');
    expect(puzzle.description).toEqual('A simple puzzle for testing');
    expect(puzzle.creator_id).toEqual(userId);
    expect(puzzle.difficulty_level).toEqual('Easy');
    expect(puzzle.grid_width).toEqual(4);
    expect(puzzle.grid_height).toEqual(4);
    expect(puzzle.board_data).toBeDefined();
    expect(puzzle.dominoes_data).toBeDefined();
    expect(puzzle.conditions_data).toBeDefined();
    expect(puzzle.solution_data).toBeDefined();
    expect(puzzle.is_published).toEqual(true);
    expect(puzzle.is_daily_puzzle).toEqual(true);
    expect(puzzle.daily_puzzle_date).toBeInstanceOf(Date);
    expect(puzzle.created_at).toBeInstanceOf(Date);
    expect(puzzle.updated_at).toBeInstanceOf(Date);
  });
});