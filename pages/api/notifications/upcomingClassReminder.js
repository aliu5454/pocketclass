import { 
  getUserData, 
  getClassData, 
  getBookingData,
  checkAutomationEnabled,
  loadEmailTemplate,
  sendEmail,
  sendEmailToBookingRecipients,
  formatDateTime,
  generateBookingLinks
} from './notificationService';
import { db } from '../../../firebaseConfig';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import moment from 'moment-timezone';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('Starting upcoming class reminder process...');

    // Get all confirmed bookings
    const bookingsRef = collection(db, "Bookings");
    const q = query(bookingsRef, where("status", "==", "Confirmed"));
    const bookingsSnapshot = await getDocs(q);
    
    const bookings = bookingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Found ${bookings.length} confirmed bookings`);

    // Filter bookings that need 24-hour reminders
    const bookingsNeedingReminders = bookings.filter((booking) => {
      const startTime = moment(booking.startTime).tz(booking.timezone || "America/Toronto", true);
      const now = moment().tz(booking.timezone || "America/Toronto");
      const reminderTime = moment().tz(booking.timezone || "America/Toronto").add(24, "hours");
      
      return (
        booking.status === "Confirmed" &&
        startTime.isSameOrBefore(reminderTime) &&
        startTime.isAfter(now) &&
        !booking.upcomingReminderSent
      );
    });

    console.log(`Found ${bookingsNeedingReminders.length} bookings needing 24-hour reminders`);

    let emailsSent = 0;
    const emailPromises = [];

    for (const booking of bookingsNeedingReminders) {
      try {
        // Get student, instructor, and class data
        const [studentData, instructorData, classData] = await Promise.all([
          getUserData(booking.student_id),
          getUserData(booking.instructor_id),
          getClassData(booking.class_id)
        ]);

        if (!studentData || !instructorData || !classData) {
          console.log(`Missing data for booking ${booking.id}, skipping...`);
          continue;
        }

        // Check if instructor has this automation enabled
        const isAutomationEnabled = await checkAutomationEnabled(
          booking.instructor_id, 
          'reminders', 
          'upcomingClass'
        );

        if (!isAutomationEnabled) {
          console.log(`Automation not enabled for instructor ${booking.instructor_id}, skipping...`);
          continue;
        }

        // Format date and time
        const { date: classDate, time: classTime } = formatDateTime(
          booking.startTime, 
          booking.timezone
        );

        // Generate booking links
        const links = generateBookingLinks(booking.student_id, booking.id);

        // Prepare template data
        const templateData = {
          studentFirstName: studentData.firstName,
          studentLastName: studentData.lastName,
          instructorFirstName: instructorData.firstName,
          instructorLastName: instructorData.lastName,
          className: classData.Name,
          classDate: classDate,
          classTime: classTime,
          classDuration: `${classData.Duration || 60} minutes`,
          classLocation: classData.Location || 'Online',
          bookingId: booking.id,
          timezone: booking.timezone || 'EST',
          ...links
        };

        // Load email template
        const htmlContent = loadEmailTemplate('upcomingClassReminder.html', templateData);
        
        if (!htmlContent) {
          console.error(`Failed to load template for booking ${booking.id}`);
          continue;
        }

        // Send email to all booking recipients (student + group emails)
        const emailPromise = sendEmailToBookingRecipients(
          booking,
          studentData,
          `Upcoming Class Reminder - ${classData.Name}`,
          htmlContent
        ).then(async (result) => {
          if (result.success) {
            // Mark reminder as sent
            await updateDoc(doc(db, "Bookings", booking.id), {
              upcomingReminderSent: true,
              upcomingReminderSentAt: new Date()
            });
            emailsSent += (result.emailsSent || 1);
            console.log(`24-hour reminder sent for booking ${booking.id} to ${result.emailsSent || 1} recipient(s)`);
          } else {
            console.error(`Failed to send reminder for booking ${booking.id}:`, result.error);
          }
          return result;
        });

        emailPromises.push(emailPromise);

      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
      }
    }

    // Wait for all emails to be processed
    await Promise.all(emailPromises);

    console.log(`Upcoming class reminder process completed. Sent ${emailsSent} emails.`);

    return res.status(200).json({
      success: true,
      message: `Sent ${emailsSent} upcoming class reminder emails`,
      emailsSent,
      totalBookingsProcessed: bookingsNeedingReminders.length
    });

  } catch (error) {
    console.error('Error in upcoming class reminder handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send upcoming class reminders',
      error: error.message
    });
  }
}
