import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all auth providers
const googleUserInput: CreateUserInput = {
  email: 'test@gmail.com',
  display_name: 'Test User',
  auth_provider: 'google',
  auth_provider_id: 'google_123456789'
};

const facebookUserInput: CreateUserInput = {
  email: 'test@facebook.com',
  display_name: 'Facebook User',
  auth_provider: 'facebook',
  auth_provider_id: 'facebook_987654321'
};

const emailUserInput: CreateUserInput = {
  email: 'test@email.com',
  display_name: 'Email User',
  auth_provider: 'email',
  auth_provider_id: 'email_hash_123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with Google auth provider', async () => {
    const result = await createUser(googleUserInput);

    // Basic field validation
    expect(result.email).toEqual('test@gmail.com');
    expect(result.display_name).toEqual('Test User');
    expect(result.auth_provider).toEqual('google');
    expect(result.auth_provider_id).toEqual('google_123456789');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with Facebook auth provider', async () => {
    const result = await createUser(facebookUserInput);

    expect(result.email).toEqual('test@facebook.com');
    expect(result.display_name).toEqual('Facebook User');
    expect(result.auth_provider).toEqual('facebook');
    expect(result.auth_provider_id).toEqual('facebook_987654321');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with email auth provider', async () => {
    const result = await createUser(emailUserInput);

    expect(result.email).toEqual('test@email.com');
    expect(result.display_name).toEqual('Email User');
    expect(result.auth_provider).toEqual('email');
    expect(result.auth_provider_id).toEqual('email_hash_123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(googleUserInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@gmail.com');
    expect(users[0].display_name).toEqual('Test User');
    expect(users[0].auth_provider).toEqual('google');
    expect(users[0].auth_provider_id).toEqual('google_123456789');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate sequential IDs for multiple users', async () => {
    const user1 = await createUser(googleUserInput);
    const user2 = await createUser(facebookUserInput);
    const user3 = await createUser(emailUserInput);

    expect(user1.id).toBeGreaterThan(0);
    expect(user2.id).toBeGreaterThan(user1.id);
    expect(user3.id).toBeGreaterThan(user2.id);
  });

  it('should handle unique email constraint violation', async () => {
    // Create first user
    await createUser(googleUserInput);

    // Try to create second user with same email but different auth provider
    const duplicateEmailInput: CreateUserInput = {
      ...googleUserInput,
      auth_provider: 'facebook',
      auth_provider_id: 'facebook_different'
    };

    // Should throw error due to unique email constraint
    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should set created_at and updated_at to current time', async () => {
    const beforeCreate = new Date();
    const result = await createUser(googleUserInput);
    const afterCreate = new Date();

    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should create multiple users with different auth providers', async () => {
    const googleUser = await createUser(googleUserInput);
    const facebookUser = await createUser(facebookUserInput);
    const emailUser = await createUser(emailUserInput);

    // Verify all users are created with correct data
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(3);
    
    const usersByProvider = {
      google: allUsers.find(u => u.auth_provider === 'google'),
      facebook: allUsers.find(u => u.auth_provider === 'facebook'),
      email: allUsers.find(u => u.auth_provider === 'email')
    };

    expect(usersByProvider.google?.email).toEqual('test@gmail.com');
    expect(usersByProvider.facebook?.email).toEqual('test@facebook.com');
    expect(usersByProvider.email?.email).toEqual('test@email.com');
  });
});