import { google } from 'googleapis';
import moment from 'moment-timezone';

export const getGoogleCalendarClient = async (accessToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

export const formatEventForGoogle = (booking, timeZone="America/Toronto") => {
  // Convert dates to specified timezone and format properly
  const startDateTime = moment.tz(booking.start, timeZone)
    .format('YYYY-MM-DDTHH:mm:ss');
  const endDateTime = moment.tz(booking.end, timeZone)
    .format('YYYY-MM-DDTHH:mm:ss');

  return {
    summary: `Pocketclass: ${booking.title}`,
    description: `Class ID: ${booking.class}`,
    start: {
      dateTime: startDateTime,
      timeZone: timeZone
    },
    end: {
      dateTime: endDateTime,
      timeZone: timeZone
    },
    attendees: [{ email: booking.userEmail }],
    conferenceData: booking.meetingLink ? {
      createRequest: {
        requestId: `${booking.class}-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    } : undefined,
    extendedProperties: {
      private: {
        classId: booking.class
      }
    }
  };
};

export const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to refresh token');
    }

    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};