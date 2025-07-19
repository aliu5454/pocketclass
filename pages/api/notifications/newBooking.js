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

  const { bookingId } = req.body;

  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required' });
  }

  try {
    console.log(`Processing new booking confirmation for booking: ${bookingId}`);

    // Get booking data
    const bookingRef = doc(db, "Bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = { id: bookingId, ...bookingSnap.data() };

    // Check if confirmation email already sent
    if (booking.newBookingEmailSent) {
      return res.status(200).json({ 
        success: true, 
        message: 'New booking confirmation email already sent',
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
      'newBooking'
    );

    if (!isAutomationEnabled) {
      return res.status(200).json({ 
        success: true, 
        message: 'New booking automation not enabled for this instructor',
        automationDisabled: true 
      });
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
      classDescription: classData.Description || `Join ${instructorData.firstName} for an amazing ${classData.Name} session.`,
      bookingId: booking.id,
      ...links
    };

    // Load email template
    const htmlContent = loadEmailTemplate('newBooking.html', templateData);
    
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
      `Booking Confirmed - ${classData.Name}`,
      htmlContent
    );

    if (emailResult.success) {
      // Mark email as sent
      await updateDoc(bookingRef, {
        newBookingEmailSent: true,
        newBookingEmailSentAt: new Date()
      });

      console.log(`New booking confirmation sent for booking ${bookingId}`);

      return res.status(200).json({
        success: true,
        message: 'New booking confirmation email sent successfully',
        emailsSent: emailResult.emailsSent || 1,
        recipients: emailResult.recipients,
        messageId: emailResult.messageId,
        partialSuccess: emailResult.partialSuccess || false
      });
    } else {
      console.error(`Failed to send new booking confirmation for ${bookingId}:`, emailResult.error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send new booking confirmation email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error in new booking confirmation handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send new booking confirmation',
      error: error.message
    });
  }
}
