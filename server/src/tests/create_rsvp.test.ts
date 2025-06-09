
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rsvpsTable } from '../db/schema';
import { type CreateRsvpInput } from '../schema';
import { createRsvp } from '../handlers/create_rsvp';
import { eq } from 'drizzle-orm';

// Test input for Yes response
const testInputYes: CreateRsvpInput = {
  phone_number: '1234567890',
  first_name: 'John',
  last_name: 'Doe',
  response: 'Yes',
  comment: 'Looking forward to it!',
  recaptcha_token: 'valid_token_123',
  device_type: 'iPhone'
};

// Test input for No response
const testInputNo: CreateRsvpInput = {
  phone_number: '9876543210',
  first_name: 'Jane',
  last_name: 'Smith',
  response: 'No',
  comment: 'Unfortunately cannot attend',
  recaptcha_token: 'valid_token_456',
  device_type: 'Android'
};

// Test input for Maybe response
const testInputMaybe: CreateRsvpInput = {
  phone_number: '5555551234',
  first_name: 'Bob',
  last_name: 'Johnson',
  response: 'Maybe',
  comment: null,
  recaptcha_token: 'valid_token_789',
  device_type: 'Other'
};

describe('createRsvp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create RSVP with Yes response and generate wallet pass', async () => {
    const result = await createRsvp(testInputYes);

    // Validate RSVP data
    expect(result.rsvp.phone_number).toEqual('1234567890');
    expect(result.rsvp.first_name).toEqual('John');
    expect(result.rsvp.last_name).toEqual('Doe');
    expect(result.rsvp.response).toEqual('Yes');
    expect(result.rsvp.comment).toEqual('Looking forward to it!');
    expect(result.rsvp.device_type).toEqual('iPhone');
    expect(result.rsvp.id).toBeDefined();
    expect(result.rsvp.created_at).toBeInstanceOf(Date);

    // Validate wallet pass was generated
    expect(result.wallet_pass).not.toBeNull();
    expect(result.wallet_pass!.pass_id).toBeDefined();
    expect(result.wallet_pass!.pass_url).toBeDefined();
    expect(result.rsvp.wallet_pass_id).toEqual(result.wallet_pass!.pass_id);
    expect(result.rsvp.wallet_pass_url).toEqual(result.wallet_pass!.pass_url);
  });

  it('should create RSVP with Maybe response and generate wallet pass', async () => {
    const result = await createRsvp(testInputMaybe);

    // Validate RSVP data
    expect(result.rsvp.response).toEqual('Maybe');
    expect(result.rsvp.device_type).toEqual('Other');

    // Validate wallet pass was generated for Maybe response
    expect(result.wallet_pass).not.toBeNull();
    expect(result.wallet_pass!.pass_id).toBeDefined();
    expect(result.wallet_pass!.pass_url).toBeDefined();
    expect(result.rsvp.wallet_pass_id).toEqual(result.wallet_pass!.pass_id);
    expect(result.rsvp.wallet_pass_url).toEqual(result.wallet_pass!.pass_url);
  });

  it('should create RSVP with No response and not generate wallet pass', async () => {
    const result = await createRsvp(testInputNo);

    // Validate RSVP data
    expect(result.rsvp.response).toEqual('No');
    expect(result.rsvp.comment).toEqual('Unfortunately cannot attend');

    // Validate no wallet pass was generated
    expect(result.wallet_pass).toBeNull();
    expect(result.rsvp.wallet_pass_id).toBeNull();
    expect(result.rsvp.wallet_pass_url).toBeNull();
  });

  it('should save RSVP to database correctly', async () => {
    const result = await createRsvp(testInputYes);

    // Query database to verify RSVP was saved
    const rsvps = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.id, result.rsvp.id))
      .execute();

    expect(rsvps).toHaveLength(1);
    expect(rsvps[0].phone_number).toEqual('1234567890');
    expect(rsvps[0].first_name).toEqual('John');
    expect(rsvps[0].last_name).toEqual('Doe');
    expect(rsvps[0].response).toEqual('Yes');
    expect(rsvps[0].wallet_pass_id).toBeDefined();
    expect(rsvps[0].wallet_pass_url).toBeDefined();
  });

  it('should throw error for invalid reCAPTCHA token', async () => {
    const invalidInput = {
      ...testInputYes,
      recaptcha_token: 'invalid_token'
    };

    await expect(createRsvp(invalidInput)).rejects.toThrow(/reCAPTCHA verification failed/i);
  });

  it('should enforce unique phone number constraint', async () => {
    // Create first RSVP
    await createRsvp(testInputYes);

    // Try to create another RSVP with same phone number
    const duplicateInput = {
      ...testInputYes,
      first_name: 'Different',
      last_name: 'Person'
    };

    await expect(createRsvp(duplicateInput)).rejects.toThrow();
  });

  it('should handle null comment correctly', async () => {
    const inputWithNullComment = {
      ...testInputYes,
      comment: null
    };

    const result = await createRsvp(inputWithNullComment);

    expect(result.rsvp.comment).toBeNull();
  });

  it('should update database with wallet pass information', async () => {
    const result = await createRsvp(testInputYes);

    // Verify the database was updated with wallet pass info
    const updatedRsvp = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.id, result.rsvp.id))
      .execute();

    expect(updatedRsvp[0].wallet_pass_id).toEqual(result.wallet_pass!.pass_id);
    expect(updatedRsvp[0].wallet_pass_url).toEqual(result.wallet_pass!.pass_url);
  });

  it('should handle different device types correctly', async () => {
    const androidInput = { ...testInputYes, device_type: 'Android' as const };
    const otherInput = { ...testInputYes, device_type: 'Other' as const, phone_number: '1111111111' };

    const androidResult = await createRsvp(androidInput);
    const otherResult = await createRsvp(otherInput);

    // Both should generate wallet passes for Yes responses
    expect(androidResult.wallet_pass).not.toBeNull();
    expect(otherResult.wallet_pass).not.toBeNull();
    
    // Verify different pass IDs were generated
    expect(androidResult.wallet_pass!.pass_id).not.toEqual(otherResult.wallet_pass!.pass_id);
  });
});
