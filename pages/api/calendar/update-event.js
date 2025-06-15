import { getGoogleCalendarClient, formatEventForGoogle } from '../../../utils/googleCalendar';
import { db } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, eventId, booking } = req.body;
    if (!userId || !eventId || !booking) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const userDoc = await getDoc(doc(db, 'Users', userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    const calendar = await getGoogleCalendarClient(userDoc.data().googleCalendar.accessToken);
    
    const event = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: formatEventForGoogle(booking)
    });

    res.status(200).json(event.data);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
}