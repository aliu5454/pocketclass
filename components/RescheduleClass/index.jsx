"use client";

import React, { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
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
  serverTimestamp,
} from "firebase/firestore";
import moment from "moment-timezone";
import { loadStripe } from "@stripe/stripe-js";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/solid";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export default function index({
  instructorId,
  classId,
  bookingId,
  setRescheduleModal,
  updateAppointmentTime,
  appointmentId,
}) {
  const router = useRouter();
  const [timer, setTimer] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState({
    generalAvailability: [],
    adjustedAvailability: [],
  });
  const [displayConfirmation, setDisplayConfirmation] = useState(false);
  const [isSelfBooking, setIsSelfBooking] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
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
  const [bookingData, setBookingData] = useState(null);
  const studentId = user?.uid;
  const studentName = user?.displayName;
  const today = new Date();
  const [daysWithNoSlots, setDaysWithNoSlots] = useState([]);
  const [minDays, setMinDays] = useState(0);
  const [maxDays, setMaxDays] = useState(30);
  const [classData, setClassData] = useState(null);

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        const docRef = doc(db, "classes", classId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setClassData(docSnap.data());
        } else {
          console.error("No such document!");
          toast.error("Class not found");
        }
      } catch (error) {
        console.error("Error fetching class data:", error);
        toast.error("Failed to fetch class data");
      }
    };

    if (classId) {
      fetchClassData();
    }
  }, [classId]);

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
        classData?.groupSize - bookingSizes.reduce((a, b) => a + b, 0);
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
    console.log(selectedDate);
    console.log(selectedSlot);
  }, [selectedDate, selectedSlot]);

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
              slot.groupSize = classData?.groupSize;
            }
          });
        });
        data.adjustedAvailability.forEach((day) => {
          day.slots.forEach((slot) => {
            if (slot.groupSlot) {
              slot.classId = classId;
              slot.groupSize = classData?.groupSize;
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

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        console.log(bookingId);
        const bookingRef = doc(db, "Bookings", bookingId);
        const bookingRefSnapshot = await getDoc(bookingRef);
        if (!bookingRefSnapshot.exists()) {
          toast.error("Booking not found");
          return;
        }
        const bookingDataa = bookingRefSnapshot.data();
        setBookingData(bookingDataa);
        if (!bookingDataa) {
          toast.error("Booking not found");
          return;
        }
        if (bookingDataa.mode === "group") {
          setIndividualSlots([]);
        } else {
          setGroupedSlots([]);
        }
      } catch (error) {
        console.error("Error fetching booking data:", error);
        toast.error("Failed to fetch booking data");
      }
    };

    if (bookingId) {
      fetchBookingData();
    }
  }, [bookingId]);

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
      classData?.groupSize - bookingSizes.reduce((a, b) => a + b, 0);

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

      if (bookingData.mode === "group") {
        setGroupedSlots(groupSlots);
      } else {
        setIndividualSlots(individualSlots);
      }
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
          (classId && groupBookedSize < classData?.groupSize)
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

  useEffect(() => {
    let intervalId;
    if (timer > 0) {
      intervalId = setInterval(() => {
        setTimer((prev) => {
          if (prev > 0) return prev - 1;
          clearInterval(intervalId);
          setStripeOptions(null);
          toast.error("Booking session expired. Please try again.");
          return 0;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timer]);

  const handleSlotClick = (date, slot) => {
    setSelectedSlot({ date, ...slot });
  };

  const JumpToNextAvail = () => {
    const nextDate = moment(selectedDate).add(1, "day");
    const maxDate = moment().add(maxDays, "days").endOf("day");
    while (
      !hasSlots(nextDate, schedule, bookedSlots, appointmentDuration) &&
      nextDate.isBefore(maxDate)
    ) {
      nextDate.add(1, "day");
    }

    if (!hasSlots(nextDate, schedule, bookedSlots, appointmentDuration)) {
      toast.error("No slots available after this date.");

      return;
    }
    setSelectedDate(nextDate);
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
    setDisplayConfirmation(false);
    if (!user && !userLoading) {
      toast.error("Please login to book a slot.");
      return;
    }
    setStripeLoading(true);

    const expiry = now.clone().add(5, "minutes").toISOString();
    setTimer(300);

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
    const response = await fetch("/api/create-stripe-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: isGroup
          ? classData?.groupPrice * numberOfGroupMembers
          : classData?.Price,
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

  const handleBookSlot = async () => {
    setRescheduleLoading(true);
    const bookingRef = doc(db, "Bookings", bookingId);
    const classRef = doc(db, "classes", bookingData.class_id);
    const classSnapshot = await getDoc(classRef);
    const classData = classSnapshot.data();

    const now = moment().tz(timeZone).add(24, "hours");
    const bookingStartDate = moment.utc(`${selectedSlot}`, "YYYY-MM-DD HH:mm");

    if (bookingStartDate.isBefore(now)) {
      setRescheduleLoading(false);
      toast.error(
        "Cannot reschedule to a date and time within the next 24 hours."
      );
      return;
    }

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
        bookingData.groupSize;

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
    const instructorRef = doc(db, "Users", bookingData.instructor_id);
    const instructorSnapshot = await getDoc(instructorRef);
    const instructorData = instructorSnapshot.data();

    const startTime = moment
      .utc(`${selectedSlot.date} ${selectedSlot.startTime}`, "YYYY-MM-DD HH:mm")
      .toISOString();
    const endTime = moment
      .utc(`${selectedSlot.date} ${selectedSlot.endTime}`, "YYYY-MM-DD HH:mm")
      .toISOString();

    const startDateTime = moment
      .utc(`${selectedSlot.date} ${selectedSlot.startTime}`)
      .format("YYYY-MM-DDTHH:mm:ss");
    const endDateTime = moment
      .utc(`${selectedSlot.date} ${selectedSlot.endTime}`)
      .format("YYYY-MM-DDTHH:mm:ss");
    let meetingLink;
    if (classData.Mode === "Online") {
      const mode = bookingData.mode;
      if (mode === "group") {
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
    const updateData = {
      startTime,
      endTime,
      meetingLink: meetingLink ? meetingLink : "",
      updatedAt: serverTimestamp(),
    };
    updateDoc(bookingRef, updateData);
    if (
      instructorData?.googleCalendar &&
      instructorData?.googleCalendar.accessToken
    ) {
      const oldstartDateTime = moment
        .utc(bookingData.startTime)
        .format("YYYY-MM-DDTHH:mm:ss");
      const oldendDateTime = moment
        .utc(bookingData.endTime)
        .format("YYYY-MM-DDTHH:mm:ss");
      const cancelResponse = await fetch("/api/calendar/delete-event", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmails: [user?.email, ...bookingData.groupEmails],
          classId: bookingData.class_id,
          start: oldstartDateTime,
          end: oldendDateTime,
          timeZone: timeZone || "America/Toronto",
          instructorId: instructorId,
        }),
      });
      if (!cancelResponse.ok) {
        console.error("Failed to cancel the event in Google Calendar");
      }

      const createResponse = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: instructorId,
          timeZone: timeZone || "America/Toronto",
          booking: {
            title: classData.Name,
            class: classId,
            start: startDateTime,
            end: endDateTime,
            location: location,
            meetingLink: meetingLink,
            userEmails: [
              user?.email,
              ...(mode === "Group" ? bookingData.groupEmails : []),
            ],
            timeZone: timeZone ? timeZone : "America/Toronto",
          },
        }),
      });
      if (!createResponse.ok) {
        console.error("Failed to create the event in Google Calendar");
      }
    }
    const organizer = instructorData.email;
    const recipientEmails = `${user?.email}, ${instructorData.email}, ${
      bookingData.mode === "group" ? groupEmails.join(",") : ""
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
LOCATION:${classData.Address}
ORGANIZER;CN=${instructorData.firstName} ${
      instructorData.lastName
    }:MAILTO:${organizer}
STATUS:CONFIRMED
${meetingLink ? `X-GOOGLE-CONFERENCE:${meetingLink}` : ""}
END:VEVENT
END:VCALENDAR`.trim();

    const mode = bookingData.mode;
    const htmlContent = `
  <div style="font-family: Arial, sans-serif;">
      ${
        meetingLink
          ? `<div style="margin-top: 20px; padding: 6px 34px; box-sizing: border-box; border: 1px solid #ddd; background-color: #ffffff; border-radius: 8px; display: inline-block; width: 100%;">
              <p style="font-size: 16px; color: #333; margin-bottom: 10px;">
                Join the rescheduled meeting for your class <strong>${classData.Name}</strong> with <strong>${instructorData.firstName} ${instructorData.lastName}</strong>.
              </p>
              <p style="font-size: 14px; color: #5f5f5f; margin-bottom: 10px;">Meeting Link: <a href="${meetingLink}" style="color: #007bff; text-decoration: none;">${meetingLink}</a></p>
              <a href="${meetingLink}" style="text-decoration: none; display: inline-block; background-color: #E73F2B; color: white; padding: 10px 20px; border-radius: 5px; font-size: 14px; margin-top: 5px; margin-bottom: 5px;">Join Rescheduled Meeting</a>
              <p style="font-size: 14px; color: black; font-weight: bold; margin-bottom: 8px; margin-top: 10px;">Guest List:</p>
              <ul style="list-style-type: disc; margin-left: 20px; padding-left: 0;">
                <li style="font-size: 14px; color: #5f5f5f; margin-bottom: 5px;">Instructor: ${instructorData.firstName} ${instructorData.lastName} (${instructorData.email})</li>
                <li style="font-size: 14px; color: #5f5f5f; margin-bottom: 5px;">Student: ${user?.email}</li>
              </ul>
            </div>`
          : ""
      }
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #E73F2B;">Booking Reschedule Confirmation</h2>
      <p>Hello,</p>
      <p>We would like to inform you that your booking for the class <strong>${
        classData.Name
      }</strong> has been successfully rescheduled.</p>
      <h3>Updated Booking Details:</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;" border="1">
        <tr>
          <td style="padding: 12px; background-color: #f8f9fa;"><strong>User Email:</strong></td>
          <td style="padding: 12px;">${user?.email}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f8f9fa;"><strong>Class Name:</strong></td>
          <td style="padding: 12px;">${classData.Name}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f8f9fa;"><strong>New Start Time:</strong></td>
          <td style="padding: 12px;">${
            selectedSlot.date + "@" + selectedSlot.startTime
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f8f9fa;"><strong>New End Time:</strong></td>
          <td style="padding: 12px;">${
            selectedSlot.date + "@" + selectedSlot.endTime
          }</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f8f9fa;"><strong>Time Zone:</strong></td>
          <td style="padding: 12px;">${timeZone || "America/Toronto"}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f8f9fa;"><strong>Price:</strong></td>
          <td style="padding: 12px;">$${
            mode === "Group" ? classData?.groupPrice : classData?.Price
          }</td>
        </tr>
        ${
          meetingLink
            ? `<tr>
                <td style="padding: 12px; background-color: #f8f9fa;"><strong>New Meeting Link:</strong></td>
                <td style="padding: 12px;"><a href="${meetingLink}" style="color: #007bff; text-decoration: none;">${meetingLink}</a></td>
              </tr>`
            : ""
        }
      </table>
      <p>Thank you for choosing <strong>Pocketclass</strong>!</p>
      <p style="color: #555; margin-top: 20px;">Best Regards,<br>Pocketclass Team</p>
    </div>
  </div>
`;

    function formatDateTime(dateTimeString) {
      const date = moment.utc(dateTimeString);
      const formattedDate = date.format("YYYYMMDD");
      const formattedTime = date.format("HHmmss");
      return `${formattedDate}T${formattedTime}`;
    }

    // Call Reschedule Booking API

    try {
      const rescheduleResponse = await fetch("/api/notifications/rescheduled", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingId,
          newStartTime: startDateTime,
          oldStartTime: bookingData.startTime,
        }),
      });
    } catch (error) {
      console.error("Error Sending Email:", error);
    }

    console.log(startDateTime);
    toast.success("Booking rescheduled successfully");
    setTimeout(() => {
      setRescheduleLoading(false);
      setRescheduleModal(false);
    }, 1700);
    updateAppointmentTime(appointmentId, startDateTime, endDateTime);
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
    <div
      className="relative flex flex-col z-[1000000000000000000000000000000000000] my-6 mb-10"
      id="booking"
    >
      <div className="flex flex-wrap-reverse gap-2 flex-row items-center justify-between mb-4">
        <div className="text-2xl font-bold text-[#E73F2B]">
          Reschedule Schedule
        </div>
        <div className="text-base text-gray-600 font-bold">
          Timezone: {timeZone || "America/Toronto"}
        </div>
      </div>
      <div className="flex flex-grow flex-col lg:flex-row">
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

        <div className="flex-grow p-4 flex flex-col bg-white overflow-y-auto">
          <div className="flex-grow mb-3">
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
                  className={`p-3 border rounded cursor-pointer ${
                    selectedSlot?.startTime === slot.startTime &&
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
                Grouped Class (Max. Num. of Students: {classData?.groupSize})
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {groupedSlots.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => handleSlotClick(slot.date, slot)}
                  className={`p-3 border rounded cursor-pointer ${
                    selectedSlot?.startTime === slot.startTime &&
                    selectedSlot?.date === slot.date
                      ? "bg-[#E73F2B] text-white"
                      : "bg-gray-100 hover:bg-[#E73F2B] hover:text-white"
                  }`}
                >
                  {slot.startTime} - {slot.endTime}
                </button>
              ))}
            </div>
            {groupedSlots.length == 0 && individualSlots.length == 0 && (
              <div className="flex flex-col items-center">
                <div className="text-gray-600 m-2 mb-0 text-lg">
                  No Time Slots available for this day
                </div>
                <button
                  onClick={() => JumpToNextAvail()}
                  className="mt-1 text-blue-600 rounded"
                >
                  Jump to next available day
                </button>
              </div>
            )}
          </div>

          {selectedSlot && (
            <div className="bg-gray-50 border-2 border-red-300 rounded p-4 ">
              <div className=" flex justify-between items-center min-[450px]:flex-row flex-col gap-4">
                <div>
                  <p>
                    <strong>Selected: </strong>
                    {moment(selectedSlot.date).format(
                      "dddd, MMMM Do YYYY"
                    )}{" "}
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
                  onClick={() => handleBookSlot()}
                  className="bg-[#E73F2B] text-white max-[450px]:w-full p-2 rounded"
                  disabled={rescheduleLoading}
                >
                  {rescheduleLoading ? "Loading..." : "Reschedule Now"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                    className={`p-2 px-4 text-logo-red border border-1 border-logo-red rounded cursor-pointer hover:bg-logo-red hover:text-white ${
                      isSelfBooking && "bg-logo-red text-white"
                    }`}
                    onClick={() => setIsSelfBooking(true)}
                  >
                    Book for Self
                  </div>
                  <div
                    className={`p-2 px-4 text-logo-red border border-1 border-logo-red rounded cursor-pointer hover:bg-logo-red hover:text-white ${
                      !isSelfBooking && "bg-logo-red text-white"
                    }`}
                    onClick={() => setIsSelfBooking(false)}
                  >
                    Book for someone else
                  </div>
                </div>
                {!isSelfBooking && (
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
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer
        position="top-center"
        autoClose={1500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="relative z-[1000000000000000000000000000000000001]" // Tailwind override
      />
    </div>
  );
}
