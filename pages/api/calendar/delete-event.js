import { getGoogleCalendarClient } from '../../../utils/googleCalendar';
import { db } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, eventId } = req.query;
    if (!userId || !eventId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const userDoc = await getDoc(doc(db, 'Users', userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    const calendar = await getGoogleCalendarClient(userDoc.data().googleCalendar.accessToken);
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });

    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
}