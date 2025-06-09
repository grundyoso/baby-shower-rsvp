
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rsvpsTable } from '../db/schema';
import { getRsvpByPhone } from '../handlers/get_rsvp_by_phone';

describe('getRsvpByPhone', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return RSVP when phone number exists', async () => {
    // Create test RSVP
    const testRsvp = {
      phone_number: '1234567890',
      first_name: 'John',
      last_name: 'Doe',
      response: 'Yes' as const,
      comment: 'Looking forward to it!',
      device_type: 'iPhone' as const
    };

    const insertResult = await db.insert(rsvpsTable)
      .values(testRsvp)
      .returning()
      .execute();

    const createdRsvp = insertResult[0];

    // Test the handler
    const result = await getRsvpByPhone('1234567890');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdRsvp.id);
    expect(result!.phone_number).toEqual('1234567890');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.response).toEqual('Yes');
    expect(result!.comment).toEqual('Looking forward to it!');
    expect(result!.device_type).toEqual('iPhone');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when phone number does not exist', async () => {
    const result = await getRsvpByPhone('9999999999');
    expect(result).toBeNull();
  });

  it('should handle RSVP with nullable fields', async () => {
    // Create RSVP with minimal required fields
    const testRsvp = {
      phone_number: '5555555555',
      first_name: 'Jane',
      last_name: 'Smith',
      response: 'No' as const,
      comment: null,
      device_type: null
    };

    await db.insert(rsvpsTable)
      .values(testRsvp)
      .returning()
      .execute();

    const result = await getRsvpByPhone('5555555555');

    expect(result).not.toBeNull();
    expect(result!.phone_number).toEqual('5555555555');
    expect(result!.first_name).toEqual('Jane');
    expect(result!.last_name).toEqual('Smith');
    expect(result!.response).toEqual('No');
    expect(result!.comment).toBeNull();
    expect(result!.device_type).toBeNull();
    expect(result!.wallet_pass_id).toBeNull();
    expect(result!.wallet_pass_url).toBeNull();
  });

  it('should return the first RSVP when phone number is unique', async () => {
    // Since phone_number has unique constraint, we can only have one per number
    const testRsvp = {
      phone_number: '7777777777',
      first_name: 'Bob',
      last_name: 'Johnson',
      response: 'Maybe' as const,
      comment: 'Will try to make it',
      device_type: 'Android' as const
    };

    await db.insert(rsvpsTable)
      .values(testRsvp)
      .returning()
      .execute();

    const result = await getRsvpByPhone('7777777777');

    expect(result).not.toBeNull();
    expect(result!.phone_number).toEqual('7777777777');
    expect(result!.first_name).toEqual('Bob');
    expect(result!.response).toEqual('Maybe');
  });

  it('should handle RSVP with wallet pass data', async () => {
    const testRsvp = {
      phone_number: '8888888888',
      first_name: 'Alice',
      last_name: 'Brown',
      response: 'Yes' as const,
      comment: 'Excited!',
      device_type: 'iPhone' as const,
      wallet_pass_id: 'pass123',
      wallet_pass_url: 'https://example.com/pass/123'
    };

    await db.insert(rsvpsTable)
      .values(testRsvp)
      .returning()
      .execute();

    const result = await getRsvpByPhone('8888888888');

    expect(result).not.toBeNull();
    expect(result!.wallet_pass_id).toEqual('pass123');
    expect(result!.wallet_pass_url).toEqual('https://example.com/pass/123');
  });
});
