import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserByEmail } from '../handlers/get_user_by_email';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  display_name: 'Test User',
  auth_provider: 'email',
  auth_provider_id: 'test123'
};

const anotherUser: CreateUserInput = {
  email: 'another@example.com',
  display_name: 'Another User',
  auth_provider: 'google',
  auth_provider_id: 'google123'
};

describe('getUserByEmail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when email exists', async () => {
    // Create test user
    await db.insert(usersTable).values({
      email: testUser.email,
      display_name: testUser.display_name,
      auth_provider: testUser.auth_provider,
      auth_provider_id: testUser.auth_provider_id
    }).execute();

    const result = await getUserByEmail(testUser.email);

    expect(result).not.toBeNull();
    expect(result?.email).toEqual(testUser.email);
    expect(result?.display_name).toEqual(testUser.display_name);
    expect(result?.auth_provider).toEqual(testUser.auth_provider);
    expect(result?.auth_provider_id).toEqual(testUser.auth_provider_id);
    expect(result?.id).toBeDefined();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when email does not exist', async () => {
    const result = await getUserByEmail('nonexistent@example.com');
    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple users
    await db.insert(usersTable).values([
      {
        email: testUser.email,
        display_name: testUser.display_name,
        auth_provider: testUser.auth_provider,
        auth_provider_id: testUser.auth_provider_id
      },
      {
        email: anotherUser.email,
        display_name: anotherUser.display_name,
        auth_provider: anotherUser.auth_provider,
        auth_provider_id: anotherUser.auth_provider_id
      }
    ]).execute();

    const result = await getUserByEmail(anotherUser.email);

    expect(result).not.toBeNull();
    expect(result?.email).toEqual(anotherUser.email);
    expect(result?.display_name).toEqual(anotherUser.display_name);
    expect(result?.auth_provider).toEqual(anotherUser.auth_provider);
    expect(result?.auth_provider_id).toEqual(anotherUser.auth_provider_id);
  });

  it('should be case sensitive for email matching', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable).values({
      email: testUser.email.toLowerCase(),
      display_name: testUser.display_name,
      auth_provider: testUser.auth_provider,
      auth_provider_id: testUser.auth_provider_id
    }).execute();

    // Search with uppercase email - should not match
    const uppercaseResult = await getUserByEmail(testUser.email.toUpperCase());
    expect(uppercaseResult).toBeNull();

    // Search with exact lowercase email - should match
    const lowercaseResult = await getUserByEmail(testUser.email.toLowerCase());
    expect(lowercaseResult).not.toBeNull();
    expect(lowercaseResult?.email).toEqual(testUser.email.toLowerCase());
  });

  it('should handle special characters in email', async () => {
    const specialEmail = 'user+test@example-domain.co.uk';
    
    await db.insert(usersTable).values({
      email: specialEmail,
      display_name: testUser.display_name,
      auth_provider: testUser.auth_provider,
      auth_provider_id: testUser.auth_provider_id
    }).execute();

    const result = await getUserByEmail(specialEmail);

    expect(result).not.toBeNull();
    expect(result?.email).toEqual(specialEmail);
  });
});