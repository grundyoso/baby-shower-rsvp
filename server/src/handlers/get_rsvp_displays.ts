
import { db } from '../db';
import { rsvpsTable } from '../db/schema';
import { type RsvpDisplay } from '../schema';

export const getRsvpDisplays = async (): Promise<RsvpDisplay[]> => {
  try {
    // Get all RSVPs from the database
    const rsvps = await db.select()
      .from(rsvpsTable)
      .execute();

    // Transform to display format with last name initial
    return rsvps.map(rsvp => ({
      first_name: rsvp.first_name,
      last_name_initial: rsvp.last_name.charAt(0).toUpperCase() + '.',
      comment: rsvp.comment
    }));
  } catch (error) {
    console.error('Failed to get RSVP displays:', error);
    throw error;
  }
};
