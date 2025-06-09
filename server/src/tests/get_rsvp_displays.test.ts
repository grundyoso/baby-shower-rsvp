
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { rsvpsTable } from '../db/schema';
import { getRsvpDisplays } from '../handlers/get_rsvp_displays';

describe('getRsvpDisplays', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no RSVPs exist', async () => {
    const result = await getRsvpDisplays();
    expect(result).toEqual([]);
  });

  it('should transform single RSVP to display format', async () => {
    // Create test RSVP
    await db.insert(rsvpsTable).values({
      phone_number: '1234567890',
      first_name: 'John',
      last_name: 'Smith',
      response: 'Yes',
      comment: 'Looking forward to it!',
      device_type: 'iPhone'
    }).execute();

    const result = await getRsvpDisplays();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      first_name: 'John',
      last_name_initial: 'S.',
      comment: 'Looking forward to it!'
    });
  });

  it('should handle multiple RSVPs correctly', async () => {
    // Create multiple test RSVPs
    await db.insert(rsvpsTable).values([
      {
        phone_number: '1111111111',
        first_name: 'Alice',
        last_name: 'Johnson',
        response: 'Yes',
        comment: 'Excited!',
        device_type: 'Android'
      },
      {
        phone_number: '2222222222',
        first_name: 'Bob',
        last_name: 'williams',
        response: 'Maybe',
        comment: null,
        device_type: 'Other'
      },
      {
        phone_number: '3333333333',
        first_name: 'Carol',
        last_name: 'Davis',
        response: 'No',
        comment: 'Sorry, can\'t make it',
        device_type: null
      }
    ]).execute();

    const result = await getRsvpDisplays();

    expect(result).toHaveLength(3);
    
    // Check Alice
    expect(result[0]).toEqual({
      first_name: 'Alice',
      last_name_initial: 'J.',
      comment: 'Excited!'
    });
    
    // Check Bob - lowercase last name should be capitalized
    expect(result[1]).toEqual({
      first_name: 'Bob',
      last_name_initial: 'W.',
      comment: null
    });
    
    // Check Carol
    expect(result[2]).toEqual({
      first_name: 'Carol',
      last_name_initial: 'D.',
      comment: 'Sorry, can\'t make it'
    });
  });

  it('should handle null comments correctly', async () => {
    await db.insert(rsvpsTable).values({
      phone_number: '5555555555',
      first_name: 'David',
      last_name: 'Brown',
      response: 'Maybe',
      comment: null,
      device_type: 'iPhone'
    }).execute();

    const result = await getRsvpDisplays();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      first_name: 'David',
      last_name_initial: 'B.',
      comment: null
    });
  });

  it('should handle empty string last names', async () => {
    await db.insert(rsvpsTable).values({
      phone_number: '6666666666',
      first_name: 'Emma',
      last_name: 'a',
      response: 'Yes',
      comment: 'See you there!',
      device_type: 'Android'
    }).execute();

    const result = await getRsvpDisplays();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      first_name: 'Emma',
      last_name_initial: 'A.',
      comment: 'See you there!'
    });
  });

  it('should preserve order of RSVPs as returned from database', async () => {
    const rsvps = [
      {
        phone_number: '1111111111',
        first_name: 'First',
        last_name: 'Person',
        response: 'Yes' as const,
        comment: 'Comment 1',
        device_type: 'iPhone' as const
      },
      {
        phone_number: '2222222222',
        first_name: 'Second',
        last_name: 'Person',
        response: 'Maybe' as const,
        comment: 'Comment 2',
        device_type: 'Android' as const
      }
    ];

    // Insert in specific order
    for (const rsvp of rsvps) {
      await db.insert(rsvpsTable).values(rsvp).execute();
    }

    const result = await getRsvpDisplays();

    expect(result).toHaveLength(2);
    expect(result[0].first_name).toEqual('First');
    expect(result[1].first_name).toEqual('Second');
  });
});
