import { 
  getUserData, 
  getClassData, 
  checkAutomationEnabled,
  loadEmailTemplate,
  sendEmail,
  sendEmailToBookingRecipients,
  formatDateTime,
  generateBookingLinks
} from './notificationService';
import { db } from '../../../firebaseConfig';
import { updateDoc, doc, getDoc } from 'firebase/firestore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { bookingId, oldStartTime, newStartTime } = req.body;

  if (!bookingId || !oldStartTime || !newStartTime) {
    return res.status(400).json({ 
      success: false, 
      message: 'Booking ID, old start time, and new start time are required' 
    });
  }

  try {
    console.log(`Processing reschedule notification for booking: ${bookingId}`);

    // Get booking data
    const bookingRef = doc(db, "Bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = { id: bookingId, ...bookingSnap.data() };

    // Check if reschedule email already sent for this specific reschedule
    const rescheduleKey = `${oldStartTime}_${newStartTime}`;
    if (booking.rescheduleEmailSent && booking.lastRescheduleKey === rescheduleKey) {
      return res.status(200).json({ 
        success: true, 
        message: 'Reschedule email already sent for this specific reschedule',
        alreadySent: true 
      });
    }

    // Get student, instructor, and class data
    const [studentData, instructorData, classData] = await Promise.all([
      getUserData(booking.student_id),
      getUserData(booking.instructor_id),
      getClassData(booking.class_id)
    ]);

    if (!studentData || !instructorData || !classData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required data (student, instructor, or class)' 
      });
    }

    // Check if instructor has this automation enabled
    const isAutomationEnabled = await checkAutomationEnabled(
      booking.instructor_id, 
      'classUpdates', 
      'rescheduled'
    );

    if (!isAutomationEnabled) {
      return res.status(200).json({ 
        success: true, 
        message: 'Reschedule automation not enabled for this instructor',
        automationDisabled: true 
      });
    }

    // Format dates and times
    const oldDateTime = formatDateTime(oldStartTime, booking.timezone);
    const newDateTime = formatDateTime(newStartTime, booking.timezone);

    // Generate booking links
    const links = generateBookingLinks(booking.student_id, booking.id);

    // Prepare template data
    const templateData = {
      studentFirstName: studentData.firstName,
      studentLastName: studentData.lastName,
      instructorFirstName: instructorData.firstName,
      instructorLastName: instructorData.lastName,
      className: classData.Name,
      oldClassDate: oldDateTime.date,
      oldClassTime: oldDateTime.time,
      newClassDate: newDateTime.date,
      newClassTime: newDateTime.time,
      classDuration: `${classData.Duration || 60} minutes`,
      classLocation: classData.Location || 'Online',
      bookingId: booking.id,
      ...links
    };

    // Load email template
    const htmlContent = loadEmailTemplate('rescheduled.html', templateData);
    
    if (!htmlContent) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load email template' 
      });
    }

    // Send email to all booking recipients (student + group emails)
    const emailResult = await sendEmailToBookingRecipients(
      booking,
      studentData,
      `Class Rescheduled - ${classData.Name}`,
      htmlContent
    );

    if (emailResult.success) {
      // Mark email as sent with unique reschedule tracking
      await updateDoc(bookingRef, {
        rescheduleEmailSent: true,
        rescheduleEmailSentAt: new Date(),
        lastRescheduleKey: rescheduleKey,
        rescheduledFromTime: oldStartTime,
        rescheduledToTime: newStartTime
      });

      console.log(`Reschedule notification sent for booking ${bookingId}`);

      return res.status(200).json({
        success: true,
        message: 'Reschedule notification email sent successfully',
        emailsSent: emailResult.emailsSent || 1,
        recipients: emailResult.recipients,
        messageId: emailResult.messageId,
        partialSuccess: emailResult.partialSuccess || false
      });
    } else {
      console.error(`Failed to send reschedule notification for ${bookingId}:`, emailResult.error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send reschedule notification email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error in reschedule notification handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send reschedule notification',
      error: error.message
    });
  }
}
