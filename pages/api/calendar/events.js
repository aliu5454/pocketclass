import { getGoogleCalendarClient } from '../../../utils/googleCalendar';
import { refreshAccessToken } from '../../../utils/googleCalendar';
import { db } from '../../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user's calendar tokens
    const userDoc = await getDoc(doc(db, 'Users', userId));
    if (!userDoc.exists() || !userDoc.data().googleCalendar) {
      return res.status(404).json({ error: 'Calendar not connected' });
    }

    const userData = userDoc.data();
    let { accessToken, refreshToken } = userData.googleCalendar;

    try {
      // First try with current access token
      const calendar = await getGoogleCalendarClient(accessToken);
      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return res.status(200).json(events.data.items);
    } catch (error) {
      // If token expired, refresh and try again
      if (error.status === 401 && refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          
          // Update user document with new access token
          await updateDoc(doc(db, 'Users', userId), {
            'googleCalendar.accessToken': newAccessToken,
            'googleCalendar.updatedAt': new Date().toISOString(),
          });

          // Retry with new token
          const calendar = await getGoogleCalendarClient(newAccessToken);
          const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
          });

          return res.status(200).json(events.data.items);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return res.status(401).json({ error: 'Unable to refresh token' });
        }
      }

      console.error('Error fetching events:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }
  } catch (error) {
    console.error('Error in handler:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}