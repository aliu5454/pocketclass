import { getGoogleCalendarClient } from '../../../utils/googleCalendar';
import { db } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, startTime, endTime, classId } = req.body;
    if (!userId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const userDoc = await getDoc(doc(db, 'Users', userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }

    const calendar = await getGoogleCalendarClient(userDoc.data().googleCalendar.accessToken);
    
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date(startTime).toISOString(),
      timeMax: new Date(endTime).toISOString(),
      singleEvents: true,
    });

    const conflicts = events.data.items.filter(event => {
      // If it's the same class, it's not a conflict
      if (event.extendedProperties?.private?.classId === classId) {
        return false;
      }
     
      
      return true;
    });

    res.status(200).json({ 
      available: conflicts.length === 0,
      conflicts: conflicts
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
}