import { db } from '../../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Helper function to convert Firestore Timestamp to Date
const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  
  // Handle Firestore Timestamp objects
  if (timestamp.seconds && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }
  
  // Handle Date objects
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Handle ISO strings
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  // Handle timestamp objects with toDate method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  return null;
};

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASS,
    },
    port: 465,
    host: "smtp.gmail.com",
  });
};

// Get user data
export const getUserData = async (userId) => {
  try {
    const docRef = doc(db, "Users", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

// Get class data
export const getClassData = async (classId) => {
  try {
    const docRef = doc(db, "classes", classId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching class data:', error);
    return null;
  }
};

// Get booking data
export const getBookingData = async (bookingId) => {
  try {
    const docRef = doc(db, "Bookings", bookingId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: bookingId, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching booking data:', error);
    return null;
  }
};

// Check if automation is enabled for instructor
export const checkAutomationEnabled = async (instructorId, category, automationType) => {
  try {
    const instructorData = await getUserData(instructorId);
    if (!instructorData) return false;
    
    // Check if instructor has premium for non-reminder automations
    if (category !== 'reminders') {
      const today = new Date();
      const premiumExpire = timestampToDate(instructorData.premiumExpire);
      
      if (!premiumExpire || premiumExpire < today) {
        return false;
      }
    }
    
    // Check if automation is enabled
    return instructorData.automations?.[category]?.[automationType]?.enabled || false;
  } catch (error) {
    console.error('Error checking automation status:', error);
    return false;
  }
};

// Load and populate email template
export const loadEmailTemplate = (templateFile, templateData) => {
  try {
    const templatePath = path.join(process.cwd(), 'email-templates', templateFile);
    
    if (!fs.existsSync(templatePath)) {
      console.error('Template not found:', templateFile);
      return null;
    }

    let templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Replace template variables
    Object.keys(templateData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      templateContent = templateContent.replace(regex, templateData[key] || '');
    });

    return templateContent;
  } catch (error) {
    console.error('Error loading email template:', error);
    return null;
  }
};

// Send email
export const sendEmail = async (to, subject, htmlContent, fromName = "PocketClass") => {
  try {
    const transporter = createTransporter();
    
    const message = {
      from: `${fromName} <contact.pocketclass@gmail.com>`,
      to: to,
      subject: subject,
      html: htmlContent,
    };

    const result = await transporter.sendMail(message);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send email to group (handles both individual and group bookings)
export const sendEmailToBookingRecipients = async (booking, studentData, subject, htmlContent, fromName = "PocketClass") => {
  try {
    const emails = [];
    
    // Always include the primary student email
    if (studentData?.email) {
      emails.push(studentData.email);
    }
    
    // Add group emails if they exist and are different from primary email
    if (booking.groupEmails && Array.isArray(booking.groupEmails)) {
      booking.groupEmails.forEach(email => {
        if (email && email.trim() && !emails.includes(email.trim())) {
          emails.push(email.trim());
        }
      });
    }
    
    if (emails.length === 0) {
      console.error('No valid email addresses found for booking:', booking.id);
      return { success: false, error: 'No valid email addresses found' };
    }
    
    console.log(`Sending email to ${emails.length} recipient(s) for booking ${booking.id}:`, emails);
    
    const transporter = createTransporter();
    const emailPromises = [];
    const results = [];
    
    for (const email of emails) {
      const message = {
        from: `${fromName} <contact.pocketclass@gmail.com>`,
        to: email,
        subject: subject,
        html: htmlContent,
      };
      
      const emailPromise = transporter.sendMail(message)
        .then(result => {
          console.log(`Email sent successfully to ${email}:`, result.messageId);
          results.push({ email, success: true, messageId: result.messageId });
          return result;
        })
        .catch(error => {
          console.error(`Error sending email to ${email}:`, error);
          results.push({ email, success: false, error: error.message });
          throw error;
        });
      
      emailPromises.push(emailPromise);
    }
    
    try {
      await Promise.all(emailPromises);
      
      return { 
        success: true, 
        emailsSent: emails.length,
        recipients: emails,
        results: results.filter(r => r.success),
        messageId: results.find(r => r.success)?.messageId
      };
    } catch (error) {
      // Even if some emails failed, check if any succeeded
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        console.warn(`Partial success: ${successCount} emails sent, ${failureCount} failed`);
        return { 
          success: true, 
          partialSuccess: true,
          emailsSent: successCount,
          failures: failureCount,
          recipients: emails,
          results: results,
          messageId: results.find(r => r.success)?.messageId
        };
      } else {
        console.error('All emails failed to send');
        return { 
          success: false, 
          error: 'All emails failed to send',
          results: results
        };
      }
    }
    
  } catch (error) {
    console.error('Error in sendEmailToBookingRecipients:', error);
    return { success: false, error: error.message };
  }
};

// Format date and time
export const formatDateTime = (dateTime, timezone = 'America/Toronto') => {
  const date = new Date(dateTime);
  return {
    date: date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: timezone 
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: timezone 
    })
  };
};

// Generate booking links
export const generateBookingLinks = (studentId, bookingId) => {
  const baseUrl = process.env.NODE_ENV === 'production' ? 'https://www.pocketclass.ca' : 'http://localhost:3000';
  
  return {
    rescheduleLink: `${baseUrl}/mybooking?id=${studentId}&bookingId=${bookingId}&mode=reschedule`,
    cancelLink: `${baseUrl}/mybooking?id=${studentId}&bookingId=${bookingId}&mode=cancel`,
    classDetailsLink: `${baseUrl}/mybooking?id=${studentId}&bookingId=${bookingId}`,
    contactLink: `${baseUrl}/support`,
    rebookLink: `${baseUrl}/mybooking`,
    reviewLink: `${baseUrl}/review?bookingId=${bookingId}`,
    bookAgainLink: `${baseUrl}/mybooking?id=${studentId}&bookingId=${bookingId}&mode=bookAgain`,
    exploreClassesLink: `${baseUrl}/browse`,
    bookingLink: `${baseUrl}/browse`,
    instructorProfileLink: `${baseUrl}/instructor/profile`,
    comebackBookingLink: `${baseUrl}/browse`,
    browseInstructorsLink: `${baseUrl}/browse`,
    favoriteInstructorLink: `${baseUrl}/instructor/profile`,
    browseClassesLink: `${baseUrl}/browse`,
    helpCenterLink: `${baseUrl}/support`,
    supportLink: `${baseUrl}/support`
  };
};
