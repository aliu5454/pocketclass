import {
  getGoogleCalendarClient,
  formatEventForGoogle,
  refreshAccessToken,
} from "../../../utils/googleCalendar";
import { db } from "../../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import moment from "moment-timezone";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, booking, timeZone = "America/Toronto" } = req.body;
    if (!userId || !booking) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const userDoc = await getDoc(doc(db, "Users", userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    let { accessToken, refreshToken } = userData.googleCalendar;

    try {
      const calendar = await getGoogleCalendarClient(accessToken);

      // Convert dates to timezone for checking existing events
      const startTime = moment.tz(booking.start, timeZone).format();
      const endTime = moment.tz(booking.end, timeZone).format();

      const existingEvents = await calendar.events.list({
        calendarId: "primary",
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
        timeZone: timeZone,
      });

      const existingClassEvent = existingEvents.data.items.find(
        (event) => event.extendedProperties?.private?.classId === booking.class
      );

      if (existingClassEvent) {
        const existingAttendees = existingClassEvent.attendees || [];
        const newAttendees = booking.userEmails.map((email) => ({ email }));

        // Filter out duplicates
        const uniqueAttendees = [...existingAttendees, ...newAttendees].filter(
          (attendee, index, self) =>
            index === self.findIndex((a) => a.email === attendee.email)
        );
        // Add user as attendee to existing event
        const updatedEvent = await calendar.events.patch({
          calendarId: "primary",
          eventId: existingClassEvent.id,
          requestBody: {
            attendees: uniqueAttendees,
          },
          timeZone: timeZone,
        });
        return res.status(200).json(updatedEvent.data);
      }

      // Create new event with timezone
      const eventData = {
        summary: booking.title || "PocketClass Session",
        description: `Class ID: ${booking.class}`,
        start: {
          dateTime: moment
            .tz(booking.start, timeZone)
            .format("YYYY-MM-DDTHH:mm:ss"),
          timeZone: timeZone,
        },
        end: {
          dateTime: moment
            .tz(booking.end, timeZone)
            .format("YYYY-MM-DDTHH:mm:ss"),
          timeZone: timeZone,
        },
        attendees: booking.userEmails.map((email) => ({ email })),
        extendedProperties: {
          private: {
            classId: booking.class,
          },
        },
      };

      if (booking.meetingLink) {
        eventData.conferenceData = {
          createRequest: {
            requestId: `${booking.class}-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      const event = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventData,
        conferenceDataVersion: booking.meetingLink ? 1 : 0,
      });

      return res.status(200).json(event.data);
    } catch (error) {
      // If token expired, refresh and try again
      if (error.status === 401 && refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);

          // Update user document with new access token
          await updateDoc(doc(db, "Users", userId), {
            "googleCalendar.accessToken": newAccessToken,
            "googleCalendar.updatedAt": new Date().toISOString(),
          });

          // Retry with new token
          const calendar = await getGoogleCalendarClient(newAccessToken);

          // Check existing events again with new token using timezone
          const existingEvents = await calendar.events.list({
            calendarId: "primary",
            timeMin: moment.tz(booking.start, timeZone).format(),
            timeMax: moment.tz(booking.end, timeZone).format(),
            singleEvents: true,
            timeZone: timeZone,
          });

          const existingClassEvent = existingEvents.data.items.find(
            (event) =>
              event.extendedProperties?.private?.classId === booking.class
          );

          if (existingClassEvent) {
            const existingAttendees = existingClassEvent.attendees || [];
            const newAttendees = booking.userEmails.map((email) => ({ email }));
            // Filter out duplicates
            const uniqueAttendees = [
              ...existingAttendees,
              ...newAttendees,
            ].filter(
              (attendee, index, self) =>
                index === self.findIndex((a) => a.email === attendee.email)
            );
            const updatedEvent = await calendar.events.patch({
              calendarId: "primary",
              eventId: existingClassEvent.id,
              requestBody: {
                attendees: uniqueAttendees,
              },
              timeZone: timeZone,
            });
            return res.status(200).json(updatedEvent.data);
          }

          // Create new event with new token and timezone
          const eventData = {
            summary: booking.title || "PocketClass Session",
            description: `Class ID: ${booking.class}`,
            start: {
              dateTime: moment
                .tz(booking.start, timeZone)
                .format("YYYY-MM-DDTHH:mm:ss"),
              timeZone: timeZone,
            },
            end: {
              dateTime: moment
                .tz(booking.end, timeZone)
                .format("YYYY-MM-DDTHH:mm:ss"),
              timeZone: timeZone,
            },
            attendees: booking.userEmails.map((email) => ({ email })),
            extendedProperties: {
              private: {
                classId: booking.class,
              },
            },
          };

          if (booking.meetingLink) {
            eventData.conferenceData = {
              createRequest: {
                requestId: `${booking.class}-${Date.now()}`,
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            };
          }

          const event = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventData,
            conferenceDataVersion: booking.meetingLink ? 1 : 0,
          });

          return res.status(200).json(event.data);
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          return res.status(401).json({ error: "Unable to refresh token" });
        }
      }

      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Failed to create event" });
    }
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
}
