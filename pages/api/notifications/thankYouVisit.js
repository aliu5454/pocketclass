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
    console.log(`Processing thank you notification for booking: ${bookingId}`);

    // Get booking data
    const bookingRef = doc(db, "Bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = { id: bookingId, ...bookingSnap.data() };

    // Check if thank you email already sent
    if (booking.thankYouEmailSent) {
      return res.status(200).json({ 
        success: true, 
        message: 'Thank you email already sent',
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
      'engagement', 
      'thankYouVisit'
    );

    if (!isAutomationEnabled) {
      return res.status(200).json({ 
        success: true, 
        message: 'Thank you automation not enabled for this instructor',
        automationDisabled: true 
      });
    }

    // Format date
    const { date: classDate } = formatDateTime(booking.startTime, booking.timezone);

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
      classDuration: `${classData.Duration || 60} minutes`,
      bookingId: booking.id,
      reviewLink: `${process.env.NODE_ENV === 'production' ? 'https://www.pocketclass.ca' : 'http://localhost:3000'}/review?bookingId=${bookingId}&instructorId=${booking.instructor_id}`,
      bookAgainLink: `${process.env.NODE_ENV === 'production' ? 'https://www.pocketclass.ca' : 'http://localhost:3000'}/instructor/${booking.instructor_id}`,
      ...links
    };

    // Load email template
    const htmlContent = loadEmailTemplate('thankYouVisit.html', templateData);
    
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
      `Thank You for Attending - ${classData.Name}`,
      htmlContent
    );

    if (emailResult.success) {
      // Mark email as sent
      await updateDoc(bookingRef, {
        thankYouEmailSent: true,
        thankYouEmailSentAt: new Date()
      });

      console.log(`Thank you notification sent for booking ${bookingId}`);

      return res.status(200).json({
        success: true,
        message: 'Thank you notification email sent successfully',
        emailsSent: emailResult.emailsSent || 1,
        recipients: emailResult.recipients,
        messageId: emailResult.messageId,
        partialSuccess: emailResult.partialSuccess || false
      });
    } else {
      console.error(`Failed to send thank you notification for ${bookingId}:`, emailResult.error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send thank you notification email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error in thank you notification handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send thank you notification',
      error: error.message
    });
  }
}
