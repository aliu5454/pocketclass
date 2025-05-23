"use client";

import React, { useState, useEffect } from "react";
import { Chevron, DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { auth, db } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import moment from "moment-timezone";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";
import { useAuthState } from "react-firebase-hooks/auth";
import { use } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/solid";
import { set } from "date-fns";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export default function index({
  instructorId,
  classId,
  classData,
  classPackages,
}) {
  const router = useRouter();
  const [timer, setTimer] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState({
    generalAvailability: [],
    adjustedAvailability: [],
  });
  const [totalBookings, setTotalBookings] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [bookLoading, setBookLoading] = useState(false);
  const [displayConfirmation, setDisplayConfirmation] = useState(false);
  const [isSelfBooking, setIsSelfBooking] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [groupEmails, setGroupEmails] = useState([""]);
  const [numberOfGroupMembers, setNumberOfGroupMembers] = useState(1);
  const [mode, setMode] = useState("Individual");
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [timeZone, setTimeZone] = useState("America/Toronto");
  const [groupedSlots, setGroupedSlots] = useState([]);
  const [individualSlots, setIndividualSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [stripeOptions, setStripeOptions] = useState(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [user, userLoading] = useAuthState(auth);
  const studentId = user?.uid;
  const studentName = user?.displayName;
  const today = new Date();
  const [daysWithNoSlots, setDaysWithNoSlots] = useState([]);
  const [minDays, setMinDays] = useState(0);
  const [maxDays, setMaxDays] = useState(30);
  const [packages, setPackages] = useState([]);
  const [packageClasses, setPackageClasses] = useState();

  useEffect(() => {
    const getPackages = async () => {
      if (!user || !user.uid || !classId) return;

      try {
        const packagesref = collection(db, "Packages");
        const q = query(
          packagesref,
          where("user_id", "==", user.uid),
          where("class_id", "==", classId)
        );

        const querySnapshot = await getDocs(q);

        const packages = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // Validate the required fields exist
          if (
            typeof data.classes_left === "number" ||
            typeof data.num_sessions === "number"
          ) {
            return data;
          }
          return null;
        }).filter(Boolean); // remove nulls

        setPackages(packages);

        if (packages.length > 0) {
          const classesLeft = packages.reduce((total, pkg) => {
            const classes =
              pkg.classes_left !== undefined
                ? Number(pkg.classes_left)
                : Number(pkg.num_sessions ?? 0);

            return total + (classes > 0 ? classes : 0);
          }, 0);

          setPackageClasses(classesLeft);
        } else {
          setPackageClasses(0);
        }
      } catch (error) {
        console.error("Error fetching packages:", error);
        // Optionally set an error state here
      }
    };

    getPackages();
  }, [user, classId]);

  const hasSlots = (date, schedule, bookedSlots, appointmentDuration) => {
    const dateStr = moment(date).format("YYYY-MM-DD");
    const { generalAvailability, adjustedAvailability } = schedule;
    const dayName = moment(date).format("dddd");

    // Filter adjusted availability for both individual and group slots
    const adjustedDay = adjustedAvailability.find(
      (day) => day.date === dateStr
    );
    if (adjustedDay) {
      const hasIndividualSlots = adjustedDay.slots.some((slot) =>
        hasAvailableSlot(slot, dateStr, appointmentDuration, bookedSlots, false)
      );

      const hasGroupSlots = adjustedDay.slots.some((slot) =>
        hasAvailableSlot(slot, dateStr, appointmentDuration, bookedSlots, true)
      );
      if (hasIndividualSlots || hasGroupSlots) return true;
      else return false;
    }

    // Filter general availability for both individual and group slots
    const generalDay = generalAvailability.find((day) => day.day === dayName);
    if (!generalDay || generalDay.slots.length === 0) return false;

    const hasIndividualSlots = generalDay.slots.some((slot) =>
      hasAvailableSlot(slot, dateStr, appointmentDuration, bookedSlots, false)
    );

    const hasGroupSlots = generalDay.slots.some((slot) =>
      hasAvailableSlot(slot, dateStr, appointmentDuration, bookedSlots, true)
    );

    return hasIndividualSlots || hasGroupSlots;
  };

  // Helper function to check if a slot is available
  const hasAvailableSlot = (
    slot,
    dateStr,
    appointmentDuration,
    bookedSlots,
    isGroup
  ) => {
    const slotStart = moment(slot.startTime, "HH:mm");
    const slotEnd = moment(slot.endTime, "HH:mm");

    while (slotStart.isBefore(slotEnd)) {
      const nextSlot = slotStart.clone().add(appointmentDuration, "minutes");
      if (nextSlot.isAfter(slotEnd)) break;

      const isBooked = bookedSlots.some(
        (booked) =>
          booked.date === dateStr &&
          moment(booked.startTime, "HH:mm").isSame(slotStart)
      );

      if (!isBooked) return true;

      const bookingSizes = bookedSlots
        .filter(
          (booked) =>
            booked.date === dateStr &&
            moment(booked.startTime, "HH:mm").isSame(slotStart) &&
            booked.classId === slot.classId
        )
        .map((booking) => (booking.groupSize ? booking.groupSize : 1));
      const remainingSlots =
        classData.groupSize - bookingSizes.length;
      if (isGroup && remainingSlots > 0) {
        return true;
      }

      slotStart.add(appointmentDuration, "minutes");
    }

    return false;
  };

  useEffect(() => {
    const daysToCheck = [];
    const minHourtoDay = 0;
    for (let i = minHourtoDay; i < maxDays; i++) {
      const date = moment(today).add(i, "days").toDate();
      if (!hasSlots(date, schedule, bookedSlots, appointmentDuration)) {
        daysToCheck.push(date);
      }
    }
    setDaysWithNoSlots(daysToCheck);
  }, [schedule, bookedSlots, appointmentDuration, classData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!instructorId || !classId) return;
      const docRef = doc(db, "Schedule", instructorId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        data.generalAvailability.forEach((day) => {
          day.slots.forEach((slot) => {
            if (slot.groupSlot) {
              slot.classId = classId;
              slot.groupSize = classData.groupSize;
            }
          });
        });
        data.adjustedAvailability.forEach((day) => {
          day.slots.forEach((slot) => {
            if (slot.groupSlot) {
              slot.classId = classId;
              slot.groupSize = classData.groupSize;
            }
          });
        });
        setSchedule({
          generalAvailability: data.generalAvailability || [],
          adjustedAvailability: data.adjustedAvailability || [],
        });
        setMinDays(data.minDays || 0);
        setMaxDays(data.maxDays || 30);
        setAppointmentDuration(data.appointmentDuration || 30);
        setTimeZone(data.timezone || "America/Toronto");
        const date = moment(today);
        setSelectedDate(new Date(date));
      }

      const now = moment.utc();
      const bookingsQuery = query(
        collection(db, "Bookings"),
        where("instructor_id", "==", instructorId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const validBookings = [];
      bookingsSnapshot.forEach(async (docSnapshot) => {
        const booking = docSnapshot.data();
        const bookingRef = docSnapshot.ref;

        const bookingStartTime = moment.utc(booking.startTime); // Convert to UTC
        const bookingExpiry = booking.expiry
          ? moment.utc(booking.expiry)
          : null;

        if (
          booking.status === "Pending" &&
          bookingExpiry &&
          bookingExpiry.isBefore(now)
        ) {
          await deleteDoc(bookingRef);
        } else {
          validBookings.push({
            startTime: bookingStartTime.format("HH:mm"),
            endTime: moment.utc(booking.endTime).format("HH:mm"),
            date: bookingStartTime.format("YYYY-MM-DD"),
            classId: booking.class_id,
            groupSize: booking.groupSize,
          });
        }
      });

      setBookedSlots(validBookings);
    };

    fetchData();
  }, [instructorId, classId]);

  const calculateRemainingGroupedClassSlots = () => {
    const selected = moment
      .utc(`${selectedSlot.date} ${selectedSlot.startTime}`, "YYYY-MM-DD HH:mm")
      .toISOString();
    const filteredBookings = bookedSlots.filter(
      (booking) =>
        booking.startTime === selectedSlot.startTime &&
        booking.date === selectedSlot.date
    );

    const bookingSizes = filteredBookings.map((booking) =>
      booking.groupSize ? booking.groupSize : 1
    );
    const remainingSlots =
      classData.groupSize - bookingSizes.reduce((a, b) => a + b, 0);

    return remainingSlots;
  };

  // Generate slots
  useEffect(() => {
    const generateSlots = () => {
      const { generalAvailability, adjustedAvailability } = schedule;
      if (!selectedDate) return;

      const minDate = moment()
        .tz(timeZone)
        .add(minDays, "hours")
        .startOf("day");
      const minTime = moment()
        .tz(timeZone)
        .add(minDays, "hours")
        .format("HH:mm");

      const maxDate = moment().tz(timeZone).add(maxDays, "days").endOf("day");
      const dateStr = moment(selectedDate).format("YYYY-MM-DD");

      if (
        moment(selectedDate).isAfter(maxDate) ||
        moment(selectedDate).isBefore(minDate)
      ) {
        setGroupedSlots([]);
        setIndividualSlots([]);
        return;
      }

      let groupSlots = [];
      let individualSlots = [];

      // Adjusted availability priority
      const adjustedDay = adjustedAvailability.find(
        (day) => day.date === dateStr
      );
      if (adjustedDay) {
        adjustedDay.slots.forEach((slot) => {
          const split = splitSlots(
            slot.startTime,
            slot.endTime,
            dateStr,
            slot.classId
          ).filter(
            (slot) =>
              slot.date != minDate.format("YYYY-MM-DD") ||
              slot.startTime >= minTime
          );
          if (slot.classId) {
            groupSlots.push(...split);
          } else {
            individualSlots.push(...split);
          }
        });
      } else {
        const dayName = moment(selectedDate).format("dddd"); // Get day name
        const generalDay = generalAvailability.find(
          (day) => day.day === dayName
        );

        if (generalDay) {
          generalDay.slots.forEach((slot) => {
            const split = splitSlots(
              slot.startTime,
              slot.endTime,
              dateStr,
              slot.classId
            ).filter(
              (slot) =>
                slot.date != minDate.format("YYYY-MM-DD") ||
                slot.startTime >= minTime
            );
            if (slot.classId) {
              groupSlots.push(...split);
            } else {
              individualSlots.push(...split);
            }
          });
        }
      }

      groupSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      individualSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      setGroupedSlots(groupSlots);
      setIndividualSlots(individualSlots);
    };

    const splitSlots = (start, end, dateStr, classId) => {
      const slotStart = moment.utc(start, "HH:mm");
      const slotEnd = moment.utc(end, "HH:mm");
      const slots = [];

      while (slotStart.isBefore(slotEnd)) {
        const nextSlot = slotStart.clone().add(appointmentDuration, "minutes");
        if (nextSlot.isAfter(slotEnd)) break;

        const bookingsForSlot = bookedSlots.filter(
          (booked) =>
            booked.date === dateStr &&
            moment.utc(booked.startTime, "HH:mm").isSame(slotStart)
        );

        const isBooked = bookingsForSlot.length > 0;
        const groupBooked = bookingsForSlot.filter(
          (b) => b.classId && b.classId === classId
        );
        const groupBookedSize = groupBooked
          .map((b) => (b.groupSize ? b.groupSize : 1))
          .reduce((a, b) => a + b, 0);
        if (
          classId &&
          bookingsForSlot[0]?.classId &&
          !(bookingsForSlot[0]?.classId === classId)
        ) {
        } else if (
          !isBooked ||
          (classId && groupBookedSize < classData.groupSize)
        ) {
          slots.push({
            startTime: slotStart.format("HH:mm"),
            endTime: nextSlot.format("HH:mm"),
            date: dateStr,
            classId: classId,
          });
        }

        slotStart.add(appointmentDuration, "minutes");
      }

      return slots;
    };

    if (
      schedule.generalAvailability.length ||
      schedule.adjustedAvailability.length
    )
      generateSlots();
  }, [selectedDate, schedule, appointmentDuration, bookedSlots, mode]);

  const handleSlotClick = (date, slot) => {
    setSelectedSlot({ date, ...slot });
  };

  const JumpToNextAvail = () => {
    const nextDate = moment(selectedDate).add(1, "day");
    const maxDate = moment().add(maxDays, "days").endOf("day");
    while (
      !hasSlots(nextDate, schedule, bookedSlots, appointmentDuration, mode) &&
      nextDate.isBefore(maxDate)
    ) {
      nextDate.add(1, "day");
    }

    if (!hasSlots(nextDate, schedule, bookedSlots, appointmentDuration, mode)) {
      toast.error("No slots available after this date.");

      return;
    }
    setSelectedDate(nextDate);
  };

  const sendEmail = async (
    targetEmails,
    targetSubject,
    targetHtmlContent,
    attachments = []
  ) => {
    try {
      const res = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: targetSubject,
          html: targetHtmlContent,
          to: targetEmails,
          attachments,
        }),
      });

      if (res.status === 200) {
        console.log("Email sent successfully");
      } else {
        toast.error("Failed to send email. Please try again.");
      }
    } catch (error) {
      console.warn("Error sending email: ", error);
    }
  };

  useEffect(() => {
    if (!selectedDate || !instructorId || !schedule) {
      return;
    }

    const fetchBookings = async () => {
      const startOfDayUTC = moment(selectedDate).utc().startOf("day").toISOString();
      const endOfDayUTC = moment(selectedDate).utc().endOf("day").toISOString();

      const bookingsRef = collection(db, "Bookings");
      const startTimeQuery = query(
        bookingsRef,
        where("instructor_id", "==", instructorId),
        where("startTime", ">=", startOfDayUTC),
        where("startTime", "<=", endOfDayUTC)
      );

      try {
        const [startSnap] = await Promise.all([getDocs(startTimeQuery)]);
        const allBookings = startSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setTotalBookings(allBookings.length);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, [selectedDate, instructorId, schedule]);


  const handleSubmit = async (price, payment_intent_id) => {
    const bookingData = {
      student_id: studentId,
      instructor_id: instructorId,
      class_id: classId,
      student_name: studentName,
      startTime: moment
        .utc(
          `${selectedSlot.date} ${selectedSlot.startTime}`,
          "YYYY-MM-DD HH:mm"
        )
        .toISOString(),
      endTime: moment
        .utc(`${selectedSlot.date} ${selectedSlot.endTime}`, "YYYY-MM-DD HH:mm")
        .toISOString(),
      status: "Pending",
      groupEmails: groupEmails,
      groupSize: numberOfGroupMembers,
      mode: selectedSlot.classId ? "group" : "individual",
      price: price,
      paymentIntentId: payment_intent_id,
      createdAt: serverTimestamp(),
    };

    const bookingsRef = collection(db, "Bookings");
    const slotQuery = query(
      bookingsRef,
      where("instructor_id", "==", instructorId),
      where(
        "startTime",
        "==",
        moment
          .utc(
            `${selectedSlot.date} ${selectedSlot.startTime}`,
            "YYYY-MM-DD HH:mm"
          )
          .toISOString()
      )
    );

    const querySnapshot = await getDocs(slotQuery);

    const isGroup = !!selectedSlot.classId;

    if (isGroup) {
      const existingGroupBookings = querySnapshot.docs;

      const numberOfExistingBookings = existingGroupBookings.map((doc) => {
        const data = doc.data();
        return data.groupSize ? data.groupSize : 1;
      });

      const totalBookings =
        numberOfExistingBookings.reduce((sum, size) => sum + size, 0) +
        numberOfGroupMembers;

      if (totalBookings > classData?.groupSize) {
        toast.error(
          "This slot is fully booked for the group class. Please select a different time."
        );
        setStripeLoading(false);
        return;
      }
    } else {
      const isSlotBooked = querySnapshot.docs.some((doc) =>
        moment
          .utc(doc.data().startTime)
          .isSame(
            moment.utc(
              `${selectedSlot.date} ${selectedSlot.startTime}`,
              "YYYY-MM-DD HH:mm"
            )
          )
      );

      if (isSlotBooked) {
        toast.error(
          "This slot is already booked. Please select a different time."
        );
        setStripeLoading(false);
        return;
      }
    }

    const bookingRef = await addDoc(collection(db, "Bookings"), bookingData);
    const classRef = doc(db, "classes", bookingData.class_id);
    const classSnapshot = await getDoc(classRef);
    const classData = classSnapshot.data();

    const instructorRef = doc(db, "Users", bookingData.instructor_id);
    const instructorSnapshot = await getDoc(instructorRef);
    const instructorData = instructorSnapshot.data();
    let meetingLink = null;
    const date = selectedSlot.date;
    const startTime = selectedSlot.startTime;
    const endTime = selectedSlot.endTime;

    const startDateTime = moment
      .utc(`${date} ${startTime}`)
      .format("YYYY-MM-DDTHH:mm:ss");
    const organizer = instructorData.email;
    const location = classData.Address || "Online";
    const endDateTime = moment
      .utc(`${date} ${endTime}`)
      .format("YYYY-MM-DDTHH:mm:ss");
    if (classData.Mode === "Online") {
      if (mode === "Group") {
        const querySnapshot = await getDocs(
          query(
            collection(db, "Bookings"),
            where("class_id", "==", bookingData.class_id),
            where(
              "startTime",
              "==",
              moment
                .utc(
                  `${selectedSlot.date} ${selectedSlot.startTime}`,
                  "YYYY-MM-DD HH:mm"
                )
                .toISOString()
            ),
            where(
              "endTime",
              "==",
              moment
                .utc(
                  `${selectedSlot.date} ${selectedSlot.endTime}`,
                  "YYYY-MM-DD HH:mm"
                )
                .toISOString()
            )
          )
        );
        if (querySnapshot.size > 0) {
          const otherBookings = querySnapshot.docs.map((doc) => doc.data());
          meetingLink = otherBookings[0]?.meetingLink;
        }
      }
      if (!meetingLink) {
        try {
          meetingLink = await fetch("/api/generateMeetLink", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              className: classData.Name,
              startTime: startDateTime,
              endTime: endDateTime,
              instructorEmail: instructorData?.email,
              studentEmail: user?.email,
              timeZone: timeZone,
            }),
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Failed to generate meeting link");
              }
              return response.json();
            })
            .then((data) => data?.meetLink);
        } catch (error) {
          console.error("Error generating meeting link:", error);
        }
      }
    }

    const bookingDocRef = doc(db, "Bookings", bookingRef.id);
    await updateDoc(bookingDocRef, {
      status: "Confirmed",
      meetingLink: meetingLink ? meetingLink : "",
      paymentStatus: "Paid",
      paymentMethod: "Package",
      timeZone: timeZone ? timeZone : "America/Toronto",
    });

    const recipientEmails = `${user?.email}, ${instructorData.email}, ${mode === "Group" ? groupEmails.join(",") : ""
      }`;
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pocketclass//NONSGML v1.0//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${classData.Name}
DESCRIPTION:Booking confirmed for the class ${classData.Name}
TZID:${timeZone || "America/Toronto"}
DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, "")}
X-LIC-LOCATION:${timeZone || "America/Toronto"}
DTSTART;TZID=${timeZone || "America/Toronto"}:${formatDateTime(startDateTime)}
DTEND;TZID=${timeZone || "America/Toronto"}:${formatDateTime(endDateTime)}
LOCATION:${location}
ORGANIZER;CN=${instructorData.firstName} ${instructorData.lastName
      }:MAILTO:${organizer}
STATUS:CONFIRMED
${meetingLink ? `X-GOOGLE-CONFERENCE:${meetingLink}` : ""}
END:VEVENT
END:VCALENDAR`.trim();

    function formatDateTime(dateTimeString) {
      const date = moment.utc(dateTimeString);
      const formattedDate = date.format("YYYYMMDD");
      const formattedTime = date.format("HHmmss");
      return `${formattedDate}T${formattedTime}`;
    }
    // HTML content for the email
    const htmlContent = `
      <div>

      ${meetingLink
        ? `<div style="margin-top: 20px; padding: 6px 34px; box-sizing: border-box; border: 1px solid #ddd; background-color: #ffffff; border-radius: 8px; display: inline-block; width: 100%;">
              <p style="font-size: 16px; color: #333; margin-bottom: 10px;">
                Join the meeting for your class <strong>${classData.Name}</strong> with <strong>${instructorData.firstName} ${instructorData.lastName}</strong>.
              </p>
              <p style="font-size: 14px; color: #5f5f5f; margin-bottom: 10px;">Meeting Link: <a href="${meetingLink}" style="color: #5f5f5f; text-decoration: none;">${meetingLink}</a></p>
              <a href="${meetingLink}" style="text-decoration: none; display: inline-block; background-color: #E73F2B; color: white; padding: 10px 20px; border-radius: 5px; font-size: 14px; margin-top: 5px; margin-bottom: 5px;">Join Meeting</a>
              <p style="font-size: 14px; color: black; font-weight: bold; margin-bottom: 8px; margin-top: 10px;">Guest List:</p>
              <ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">
                <li style="font-size: 14px; color: #5f5f5f; margin-bottom: 5px;">Instructor: ${instructorData.firstName} ${instructorData.lastName} (${instructorData.email})</li>
                <li style="font-size: 14px; color: #5f5f5f; margin-bottom: 5px;">Student: ${user?.email}</li>
              </ul>
            </div>`
        : ""
      }
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #E73F2B;">New Booking Confirmation</h2>
        <p>Hello,</p>
        <p>We are excited to confirm a new booking for the class <strong>${classData.Name
      }</strong>!</p>
        <h3>Booking Details:</h3>
        <table style="width: 100%; border-collapse: collapse;" border="1">
          <tr>
            <td style="padding: 8px;"><strong>User Email:</strong></td>
            <td style="padding: 8px;">${user?.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Class Name:</strong></td>
            <td style="padding: 8px;">${classData.Name}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Start Time:</strong></td>
            <td style="padding: 8px;">${date + "@" + startTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>End Time:</strong></td>
            <td style="padding: 8px;">${date + "@" + endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Time Zone:</strong></td>
            <td style="padding: 8px;">${timeZone ? timeZone : "America/Toronto"
      }</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Price:</strong></td>
            <td style="padding: 8px;">${price}</td>
          </tr>
          ${meetingLink
        ? `<tr>
            <td style="padding: 8px;"><strong>Meeting Link:</strong></td>
            <td style="padding: 8px;"><a href="${meetingLink}">${meetingLink}</a></td>
          </tr>`
        : ""
      }
        </table>
        <p>Thank you for choosing <strong>Pocketclass</strong>!</p>
        <p style="color: #555;">Best Regards,<br>Pocketclass Team</p>
      </div>
      </div>
    `;

    const notificationRef = collection(db, "notifications");

    const now = Timestamp?.now();
    const notificationData = {
      user: bookingData.instructor_id,
      type: "booking",
      title: "New Booking",
      text: `New booking for ${classData.Name} on ${date} at ${startTime}`,
      isRead: false,
      bookingId: bookingRef,
      createdAt: now,
    };
    await addDoc(notificationRef, notificationData);

    await sendEmail(
      recipientEmails,
      `New Booking for ${classData.Name} with Pocketclass!`,
      htmlContent,
      [
        {
          filename: "booking-invite.ics",
          content: icsContent,
          type: "text/calendar",
        },
      ]
    );

    setStripeOptions(null);
    toast.success("Booking confirmed!");
    setDisplayConfirmation(false);
    router.push(`/confirmBooking/${bookingRef.id}`);
    setStripeLoading(false);
    setBookLoading(false);
  };
  const initializeStripe = async () => {
    const now = moment.utc();
    if (selectedSlot.classId) {
      for (let i = 0; i < groupEmails.length; i++) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!groupEmails[i]) {
          toast.error(
            "Please enter a valid email address for group member " + (i + 1)
          );
          return;
        }
        if (!groupEmails[i].match(emailRegex)) {
          toast.error(
            "Please enter a valid email address for group member " + (i + 1)
          );
          return;
        }
      }
    }
    if (!user && !userLoading) {
      toast.error("Please login to book a slot.");
      return;
    }

    if (packageClasses > 0 && selectedPackage === "Credits") {
      setBookLoading(true);
      const packagesRef = collection(db, "Packages");
      const q = query(
        packagesRef,
        where("class_id", "==", classId),
        where("user_id", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const packageClasses = querySnapshot.docs.length;
      let pricePerSession = querySnapshot.docs[0].data().price_per_session;
      let payment_intent_id = querySnapshot.docs[0].data().payment_intent_id;
      let isPackage = false;
      let classDeduct = 1;
      if (packageClasses > 0) {
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          if (data.classes_left > 0) {
            if (selectedSlot.classId) {
              classDeduct = groupEmails.length;
              if (groupEmails.length > data.classes_left) {
                continue;
              }
            }
            await updateDoc(doc.ref, {
              classes_left: data.classes_left - classDeduct,
            });
            pricePerSession = data.price_per_session;
            payment_intent_id = data.payment_intent_id;
            isPackage = true;
            break;
          }
        }
      }
      if (isPackage) {
        setPackageClasses((prev) => prev - classDeduct);
        handleSubmit(pricePerSession, payment_intent_id);
        return;
      }
    }
    setDisplayConfirmation(false);
    setStripeLoading(true);
    const expiry = now.clone().add(5, "minutes").toISOString();
    setTimer(300);

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev > 0) return prev - 1;
        else {
          clearInterval(interval);
          setStripeOptions(null);
          toast.error("Booking session expired. Please try again.");
        }
        return 0;
      });
    }, 1000);

    const bookingData = {
      student_id: studentId,
      instructor_id: instructorId,
      class_id: classId,
      student_name: studentName,
      startTime: moment
        .utc(
          `${selectedSlot.date} ${selectedSlot.startTime}`,
          "YYYY-MM-DD HH:mm"
        )
        .toISOString(),
      endTime: moment
        .utc(`${selectedSlot.date} ${selectedSlot.endTime}`, "YYYY-MM-DD HH:mm")
        .toISOString(),
      status: "Pending",
      groupEmails: groupEmails,
      groupSize: numberOfGroupMembers,
      expiry,
      mode: selectedSlot.classId ? "group" : "individual",
      createdAt: serverTimestamp(),
    };

    const bookingsRef = collection(db, "Bookings");
    const slotQuery = query(
      bookingsRef,
      where("instructor_id", "==", instructorId),
      where(
        "startTime",
        "==",
        moment
          .utc(
            `${selectedSlot.date} ${selectedSlot.startTime}`,
            "YYYY-MM-DD HH:mm"
          )
          .toISOString()
      )
    );

    const querySnapshot = await getDocs(slotQuery);

    const isGroup = !!selectedSlot.classId;

    if (isGroup) {
      const existingGroupBookings = querySnapshot.docs;

      const numberOfExistingBookings = existingGroupBookings.map((doc) => {
        const data = doc.data();
        return data.groupSize ? data.groupSize : 1;
      });

      const totalBookings =
        numberOfExistingBookings.reduce((sum, size) => sum + size, 0) +
        numberOfGroupMembers;

      if (totalBookings > classData?.groupSize) {
        toast.error(
          "This slot is fully booked for the group class. Please select a different time."
        );
        setStripeLoading(false);
        return;
      }
    } else {
      const isSlotBooked = querySnapshot.docs.some((doc) =>
        moment
          .utc(doc.data().startTime)
          .isSame(
            moment.utc(
              `${selectedSlot.date} ${selectedSlot.startTime}`,
              "YYYY-MM-DD HH:mm"
            )
          )
      );

      if (isSlotBooked) {
        toast.error(
          "This slot is already booked. Please select a different time."
        );
        setStripeLoading(false);
        return;
      }
    }

    const bookingRef = await addDoc(collection(db, "Bookings"), bookingData);
    const packagePrice = selectedPackage?.num_sessions
      ? selectedPackage?.Price -
      ((selectedPackage?.Discount
        ? selectedPackage.Discount
        : selectedPackage?.discountPercentage) *
        selectedPackage?.Price) /
      100
      : selectedSlot.classId
        ? classData.groupPrice
        : classData.Price;
    const response = await fetch("/api/create-stripe-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: selectedPackage?.num_sessions
          ? packagePrice
          : isGroup
            ? classData.groupPrice * numberOfGroupMembers
            : classData.Price,
      }),
    });

    const data = await response.json();

    if (data?.clientSecret) {
      setStripeLoading(false);

      setStripeOptions({
        clientSecret: data.clientSecret,
        bookingRef: bookingRef.id,
      });
    }
    setStripeLoading(false);
  };

  const handleBookSlot = () => {
    initializeStripe();
  };
  const handlePrev = () => {
    setSelectedDate((prevDate) => {
      const date = new Date(prevDate); // Ensure prevDate is a Date object
      date.setDate(date.getDate() - 1);
      return date;
    });
  };

  const handleNext = () => {
    setSelectedDate((prevDate) => {
      const date = new Date(prevDate); // Ensure prevDate is a Date object
      date.setDate(date.getDate() + 1);
      return date;
    });
  };

  return (
    <div className="relative flex flex-col my-6 mb-10" id="booking">
      {/* <h1 className="text-3xl font-bold text-[#E73F2B] mb-4">Book a Slot</h1> */}

      <div className="flex flex-wrap-reverse gap-2 flex-row items-center justify-between mb-4">
        <div className="text-2xl font-bold text-[#E73F2B]">
          Booking Schedule
        </div>
        <div className="text-base text-gray-600 font-bold ">
          <div>Timezone: {timeZone ? timeZone : "America/Toronto"}</div>
          <div>
            {packageClasses > 0 && `Package Classes Left: ${packageClasses}`}
          </div>
        </div>
      </div>
      <div className="flex flex-grow flex-col lg:flex-row">
        {/* Calendar Section */}
        <div className="p-4 pb-8 max-h-min border-gray-100 rounded-md bg-gray-50 flex-shrink-0 overflow-y-auto">
          <h2 className="text-xl font-bold text-[#E73F2B] mb-4">
            Select a Date
          </h2>
          <DayPicker
            className="bg-white p-2 rounded-lg flex items-center justify-center"
            mode="single"
            selected={selectedDate}
            month={selectedDate || today}
            onSelect={(date) => setSelectedDate(date ? new Date(date) : today)}
            disabled={{
              before: moment(today)
                .add(minDays || 0, "hours")
                .toDate(),
              after: moment(today)
                .add(maxDays || 30, "days")
                .toDate(),
            }}
            onMonthChange={(date) => setSelectedDate(new Date(date || today))}
            modifiers={{
              noSlots: daysWithNoSlots.map((date) => new Date(date)),
            }}
            classNames={{
              day: "react-day-picker-day",
              noSlots: "bg-red-100 text-red-700 cross-icon",
            }}
            modifiersClassNames={{
              noSlots: "line-through cross-icon rounded-full",
            }}
          />
        </div>

        {/* Time Slots Section */}
        <div className="flex-grow p-4 flex flex-col bg-white overflow-y-auto">
          <div className="flex-grow mb-3">
            {/* Display Time slots ONLY of Selected Date without using Grouped slot, just selected Dtae*/}
            <div className="flex flex-row mb-3 items-center justify-center">
              <button
                onClick={() => handlePrev()}
                className="p-1 font-bold text-3xl text-center text-[#E73F2B] rounded"
              >
                <ChevronLeftIcon className="h-8 w-8" />
              </button>
              <h3 className="font-bold text-lg">
                {selectedDate &&
                  moment(selectedDate).format("dddd, MMM Do YYYY")}
              </h3>
              <button
                onClick={() => handleNext()}
                className="p-1 font-bold text-2xl mr-2 text-center text-[#E73F2B] rounded"
              >
                <ChevronRightIcon className="h-8 w-8" />
              </button>
            </div>
            {individualSlots.length > 0 && (
              <div className="text-gray-700 font-semibold pb-3 rounded">
                Individual Classes (1-on-1s)
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {individualSlots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => handleSlotClick(slot.date, slot)}
                  className={`p-3 border rounded cursor-pointer ${selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.date === slot.date
                    ? "bg-[#E73F2B] text-white"
                    : "bg-gray-100 hover:bg-[#E73F2B] hover:text-white"
                    }`}
                >
                  {slot.startTime} - {slot.endTime}
                </button>
              ))}
            </div>
            {groupedSlots.length > 0 && (
              <div className="text-gray-700 font-semibold pb-3 rounded">
                Grouped Class (Max. Num. of Students: {classData.groupSize})
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {groupedSlots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => handleSlotClick(slot.date, slot)}
                  className={`p-3 border rounded cursor-pointer ${selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.date === slot.date
                    ? "bg-[#E73F2B] text-white"
                    : "bg-gray-100 hover:bg-[#E73F2B] hover:text-white"
                    }`}
                >
                  {slot.startTime} - {slot.endTime}
                </button>
              ))}
            </div>
            {groupedSlots.length === 0 && individualSlots.length === 0 && (
              <div className="flex flex-col items-center">
                <div className="text-gray-600 m-2 mb-0 text-lg">
                  {totalBookings > 0
                    ? "All classes for today are booked"
                    : "No Time Slots available for this day"}
                </div>
                <button
                  onClick={() => JumpToNextAvail()}
                  className="mt-1 text-blue-600 rounded"
                >
                  Jump to next available day
                </button>
              </div>
            )}


            {/* {groupedSlots.map((group, index) => (
              <div key={index} className="mb-6">
                <div className="flex flex-row items-center">
                  {/* Add Prev and Next Buttons to navigate date */}
            {/* <button
                    onClick={() => handlePrev()}
                    className="p-2 bg-[#E73F2B] text-white rounded mr-2"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => handleNext()}
                    className="p-2 bg-[#E73F2B] text-white rounded"
                  >
                    Next
                  </button>
                  <h3 className="font-bold text-lg mb-2">
                    {moment(group.date).format("dddd, Do MMMM YYYY")}
                  </h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {group.slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => handleSlotClick(group.date, slot)}
                      className={`p-3 border rounded cursor-pointer ${
                        selectedSlot?.startTime === slot.startTime &&
                        selectedSlot?.date === group.date
                          ? "bg-[#E73F2B] text-white"
                          : "bg-gray-100 hover:bg-[#E73F2B] hover:text-white"
                      }`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </button>
                  ))}
                </div>
              </div> */}
            {/* ))}  */}
          </div>
        </div>
      </div>
      {selectedSlot && (
        <div className="mt-3">
          <div className="bg-gray-50 border-2 border-red-300 rounded p-4 ">
            <div className="flex flex-col justify-start gap-3 items-center overflow-x-auto mb-3 md:flex-row">
              <button
                onClick={() => setSelectedPackage(null)}
                className={`bg-white min-w-max flex-grow font-bold w-full md:w-max px-6 py-2 border border-gray-300 hover:border-logo-red hover:bg-logo-red/5 text-black rounded ${selectedPackage === null && "border-logo-red bg-logo-red/5"
                  }`}
              >
                Single Lesson
                <div className="font-normal">
                  {/* Price per session */}
                  <p>
                    {selectedSlot.classId
                      ? classData.groupPrice
                      : classData.Price}{" "}
                    / lesson
                  </p>
                </div>
              </button>
              {packageClasses > 0 && (
                <button
                  onClick={() => setSelectedPackage("Credits")}
                  className={`bg-white min-w-max flex-grow font-bold w-full md:w-max px-6 py-2 border border-gray-300 hover:border-logo-red hover:bg-logo-red/5 text-black rounded ${selectedPackage === "Credits" &&
                    "border-logo-red bg-logo-red/5"
                    }`}
                >
                  Credits
                  <div className="font-normal">
                    {/* Price per session */}
                    <p>Credits Left: {packageClasses}</p>
                  </div>
                </button>
              )}

              {Array.isArray(classPackages) && classPackages.length > 0 &&
                classPackages.map((pkg, i) => (
                  <button
                    onClick={() => setSelectedPackage(pkg)}
                    className={`bg-white min-w-max flex-grow font-bold w-full md:w-max px-6 py-2 border border-gray-300 hover:border-logo-red hover:bg-logo-red/5 text-black rounded ${selectedPackage === pkg && "border-logo-red bg-logo-red/5"
                      }`}
                  >
                    {pkg.num_sessions ? pkg.num_sessions : "0"} Lesson Package
                    <div className="font-normal">
                      <p>
                        {(pkg.Price -
                          (pkg.Price *
                            (pkg.Discount
                              ? pkg.Discount
                              : pkg.discountPercentage)) /
                          100) /
                          (pkg.num_sessions ? pkg.num_sessions : 1)}{" "}
                        / lesson
                      </p>
                    </div>
                  </button>
                ))}
            </div>
            <div className="flex hg w-full justify-between items-center md:flex-row flex-col gap-8 mt-8">
              <div className="w-full md:w-auto flex-col flex-grow gap-1">
                <div className="flex flex-row w-full justify-between">
                  <p>
                    <strong>
                      {selectedPackage?.num_sessions
                        ? `${selectedPackage?.num_sessions} Lesson Package`
                        : `Class Price`}
                    </strong>
                  </p>
                  <p>
                    {selectedPackage?.Price
                      ? selectedPackage.Price
                      : selectedSlot.classId
                        ? selectedSlot.classId
                          ? classData.groupPrice
                          : classData.Price
                        : classData.Price}
                  </p>
                </div>

                <div className="flex flex-row w-full justify-between">
                  <p>
                    <strong>Package Discount:</strong>
                  </p>
                  <p>
                    {selectedPackage?.num_sessions
                      ? ((selectedPackage?.Discount
                        ? selectedPackage.Discount
                        : selectedPackage?.discountPercentage) *
                        (selectedPackage?.Price
                          ? selectedPackage.Price
                          : classData.Price)) /
                      100
                      : 0}
                  </p>
                </div>

                <div className="flex flex-row w-full justify-between">
                  <p>
                    <strong>Total:</strong>
                  </p>
                  <p>
                    {selectedPackage?.num_sessions
                      ? selectedPackage.Price -
                      ((selectedPackage?.Discount ??
                        selectedPackage?.discountPercentage) *
                        selectedPackage?.Price) /
                      100
                      : selectedSlot.classId
                        ? classData.groupPrice
                        : classData.Price}
                  </p>
                </div>
              </div>
              <div className="md:h-16 md:w-[1px] h-[1px] w-full  bg-slate-500" />
              <div className="flex flex-grow flex-col gap-3">
                <div className="flex flex-col">
                  <p>
                    <strong>Selected: </strong>
                    {moment(selectedSlot.date).format("dddd, MMMM Do YYYY")}
                    {" @ "}
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </p>
                  {selectedSlot.classId && (
                    <div>
                      <strong>Available Seats:</strong>{" "}
                      {calculateRemainingGroupedClassSlots()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (selectedSlot.classId) {
                      if (!user) {
                        setGroupEmails([""]);
                      } else {
                        setGroupEmails([user.email]);
                      }
                      setNumberOfGroupMembers(1);
                      setDisplayConfirmation(true);
                    } else {
                      handleBookSlot();
                    }
                  }}
                  disabled={bookLoading}
                  className="bg-[#E73F2B] text-white max-[450px]:w-full p-2 rounded"
                >
                  {bookLoading ? "Loading..." : "Book Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {displayConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Confirm Booking</h2>
            <p>
              <strong>Selected: </strong>
              {moment(selectedSlot.date).format("dddd, MMMM Do YYYY")}{" "}
              {selectedSlot.startTime} - {selectedSlot.endTime}
            </p>
            {selectedSlot.classId && (
              <p>
                <strong>Available Seats:</strong>{" "}
                {calculateRemainingGroupedClassSlots()}
              </p>
            )}
            {!selectedSlot.classId && (
              <div>
                <div className="flex flex-row gap-3 flex-wrap items-center mt-4">
                  <div
                    className={`p-2 px-4 text-logo-red border border-1 border-logo-red rounded cursor-pointer hover:bg-logo-red hover:text-white ${isSelfBooking && "bg-logo-red text-white"
                      }`}
                    onClick={() => setIsSelfBooking(true)}
                  >
                    Book for Self
                  </div>
                  <div
                    className={`p-2 px-4 text-logo-red border border-1 border-logo-red rounded cursor-pointer hover:bg-logo-red hover:text-white ${!isSelfBooking && "bg-logo-red text-white"
                      }`}
                    onClick={() => setIsSelfBooking(false)}
                  >
                    Book for someone else
                  </div>
                </div>
                {!isSelfBooking && (
                  // Ask them to write email of usee
                  <div className="mt-4">
                    <label className="block text-gray-700 font-semibold mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full border border-gray-400 rounded px-3 py-2"
                    />
                  </div>
                )}
              </div>
            )}
            {/* If Class Id exists, Ask Number of Students(As Input box from 1 to Remaining Seats), and their emails */}
            {selectedSlot.classId && (
              <div>
                <div className="mt-4 flex items-center w-full">
                  <div className="flex items-center w-full justify-center space-x-4">
                    <button
                      type="button"
                      className="bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded"
                      onClick={() => {
                        if (numberOfGroupMembers > 1) {
                          setNumberOfGroupMembers((prev) => prev - 1);
                          setGroupEmails((prev) =>
                            prev.slice(0, prev.length - 1)
                          );
                        }
                      }}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="text-gray-700 font-medium">
                      {numberOfGroupMembers}
                    </span>
                    <button
                      type="button"
                      className="bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded"
                      onClick={() => {
                        if (
                          numberOfGroupMembers <
                          calculateRemainingGroupedClassSlots()
                        ) {
                          setNumberOfGroupMembers((prev) => prev + 1);
                          setGroupEmails((prev) => [...prev, ""]);
                        }
                      }}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <span className="ml-4 text-gray-700">No. of Students</span>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Student Emails
                  </label>
                  {groupEmails.map((email, index) => (
                    <input
                      key={index}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const newEmails = [...groupEmails];
                        newEmails[index] = e.target.value;
                        setGroupEmails(newEmails);
                      }}
                      className="w-full border border-gray-400 rounded px-3 py-2 mb-2"
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex mt-6 justify-between items-center">
              <button
                onClick={() => setDisplayConfirmation(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleBookSlot}
                className="bg-[#E73F2B] text-white px-4 py-2 rounded"
                disabled={bookLoading}
              >
                {bookLoading ? "Loading..." : "Book Now"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Centered Stripe Checkout */}
      {stripeLoading && <CheckoutSkeleton />}
      {stripeOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Elements stripe={stripePromise} options={stripeOptions}>
            <CheckoutForm
              bookingRef={stripeOptions.bookingRef}
              setStripeOptions={setStripeOptions}
              timer={timer}
              price={
                selectedSlot.classId
                  ? classData.groupPrice * numberOfGroupMembers
                  : classData.Price
              }
              startTime={selectedSlot.startTime}
              endTime={selectedSlot.endTime}
              date={selectedSlot.date}
              setTimer={setTimer}
              mode={selectedSlot.classId ? "Group" : "Individual"}
              classData={classData}
              timeZone={timeZone}
              groupEmails={groupEmails}
              numberOfGroupMembers={numberOfGroupMembers}
              selectedSlot={selectedSlot}
              selectedPackage={selectedPackage}
              classId={classId}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}

const CheckoutSkeleton = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen  bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto animate-pulse">
        {/* Go Back Button Skeleton */}
        <div className="flex flex-row justify-end text-gray-300 mb-2">
          <div className="h-4 w-16 bg-gray-300 rounded"></div>
        </div>

        {/* Header Section Skeleton */}
        <div className="flex flex-row items-center justify-between mb-4">
          <div className="h-6 w-40 bg-gray-300 rounded"></div>

          <div className="flex items-center">
            <div className="h-4 w-20 bg-gray-300 rounded mr-2"></div>
            <div className="h-4 w-12 bg-gray-300 rounded"></div>
          </div>
        </div>

        {/* Address Element Skeleton */}
        <div className="h-14 w-full bg-gray-300 rounded mb-4"></div>

        {/* Payment Element Skeleton */}
        <div className="h-14 w-full bg-gray-300 rounded mb-4"></div>
        <div className="h-14 w-full bg-gray-300 rounded mb-4"></div>

        {/* Pay Button Skeleton */}
        <div className="mt-4 p-2 bg-gray-400 text-white rounded w-full text-center">
          Processing...
        </div>
      </div>
    </div>
  );
};

const CheckoutForm = ({
  bookingRef,
  timer,
  setStripeOptions,
  startTime,
  endTime,
  date,
  setTimer,
  mode,
  classData,
  timeZone,
  groupEmails,
  numberOfGroupMembers,
  selectedSlot,
  price,
  selectedPackage,
  classId,
}) => {
  const stripe = useStripe();
  const [user, userLoading] = useAuthState(auth);
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sendEmail = async (
    targetEmails,
    targetSubject,
    targetHtmlContent,
    attachments = []
  ) => {
    try {
      const res = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: targetSubject,
          html: targetHtmlContent,
          to: targetEmails,
          attachments,
        }),
      });

      if (res.status === 200) {
        console.log("Email sent successfully");
      } else {
        toast.error("Failed to send email. Please try again.");
      }
    } catch (error) {
      console.warn("Error sending email: ", error);
    }
  };
  const packagePrice = selectedPackage?.num_sessions
    ? selectedPackage?.Price -
    ((selectedPackage?.Discount
      ? selectedPackage.Discount
      : selectedPackage?.discountPercentage) *
      selectedPackage?.Price) /
    100
    : selectedSlot.classId
      ? classData.groupPrice
      : classData.Price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!stripe || !elements) {
      toast.error("Stripe is not loaded yet.");
      return;
    }

    if (!user?.displayName || !user?.email) {
      toast.error("Your name and email are required for payment.");
      setLoading(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: user?.displayName,
            email: user?.email,
          },
        },
      },
      redirect: "if_required",
    });

    if (!error && paymentIntent && paymentIntent?.status === "succeeded") {
      const bookingDocRef = doc(db, "Bookings", bookingRef);

      const bookingSnapshot = await getDoc(bookingDocRef);
      const bookingData = bookingSnapshot.data();
      const classRef = doc(db, "classes", bookingData.class_id);
      const classSnapshot = await getDoc(classRef);
      const classData = classSnapshot.data();

      const instructorRef = doc(db, "Users", bookingData.instructor_id);
      const instructorSnapshot = await getDoc(instructorRef);
      const instructorData = instructorSnapshot.data();
      let meetingLink = null;

      const startDateTime = moment
        .utc(`${date} ${startTime}`)
        .format("YYYY-MM-DDTHH:mm:ss");
      if (!instructorData?.email) {
        toast.error("Instructor email is missing.");
        setLoading(false);
        return;
      }
      const organizer = instructorData.email;
      const location = classData.Address || "Online";
      const endDateTime = moment
        .utc(`${date} ${endTime}`)
        .format("YYYY-MM-DDTHH:mm:ss");
      if (classData.Mode === "Online") {
        if (mode === "Group") {
          const querySnapshot = await getDocs(
            query(
              collection(db, "Bookings"),
              where("class_id", "==", bookingData.class_id),
              where(
                "startTime",
                "==",
                moment
                  .utc(
                    `${selectedSlot.date} ${selectedSlot.startTime}`,
                    "YYYY-MM-DD HH:mm"
                  )
                  .toISOString()
              ),
              where(
                "endTime",
                "==",
                moment
                  .utc(
                    `${selectedSlot.date} ${selectedSlot.endTime}`,
                    "YYYY-MM-DD HH:mm"
                  )
                  .toISOString()
              )
            )
          );
          if (querySnapshot && querySnapshot.size > 0 && Array.isArray(querySnapshot.docs)) {
            const otherBookings = querySnapshot.docs.map((doc) => doc.data());
            meetingLink = otherBookings[0]?.meetingLink;
          }
        }
        else if (!mode) {
          toast.error("Class mode is not specified.");
          setLoading(false);
          return;
        }
        if (!meetingLink) {
          try {
            meetingLink = await fetch("/api/generateMeetLink", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                className: classData.Name,
                startTime: startDateTime,
                endTime: endDateTime,
                instructorEmail: instructorData?.email,
                studentEmail: user?.email,
                timeZone: timeZone,
              }),
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error("Failed to generate meeting link");
                }
                return response.json();
              })
              .then((data) => data?.meetLink);
          } catch (error) {
            console.error("Error generating meeting link:", error);
          }
        }
      } else if (!classData?.Mode) {
        toast.error("Class mode is not specified.");
        setLoading(false);
        return;
      }
      await updateDoc(bookingDocRef, {
        status: "Confirmed",
        expiry: null,
        paymentIntentId: paymentIntent.id,
        meetingLink: meetingLink ? meetingLink : "",
        paymentStatus: "Paid",
        price: selectedPackage?.num_sessions
          ? (packagePrice / selectedPackage?.num_sessions) *
          numberOfGroupMembers
          : price,
        timeZone: timeZone ? timeZone : "America/Toronto",
      });

      const recipientEmails = `${user?.email}, ${instructorData.email}, ${mode === "Group" ? groupEmails.join(",") : ""
        }`;
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pocketclass//NONSGML v1.0//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${classData.Name}
DESCRIPTION:Booking confirmed for the class ${classData.Name}
TZID:${timeZone || "America/Toronto"}
DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, "")}
X-LIC-LOCATION:${timeZone || "America/Toronto"}
DTSTART;TZID=${timeZone || "America/Toronto"}:${formatDateTime(startDateTime)}
DTEND;TZID=${timeZone || "America/Toronto"}:${formatDateTime(endDateTime)}
LOCATION:${location}
ORGANIZER;CN=${instructorData.firstName} ${instructorData.lastName
        }:MAILTO:${organizer}
STATUS:CONFIRMED
${meetingLink ? `X-GOOGLE-CONFERENCE:${meetingLink}` : ""}
END:VEVENT
END:VCALENDAR`.trim();

      function formatDateTime(dateTimeString) {
        const date = moment.utc(dateTimeString);
        const formattedDate = date.format("YYYYMMDD");
        const formattedTime = date.format("HHmmss");
        return `${formattedDate}T${formattedTime}`;
      }
      // HTML content for the email
      const htmlContent = `
      <div>

      ${meetingLink
          ? `<div style="margin-top: 20px; padding: 6px 34px; box-sizing: border-box; border: 1px solid #ddd; background-color: #ffffff; border-radius: 8px; display: inline-block; width: 100%;">
              <p style="font-size: 16px; color: #333; margin-bottom: 10px;">
                Join the meeting for your class <strong>${classData.Name}</strong> with <strong>${instructorData.firstName} ${instructorData.lastName}</strong>.
              </p>
              <p style="font-size: 14px; color: #5f5f5f; margin-bottom: 10px;">Meeting Link: <a href="${meetingLink}" style="color: #5f5f5f; text-decoration: none;">${meetingLink}</a></p>
              <a href="${meetingLink}" style="text-decoration: none; display: inline-block; background-color: #E73F2B; color: white; padding: 10px 20px; border-radius: 5px; font-size: 14px; margin-top: 5px; margin-bottom: 5px;">Join Meeting</a>
              <p style="font-size: 14px; color: black; font-weight: bold; margin-bottom: 8px; margin-top: 10px;">Guest List:</p>
              <ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">
                <li style="font-size: 14px; color: #5f5f5f; margin-bottom: 5px;">Instructor: ${instructorData.firstName} ${instructorData.lastName} (${instructorData.email})</li>
                <li style="font-size: 14px; color: #5f5f5f; margin-bottom: 5px;">Student: ${user?.email}</li>
              </ul>
            </div>`
          : ""
        }
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #E73F2B;">New Booking Confirmation</h2>
        <p>Hello,</p>
        <p>We are excited to confirm a new booking for the class <strong>${classData.Name
        }</strong>!</p>
        <h3>Booking Details:</h3>
        <table style="width: 100%; border-collapse: collapse;" border="1">
          <tr>
            <td style="padding: 8px;"><strong>User Email:</strong></td>
            <td style="padding: 8px;">${user?.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Class Name:</strong></td>
            <td style="padding: 8px;">${classData.Name}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Start Time:</strong></td>
            <td style="padding: 8px;">${date + "@" + startTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>End Time:</strong></td>
            <td style="padding: 8px;">${date + "@" + endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Time Zone:</strong></td>
            <td style="padding: 8px;">${timeZone ? timeZone : "America/Toronto"
        }</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Price:</strong></td>
            <td style="padding: 8px;">${mode === "Group" ? classData.groupPrice : classData.Price
        }</td>
          </tr>
          ${meetingLink
          ? `<tr>
            <td style="padding: 8px;"><strong>Meeting Link:</strong></td>
            <td style="padding: 8px;"><a href="${meetingLink}">${meetingLink}</a></td>
          </tr>`
          : ""
        }
        </table>
        <p>Thank you for choosing <strong>Pocketclass</strong>!</p>
        <p style="color: #555;">Best Regards,<br>Pocketclass Team</p>
      </div>
      </div>
    `;

      const notificationRef = collection(db, "notifications");

      const now = Timestamp?.now();
      const notificationData = {
        user: bookingData.instructor_id,
        type: "booking",
        title: "New Booking",
        text: `New booking for ${classData.Name} on ${date} at ${startTime}`,
        isRead: false,
        bookingId: bookingRef,
        createdAt: now,
      };
      await addDoc(notificationRef, notificationData);

      await sendEmail(
        recipientEmails,
        `New Booking for ${classData.Name} with Pocketclass!`,
        htmlContent,
        [
          {
            filename: "booking-invite.ics",
            content: icsContent,
            type: "text/calendar",
          },
        ]
      );

      if (selectedPackage?.num_sessions) {
        const docRef = await addDoc(collection(db, "Packages"), {
          payment_intent_id: paymentIntent.id,
          class_id: classId,
          user_id: user?.uid,
          num_sessions: selectedPackage?.num_sessions,
          packagePrice,
          price_per_session: packagePrice / selectedPackage?.num_sessions,
          classes_left: parseInt(selectedPackage?.num_sessions, 10) - (numberOfGroupMembers ? numberOfGroupMembers : 1),
        });
      }

      setStripeOptions(null);
      setLoading(false);
      toast.success("Booking confirmed!");
      router.push(`/confirmBooking/${bookingRef}`);
    } else {
      toast.error(error?.message || "Payment failed!");
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto"
    >
      <div className="flex flex-row justify-between text-[#E73F2B] mb-2">
        <div className="text-base font-semibold text-[#E73F2B]">
          Paying: ${selectedPackage?.num_sessions ? packagePrice : price}
        </div>
        <button
          className="top-4 right- flex flex-row items-center gap-1 text-center"
          onClick={() => {
            setStripeOptions(null);
            setTimer(null);
          }}
        >
          <ChevronLeftIcon className="h-4 w-4 mt-1" />
          Go Back
        </button>
      </div>
      <div className="flex flex-row items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Complete Payment</h1>

        <div className="flex items-center">
          <p className="text-sm text-gray-500 mr-2">Expires in:</p>
          <p className="text-sm text-[#E73F2B] font-bold">
            {Math.floor(timer / 60)}:{timer % 60 < 10 ? "0" : ""}
            {timer % 60}
          </p>
        </div>
      </div>
      <AddressElement options={{ mode: "billing" }} />
      <PaymentElement />
      <button
        className="mt-4 p-2 bg-[#E73F2B] text-white rounded w-full"
        disabled={loading}
      >
        {loading ? "Processing..." : "Pay"}
      </button>
    </form>
  );
};
