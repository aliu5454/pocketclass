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
    console.log(`Processing welcome new student notification for booking: ${bookingId}`);

    // Get booking data
    const bookingRef = doc(db, "Bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = { id: bookingId, ...bookingSnap.data() };

    // Check if welcome email already sent
    if (booking.welcomeNewStudentEmailSent) {
      return res.status(200).json({ 
        success: true, 
        message: 'Welcome new student email already sent',
        alreadySent: true 
      });
    }

    // Only send this for completed classes (student actually attended)
    if (booking.status !== 'Completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Welcome email only sent after class completion' 
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

    // Check if this was the student's first class (completed)
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const bookingsRef = collection(db, "Bookings");
    const studentBookingsQuery = query(
      bookingsRef,
      where("student_id", "==", booking.student_id),
      where("status", "==", "Completed")
    );
    const studentBookingsSnapshot = await getDocs(studentBookingsQuery);
    
    if (studentBookingsSnapshot.size > 1) {
      // Not their first completed class
      return res.status(200).json({ 
        success: true, 
        message: 'Student has completed classes before, welcome email not needed',
        notFirstClass: true 
      });
    }

    // Check if instructor has this automation enabled
    const isAutomationEnabled = await checkAutomationEnabled(
      booking.instructor_id, 
      'milestones', 
      'welcomeNew'
    );

    if (!isAutomationEnabled) {
      return res.status(200).json({ 
        success: true, 
        message: 'Welcome new student automation not enabled for this instructor',
        automationDisabled: true 
      });
    }

    // Format join date (today since they just completed their first class)
    const joinDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Generate booking links
    const links = generateBookingLinks(booking.student_id, booking.id);

    // Prepare template data
    const templateData = {
      studentFirstName: studentData.firstName,
      studentLastName: studentData.lastName,
      instructorFirstName: instructorData.firstName,
      instructorLastName: instructorData.lastName,
      firstClassName: classData.Name,
      className: classData.Name,
      joinDate: joinDate,
      helpCenterLink: `${process.env.NODE_ENV === 'production' ? 'https://www.pocketclass.ca' : 'http://localhost:3000'}/help`,
      contactLink: `${process.env.NODE_ENV === 'production' ? 'https://www.pocketclass.ca' : 'http://localhost:3000'}/support`,
      ...links
    };

    // Load email template
    const htmlContent = loadEmailTemplate('welcomeNew.html', templateData);
    
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
      `Welcome to PocketClass, ${studentData.firstName}! 🎉`,
      htmlContent,
      `${instructorData.firstName} from PocketClass`
    );

    if (emailResult.success) {
      // Mark email as sent
      await updateDoc(bookingRef, {
        welcomeNewStudentEmailSent: true,
        welcomeNewStudentEmailSentAt: new Date()
      });

      console.log(`Welcome new student notification sent for booking ${bookingId}`);

      return res.status(200).json({
        success: true,
        message: 'Welcome new student notification email sent successfully',
        emailsSent: emailResult.emailsSent || 1,
        recipients: emailResult.recipients,
        messageId: emailResult.messageId,
        partialSuccess: emailResult.partialSuccess || false
      });
    } else {
      console.error(`Failed to send welcome new student notification for ${bookingId}:`, emailResult.error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send welcome new student notification email',
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error('Error in welcome new student notification handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send welcome new student notification',
      error: error.message
    });
  }
}
