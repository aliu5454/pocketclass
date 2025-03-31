import { db } from "../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import moment from "moment-timezone";

async function sendReviewEmail(appointment, classData) {
  try {
    let nodemailer = require("nodemailer");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
      port: 465,
      host: "smtp.gmail.com",
    });

    if (!appointment.student_id || !appointment.class_id) {
      console.log("Appointment or class not found!");
      return;
    }

    const studentRef = doc(db, "Users", appointment?.student_id);
    if (!studentRef) {
      return;
    }
    const studentSnapshot = await getDoc(studentRef);
    if (!studentSnapshot.exists()) {
      console.log("Student not found!");
      return;
    }
    const studentData = studentSnapshot.data();
    if (!studentData) {
      return;
    }

    const instructorRef = doc(db, "Users", appointment?.instructor_id);
    if (!instructorRef) {
      return;
    }
    const instructorSnapshot = await getDoc(instructorRef);
    if (!instructorSnapshot.exists()) {
      return;
    }
    const instructorData = instructorSnapshot.data();
    if (!instructorData) {
      return;
    }

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto;">
        <p>Hi ${studentData.firstName},</p>
        <p>We’re excited for your upcoming lesson with <strong>${instructorData.firstName} ${instructorData.lastName}</strong> in just 48 hours! 🎉 We hope you’re looking forward to learning, improving, and having a great time.</p>
        <p><strong>Class Details:</strong></p>
        <ul>
            <li><strong>Date:</strong> ${moment
              .utc(appointment.startTime)
              .format("YYYY-MM-DD")}@${moment.utc(appointment.startTime).format("hh:mm A")}</li>
            <li><strong>Timezone:</strong> ${appointment.timezone || "America/Toronto"}</li>
            <li><strong>Class:</strong> ${classData?.Name}</li>
        </ul>
        <p>We understand your schedule may have changed, and wanted to provide an opportunity to <strong>Reschedule</strong> or <strong>Cancel</strong> — no fees, no hassle! After this window, your lesson will be locked to ensure a smooth and fair experience for both students and instructors.</p>

        <div style="text-align: center; margin: 30px 20px;">
            <a href="https://www.pocketclass.ca/myClass/${appointment.student_id}?bookingId=${appointment.id}&mode=reschedule" 
               style="background-color: #007BFF; color: white; padding: 12px 18px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
                Reschedule
            </a>
            <a href="https://www.pocketclass.ca/myClass/${appointment.student_id}?bookingId=${appointment.id}&mode=cancel" 
               style="background-color: #E73F2B; color: white; padding: 12px 18px; text-decoration: none; border-radius: 4px;">
                Cancel
            </a>
        </div>

        <p>If you need to make a last-minute change within <strong>24 hours</strong> of your lesson, a <strong>25% rescheduling fee</strong> or <strong>50% cancellation fee</strong> will apply to protect your instructor’s time.</p>

        <p>We’re here to make sure you have the best experience while keeping things fair for everyone. If you have any questions, just reply to this email—we’re happy to help!</p>

        <p>See you soon, and happy learning! 🚀</p>

        <p>Best regards,<br>The PocketClass Team</p>
    </div>
`;

    const message = {
      from: "contact.pocketclass@gmail.com",
      to: studentData?.email,
      subject: "Your Upcoming PocketClass Session",
      html: htmlContent,
    };

    const appointmentRef = doc(db, "Bookings", appointment.id);
    await updateDoc(appointmentRef, {
      reminderEmailSent: true,
    });

    return transporter.sendMail(message);
  } catch (error) {
    console.error("Error sending review email:", error);
  }
}

export default async function handler(req, res) {
  try {
    const currentTime = moment();
    const appointmentsRef = collection(db, "Bookings");
    const appointmentsSnapshot = await getDocs(appointmentsRef);
    const appointments = appointmentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const classesRef = collection(db, "classes");
    const classesSnapshot = await getDocs(classesRef);
    const classes = classesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const completedAppointments = appointments.filter((appointment) => {
      const endTime = moment(appointment.startTime).tz(
        appointment.timezone || "America/Toronto",
        true
      );
      const now = moment()
        .tz(appointment.timezone || "America/Toronto")
        .add(48, "hours");
      const now1 = moment().tz(appointment.timezone || "America/Toronto");
      return (
        appointment.status === "Confirmed" &&
        endTime.isSameOrBefore(now) &&
        endTime.isAfter(now1) &&
        !appointment.reminderEmailSent
      );
    });

    // Send review emails
    const emailPromises = completedAppointments.map((appointment) =>
      sendReviewEmail(
        appointment,
        classes.find((c) => c.id === appointment.class_id)
      )
    );

    await Promise.all(emailPromises);

    return res.status(200).json({
      success: true,
      message: `Sent ${completedAppointments.length} review request emails`,
    });
  } catch (error) {
    console.error("Error sending review emails:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send review emails",
      error: error.message,
    });
  }
}
