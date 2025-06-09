
import { db } from '../db';
import { rsvpsTable } from '../db/schema';
import { type Rsvp } from '../schema';
import { eq } from 'drizzle-orm';

export const getRsvpByPhone = async (phoneNumber: string): Promise<Rsvp | null> => {
  try {
    const results = await db.select()
      .from(rsvpsTable)
      .where(eq(rsvpsTable.phone_number, phoneNumber))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Failed to get RSVP by phone:', error);
    throw error;
  }
};
