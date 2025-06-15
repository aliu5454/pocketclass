import {
  getGoogleCalendarClient,
  refreshAccessToken,
} from "../../../utils/googleCalendar";
import { db } from "../../../firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import moment from "moment-timezone";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { instructorId, userEmails, classId, start, end, timeZone = "America/Toronto" } = req.body;
    if (
      !instructorId ||
      !Array.isArray(userEmails) ||
      userEmails.length === 0 ||
      !classId ||
      !start ||
      !end
    ) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const userDoc = await getDoc(doc(db, "Users", instructorId));
    if (!userDoc.exists() || !userDoc.data().googleCalendar) {
      return res.status(404).json({ error: "Instructor or calendar not found" });
    }

    let { accessToken, refreshToken } = userDoc.data().googleCalendar;
    const instructorEmail = userDoc.data().email;

    async function findAndUpdateOrDelete(calendar) {
      const timeMin = moment.tz(start, timeZone).startOf("minute").format();
      const timeMax = moment.tz(end, timeZone).endOf("minute").format();

      const events = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        singleEvents: true,
        timeZone,
      });

      const event = events.data.items.find(
        (ev) =>
          ev.extendedProperties?.private?.classId === classId &&
          moment.tz(ev.start.dateTime, timeZone).isSame(
            moment.tz(start, timeZone),
            "minute"
          )
      );

      if (!event) return { deleted: false, message: "Event not found" };

      // Filter attendees to only those who are not in userEmails
      const attendees = event.attendees || [];
      const filteredAttendees = attendees.filter(
        (attendee) => !userEmails.includes(attendee.email)
      );
      
      if (filteredAttendees.length === 0 || 
          (filteredAttendees.length === 1 && filteredAttendees[0].email === instructorEmail)) {
        // No attendees left, delete the event
        await calendar.events.delete({
          calendarId: "primary",
          eventId: event.id,
        });
        return { deleted: true, eventId: event.id };
      } else {
        // Update event with filtered attendees
        const updated = await calendar.events.patch({
          calendarId: "primary",
          eventId: event.id,
          requestBody: {
            attendees: filteredAttendees,
          },
        });
        return { deleted: false, event: updated.data };
      }
    }

    try {
      const calendar = await getGoogleCalendarClient(accessToken);
      const result = await findAndUpdateOrDelete(calendar);
      return res.status(200).json(result);
    } catch (error) {
      // Handle token expiration
      if (error.status === 401 && refreshToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          await updateDoc(doc(db, "Users", instructorId), {
            "googleCalendar.accessToken": newAccessToken,
            "googleCalendar.updatedAt": new Date().toISOString(),
          });
          const calendar = await getGoogleCalendarClient(newAccessToken);
          const result = await findAndUpdateOrDelete(calendar);
          return res.status(200).json(result);
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          return res.status(401).json({ error: "Unable to refresh token" });
        }
      }
      console.error("Error deleting event:", error);
      return res.status(500).json({ error: "Failed to delete event" });
    }
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
}