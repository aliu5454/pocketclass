import { 
  getUserData, 
  checkAutomationEnabled,
  loadEmailTemplate,
  sendEmail,
  generateBookingLinks
} from './notificationService';
import { db } from '../../../firebaseConfig';
import { collection, getDocs, query, where, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import moment from 'moment-timezone';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    console.log('Starting birthday special process...');

    // Get today's date
    const today = moment();
    const todayMonth = today.format('MM');
    const todayDay = today.format('DD');

    // Get all users
    const usersRef = collection(db, "Users");
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Found ${users.length} total users`);

    let emailsSent = 0;
    const emailPromises = [];

    for (const user of users) {
      try {
        // Skip if user is an instructor, doesn't have email, or doesn't have birthday
        if (user.isInstructor || !user.email || !user.dateOfBirth) {
          continue;
        }

        // Check if today is their birthday
        const userBirthday = moment(user.dateOfBirth);
        const birthdayMonth = userBirthday.format('MM');
        const birthdayDay = userBirthday.format('DD');

        if (birthdayMonth !== todayMonth || birthdayDay !== todayDay) {
          continue; // Not their birthday today
        }

        // Check if we already sent birthday email this year
        if (user.lastBirthdayEmailYear === today.year()) {
          continue; // Already sent this year
        }

        // Get user's favorite instructor (most recent booking)
        const bookingsRef = collection(db, "Bookings");
        const q = query(
          bookingsRef, 
          where("student_id", "==", user.id),
          where("status", "==", "Completed"),
          orderBy("startTime", "desc"),
          limit(1)
        );
        const userBookingsSnapshot = await getDocs(q);
        
        let preferredInstructorData = null;
        let instructorWithAutomation = null;

        if (!userBookingsSnapshot.empty) {
          const lastBooking = userBookingsSnapshot.docs[0].data();
          preferredInstructorData = await getUserData(lastBooking.instructor_id);
          
          // Check if this instructor has birthday automation enabled
          const isAutomationEnabled = await checkAutomationEnabled(
            lastBooking.instructor_id, 
            'bookingBoost', 
            'birthdaySpecial'
          );
          
          if (isAutomationEnabled) {
            instructorWithAutomation = preferredInstructorData;
          }
        }

        // If preferred instructor doesn't have automation, find any instructor with automation enabled
        if (!instructorWithAutomation) {
          // Get all instructors
          const instructorsQuery = query(usersRef, where("isInstructor", "==", true));
          const instructorsSnapshot = await getDocs(instructorsQuery);
          
          for (const instructorDoc of instructorsSnapshot.docs) {
            const instructorData = instructorDoc.data();
            const isAutomationEnabled = await checkAutomationEnabled(
              instructorDoc.id, 
              'bookingBoost', 
              'birthdaySpecial'
            );
            
            if (isAutomationEnabled) {
              instructorWithAutomation = { id: instructorDoc.id, ...instructorData };
              break;
            }
          }
        }

        if (!instructorWithAutomation) {
          continue; // No instructor with birthday automation enabled
        }

        // Generate booking links
        const links = generateBookingLinks(user.id, null);

        // Prepare template data
        const templateData = {
          studentFirstName: user.firstName,
          studentLastName: user.lastName,
          preferredInstructorName: preferredInstructorData ? 
            `${preferredInstructorData.firstName} ${preferredInstructorData.lastName}` : 
            `${instructorWithAutomation.firstName} ${instructorWithAutomation.lastName}`,
          ...links
        };

        // Load email template
        const htmlContent = loadEmailTemplate('birthdaySpecial.html', templateData);
        
        if (!htmlContent) {
          console.error(`Failed to load template for user ${user.id}`);
          continue;
        }

        // Send email
        const emailPromise = sendEmail(
          user.email,
          `🎉 Happy Birthday ${user.firstName}! Special Gift Inside`,
          htmlContent,
          instructorWithAutomation.firstName ? 
            `${instructorWithAutomation.firstName} from PocketClass` : 
            "PocketClass"
        ).then(async (result) => {
          if (result.success) {
            // Mark birthday email as sent this year
            await updateDoc(doc(db, "Users", user.id), {
              lastBirthdayEmailYear: today.year(),
              lastBirthdayEmailSentAt: new Date()
            });
            emailsSent++;
            console.log(`Birthday special sent to user ${user.id}`);
          } else {
            console.error(`Failed to send birthday special to ${user.id}:`, result.error);
          }
          return result;
        });

        emailPromises.push(emailPromise);

      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
      }
    }

    // Wait for all emails to be processed
    await Promise.all(emailPromises);

    console.log(`Birthday special process completed. Sent ${emailsSent} emails.`);

    return res.status(200).json({
      success: true,
      message: `Sent ${emailsSent} birthday special emails`,
      emailsSent,
      totalUsersProcessed: users.length
    });

  } catch (error) {
    console.error('Error in birthday special handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send birthday special emails',
      error: error.message
    });
  }
}
