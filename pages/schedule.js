"use client";

import React, { useState, useEffect } from "react";
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import Select from "react-select";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-day-picker/dist/style.css";
import moment from "moment-timezone";
import { DayPicker } from "react-day-picker";
import { auth } from "../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import ReactModal from "react-modal";
import { db } from "../firebaseConfig";
import { toast } from "react-toastify";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  getDocs,
  where,
} from "firebase/firestore";
import Head from "next/head";
import NewHeader from "../components/NewHeader";

const localizer = momentLocalizer(moment);

export default function Schedule() {
  const [user, userLoading] = useAuthState(auth);
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loaded,setLoaded] = useState(false)
  const [vacationStartDate, setVacationStartDate] = useState(null);
  const [saveStatus,setSaveStatus] = useState('')
  const [vacationEndDate, setVacationEndDate] = useState(null);
  const [showVacationPicker, setShowVacationPicker] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(null);
  const [timeZones, setTimeZones] = useState([]);
  const [selectedTimeZone, setSelectedTimeZone] = useState("America/Toronto");
  const [isGroup, setIsGroup] = useState(false);

  const [events, setEvents] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDatePicker1, setShowDatePicker1] = useState(false);
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [currentView, setCurrentView] = useState("week");
  const [temporaryEvent, setTemporaryEvent] = useState(null);
  const [generalAvailability, setGeneralAvailability] = useState(
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].map((day) => ({
      day,
      slots: [],
    }))
  );
  const [adjustedAvailability, setAdjustedAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState("week");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const userTimezone = moment.tz.guess();
  const [bookedSlots, setBookedSlots] = useState([]);
  const [classes, setClasses] = useState([]);
  // Minimum and Maximum Days before which a booking can be made
  const [minDays, setMinDays] = useState(1);
  const [maxDays, setMaxDays] = useState(30);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleEventClick = (event) => {
    setSelectedBooking(event);
  };

  // Find Booking if booked on event change

  const closeModal = () => {
    setSelectedBooking(null);
  };

  const assignClass = (dayIndex, slotIndex) => {
    handleClassAssign(dayIndex, slotIndex);
  };

  const closeClassDropdown = () => {
    setShowClassDropdown(null);
  };

  const handleClassAssign = (dayIndex, slotIndex) => {
    const updatedGeneralAvailability = [...generalAvailability];
    updatedGeneralAvailability[dayIndex].slots[slotIndex].groupSlot = true;

    setGeneralAvailability(updatedGeneralAvailability);
  };

  const removeClass = (dayIndex, slotIndex) => {
    const updatedGeneralAvailability = [...generalAvailability];
    updatedGeneralAvailability[dayIndex].slots[slotIndex].groupSlot = false;
    setGeneralAvailability(updatedGeneralAvailability);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "Users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      } else {
        toast.error("User data not found");
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const northAmericanTimeZones = moment.tz
      .names()
      .filter((zone) => zone.startsWith("America/"));

    setTimeZones(
      northAmericanTimeZones.map((zone) => ({ value: zone, label: zone }))
    );
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      const classesQuery = query(
        collection(db, "classes"),
        where("classCreator", "==", user.uid)
      );

      const classesSnapshot = await getDocs(classesQuery);

      const validClasses = [];

      classesSnapshot.forEach((docSnapshot) => {
        const classData = docSnapshot.data();
        if (classData.groupSize > 1 && classData.groupPrice > 0) {
          validClasses.push({ ...classData, uid: docSnapshot.id });
        }
      });

      setClasses(validClasses);
    };

    if (user) fetchClasses();
  }, [user, userLoading]);
  useEffect(() => {
    const fetchBookedSlots = async () => {
      const bookingsQuery = query(
        collection(db, "Bookings"),
        where("instructor_id", "==", user.uid)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);

      const validBookings = [];
      bookingsSnapshot.forEach((docSnapshot) => {
        const booking = docSnapshot.data();
        const bookingStartTime = moment.utc(booking.startTime);

        //  If booking expiry time is less than current time, remove the booking
        const now = moment.utc();
        const bookingExpiry = booking.expiry
          ? moment.utc(booking.expiry)
          : null;
        if (
          booking.status === "Pending" &&
          bookingExpiry &&
          bookingExpiry.isBefore(now)
        ) {
        } else {
          validBookings.push({
            startTime: new Date(
              moment(bookingStartTime).format("YYYY-MM-DD hh:mm A")
            ),
            endTime: new Date(
              moment.utc(booking.endTime).format("YYYY-MM-DD hh:mm A")
            ),
            date: bookingStartTime.format("YYYY-MM-DD"),
            student_id: booking.student_id,
            student_name: booking.student_name,
            classId: booking.class_id,
            groupSize: booking.groupSize,
            groupEmails: booking.groupEmails,
          });
        }
      });

      setBookedSlots(validBookings);
    };

    if (user) fetchBookedSlots();
  }, [user]);
  const addVacation = () => {
    if (!vacationStartDate || !vacationEndDate) {
      toast.error("Please select a valid vacation range.");
      return;
    }

    const vacationDates = [];
    let currentDate = moment(vacationStartDate);

    while (currentDate.isSameOrBefore(vacationEndDate)) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      vacationDates.push({ date: dateStr, slots: [] });
      currentDate = currentDate.add(1, "day");
    }

    const updatedAdjustedAvailability = adjustedAvailability.filter(
      (item) =>
        !vacationDates.some((vacationDate) => vacationDate.date === item.date)
    );

    const updatedEvents = events.map((event) => {
      const eventDate = moment(event.start).startOf("day");

      if (
        eventDate.isSameOrAfter(moment(vacationStartDate).startOf("day")) &&
        eventDate.isSameOrBefore(moment(vacationEndDate).startOf("day"))
      ) {
        // ⬅️ add the `isVacation: true` flag
        return {
          ...event,
          isVacation: true,
        };
      }

      // keep event as-is (ensures no unintended mutation)
      return {
        ...event,
        isVacation: event.isVacation ?? false, // default to false if not present
      };
    });

    setAdjustedAvailability([...updatedAdjustedAvailability, ...vacationDates]);
    setEvents(updatedEvents);
    setVacationStartDate(null);
    setVacationEndDate(null);
    setShowVacationPicker(false);
  };

  useEffect(()=>{
    if(loaded===true){
      saveSchedule(db,user,generalAvailability,adjustedAvailability)
    }
  },[generalAvailability,adjustedAvailability,loaded])

  const saveSchedule = async (
    db,
    user,
    generalAvailability,
    adjustedAvailability
  ) => {
    try {
      setScheduleLoading(true);
      setSaveStatus("saving")
      const data = {
        generalAvailability,
        adjustedAvailability,
        appointmentDuration,
        timezone: selectedTimeZone,
        minDays,
        maxDays,
      };

      await setDoc(doc(db, "Schedule", user.uid), data, { merge: true });

      // toast.success("Schedule saved successfully");
      setScheduleLoading(false);
      setSaveStatus("saved")
    } catch (error) {
      toast.error("Error saving schedule");
      setScheduleLoading(false);
      setSaveStatus("error")
    }
  };

  useEffect(() => {
    if (user) {
      const loadSc = onSnapshot(
        doc(db, "Schedule", user.uid),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            if (data) {
              setGeneralAvailability(data.generalAvailability);
              setAdjustedAvailability(data.adjustedAvailability);
              setAppointmentDuration(
                data?.appointmentDuration ? data.appointmentDuration : 30
              );
              setMinDays(data?.minDays ? data.minDays : 1);
              setMaxDays(data?.maxDays ? data.maxDays : 30);
              setSelectedTimeZone(data.timezone || "America/Toronto");
              setLoaded(true)
            }
          }
        },
        (error) => {
          console.error("Error loading schedule:", error);
        }
      );

      return () => loadSc();
    }
  }, [user]);
  useEffect(() => {
    const updateView = () => {
      setView(window.innerWidth <= 768 ? "day" : "week");
    };
    updateView();
    window.addEventListener("resize", updateView);
    return () => window.removeEventListener("resize", updateView);
  }, []);

  useEffect(() => {
    if (!userLoading && !user) router.push("/");
  }, [userLoading, user]);
  const customFormats = {
    timeGutterFormat: (date, culture, localizer) =>
      localizer.format(date, "ha").replace(":00", ""),
    timeGutterFormat: (date, culture, localizer) =>
      localizer.format(date, "ha").replace("am", "AM").replace("pm", "PM"),
  };

  useEffect(() => {
    generateEvents(generalAvailability, adjustedAvailability);
  }, [
    appointmentDuration,
    generalAvailability,
    adjustedAvailability,
    bookedSlots,
  ]);

  const handleGeneralInputChange = (dayIndex, slotIndex, key, value) => {
    const updatedAvailability = [...generalAvailability];
    updatedAvailability[dayIndex].slots[slotIndex][key] = value;
    setGeneralAvailability(updatedAvailability);
  };

  const addGeneralSlot = (dayIndex) => {
    const updatedAvailability = [...generalAvailability];
    updatedAvailability[dayIndex].slots.push({
      startTime: "09:00",
      endTime: "09:30",
    });
    setGeneralAvailability(updatedAvailability);
  };

  const removeGeneralSlot = (dayIndex, slotIndex) => {
    const updatedAvailability = [...generalAvailability];
    updatedAvailability[dayIndex].slots.splice(slotIndex, 1);
    setGeneralAvailability(updatedAvailability);
  };

  const copyToAllDays = (dayIndex) => {
    const slotsToCopy = generalAvailability[dayIndex].slots.map((slot) => ({
      ...slot,
    }));

    const updatedAvailability = generalAvailability.map((day, index) => {
      if (index === dayIndex) return day;
      return {
        ...day,
        slots: slotsToCopy.map((slot) => ({ ...slot })),
      };
    });

    setGeneralAvailability(updatedAvailability);
  };

  const addAdjustedAvailabilityDate = (date) => {
    const dateStr = moment(date).format("YYYY-MM-DD");
    if (!adjustedAvailability.some((item) => item.date === dateStr)) {
      setAdjustedAvailability((prev) => [
        ...prev,
        { date: dateStr, slots: [] },
      ]);
    }
  };

  function formatDateTimeLocal1(date) {
    return new Date(date).toISOString().slice(0, 16);
  }

  const addAdjustedSlot = (date, startTime = "09:00", endTime = "09:30") => {
    const updatedAvailability = adjustedAvailability.map((item) =>
      item.date === date
        ? {
            ...item,
            slots: [...item.slots, { startTime, endTime }],
          }
        : item
    );
    setAdjustedAvailability(updatedAvailability);
  };

  const handleAdjustedInputChange = (date, slotIndex, key, value) => {
    const updatedAvailability = adjustedAvailability.map((item) => {
      if (item.date === date) {
        const updatedSlots = [...item.slots];
        updatedSlots[slotIndex][key] = value;
        return { ...item, slots: updatedSlots };
      }
      return item;
    });
    setAdjustedAvailability(updatedAvailability);
  };

  const removeAdjustedSlot = (date, slotIndex) => {
    const updatedAvailability = adjustedAvailability.map((item) =>
      item.date === date
        ? {
            ...item,
            slots: item.slots.filter((_, index) => index !== slotIndex),
          }
        : item
    );
    setAdjustedAvailability(updatedAvailability);
  };

  const removeAdjustedDate = (date) => {
    setAdjustedAvailability((prev) =>
      prev.filter((item) => item.date !== date)
    );
  };

  const generateEvents = (general, adjusted) => {
    console.log(events);
    let newEvents = [];

    // Create a map for adjusted slots and a Set for vacation dates
    const adjustedMap = {};
    const vacationDates = new Set();

    adjusted.forEach((item) => {
      if (item.slots.length === 0) {
        vacationDates.add(item.date); // mark as vacation
      } else {
        adjustedMap[item.date] = item.slots;
      }
    });

    general.forEach((day, index) => {
      for (let i = 0; i < 52; i++) {
        const currentDate = moment()
          .startOf("week")
          .add(index + 1 > 6 ? 0 : index + 1, "days")
          .add(i, "weeks");

        const formattedDate = currentDate.format("YYYY-MM-DD");

        // ❌ Skip generating events on vacation dates
        if (vacationDates.has(formattedDate)) {
          continue;
        }

        const generalSlots = day.slots || [];
        const adjustedSlots = adjustedMap[formattedDate] || [];
        const allSlots = [...generalSlots];

        adjustedSlots.forEach((adjSlot) => {
          let merged = false;
          for (let genSlot of allSlots) {
            const gStart = moment(genSlot.startTime, "HH:mm");
            const gEnd = moment(genSlot.endTime, "HH:mm");
            const aStart = moment(adjSlot.startTime, "HH:mm");
            const aEnd = moment(adjSlot.endTime, "HH:mm");

            // ✅ Only merge if they overlap (not just touch)
            if (
              aStart.isBefore(gEnd) &&
              gStart.isBefore(aEnd) &&
              !(aStart.isSame(gEnd) || gStart.isSame(aEnd)) // Prevent merging if just touching
            ) {
              genSlot.startTime = moment.min(gStart, aStart).format("HH:mm");
              genSlot.endTime = moment.max(gEnd, aEnd).format("HH:mm");
              merged = true;
              break;
            }
          }
          if (!merged) {
            allSlots.push(adjSlot);
          }
        });

        allSlots.forEach((slot) => {
          if (slot.startTime && slot.endTime) {
            const slotStart = moment(slot.startTime, "HH:mm");
            const slotEnd = moment(slot.endTime, "HH:mm");
            let current = slotStart.clone();

            while (current.isBefore(slotEnd)) {
              const next = current.clone().add(appointmentDuration, "minutes");
              if (next.isAfter(slotEnd)) break;

              const start = currentDate.clone().set({
                hour: current.hours(),
                minute: current.minutes(),
              });
              const end = currentDate.clone().set({
                hour: next.hours(),
                minute: next.minutes(),
              });

              const isBooked = bookedSlots.some(
                (bookedSlot) =>
                  moment(bookedSlot.startTime).isSame(start) ||
                  moment(bookedSlot.endTime).isSame(end) ||
                  (moment(bookedSlot.startTime).isBefore(start) &&
                    moment(bookedSlot.endTime).isAfter(start)) ||
                  (moment(bookedSlot.startTime).isBefore(end) &&
                    moment(bookedSlot.endTime).isAfter(end))
              );

              if (isBooked) {
                current = next;
                continue;
              }

              newEvents.push({
                title: slot.groupSlot ? "Group Class" : "",
                start: start.toDate(),
                end: end.toDate(),
                color: slot.groupSlot ? "#a1d564" : "#d8f5b6",
              });

              current = next;
            }
          }
        });
      }
    });

    // Render booked slots
    const groupedSlots = {};

    bookedSlots.forEach((booked) => {
      const key = `${moment(booked.startTime).format()}/${moment(
        booked.endTime
      ).format()}`;

      if (!groupedSlots[key]) {
        groupedSlots[key] = [];
      }

      if (booked.groupSize && booked.groupSize > 1) {
        for (let i = 0; i < booked.groupSize; i++) {
          groupedSlots[key].push(booked.groupEmails[i]);
        }
      } else {
        groupedSlots[key].push(booked.student_name);
      }
    });

    Object.entries(groupedSlots).forEach(([key, students]) => {
      const [start, end] = key.split("/");

      const bookingSlot = bookedSlots.find(
        (bookedSlot) =>
          moment(bookedSlot.startTime).format() === start &&
          moment(bookedSlot.endTime).format() === end
      );

      const classDetail = classes.find((c) => c.uid === bookingSlot.classId);

      newEvents.push({
        title:
          students.length === 1
            ? students[0] || "Booked by a student"
            : `${students.length} students booked`,
        start: new Date(start),
        end: new Date(end),
        color: students.length === 1 ? "#87CEEB" : "#369bc5",
        tooltip:
          students.length === 1
            ? `Class: ${classDetail?.Name}, Booked by ${students[0]}`
            : `Class: ${classDetail?.Name}\nStudents:\n- ${students.join(
                "\n- "
              )}`,
      });
    });

    // ✅ Set all generated events except vacation ones
    setEvents(newEvents);
  };

  // time slots from 30 minutes to 3 hours slotOptions

  const slotOptions = [
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 90, label: "1 hour 30 minutes" },
    { value: 120, label: "2 hours" },
    { value: 150, label: "2 hours 30 minutes" },
    { value: 180, label: "3 hours" },
    { value: 210, label: "3 hours 30 minutes" },
    { value: 240, label: "4 hours" },
  ];

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
      .toString()
      .padStart(2, "0");
    const minute = i % 2 === 0 ? "00" : "30";
    const time = `${hour}:${minute}`;
    return { value: time, label: time };
  });

  // assignAdjustedClass, removeAdjustedClass, handleClassAdjustedAssign

  const assignAdjustedClass = (date, slotIndex) => {
    handleClassAdjustedAssign(date, slotIndex);
  };
  const removeAdjustedClass = (date, slotIndex) => {
    const updatedAvailability = [...adjustedAvailability];
    updatedAvailability.find((item) => item.date === date).slots[
      slotIndex
    ].groupSlot = false;
    setAdjustedAvailability(updatedAvailability);
  };

  const handleClassAdjustedAssign = (date, slotIdex) => {
    const updatedAvailability = [...adjustedAvailability];
    updatedAvailability.find((item) => item.date === date).slots[
      slotIdex
    ].groupSlot = true;
    const slotFind = updatedAvailability.find((item) => item.date === date)
      .slots[slotIdex];
    setAdjustedAvailability(updatedAvailability);
  };
  const handleSlotSelect = (slotInfo) => {
    const { start, end: selectedEnd } = slotInfo;

    const selectedDuration = (selectedEnd - start) / (1000 * 60); // in minutes

    // Round up to nearest multiple of appointmentDuration
    const multiplier = Math.ceil(selectedDuration / appointmentDuration);
    const adjustedMinutes = multiplier * appointmentDuration;

    const adjustedEnd = new Date(start);
    adjustedEnd.setMinutes(start.getMinutes() + adjustedMinutes);

    const newSlot = {
      start,
      end: adjustedEnd,
      title: `${start.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })} - ${adjustedEnd.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      color: "#D8F5B6", // light green
    };

    setSelectedSlot(newSlot);
    setTemporaryEvent(newSlot);
    setShowPopup(true);
  };

  const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  function ResponsiveLabel({ label }) {
    const [isSmallScreen, setIsSmallScreen] = useState(
      typeof window !== "undefined" && window.innerWidth < 350
    );

    useEffect(() => {
      const handleResize = () => {
        setIsSmallScreen(window.innerWidth < 350);
      };

      // Listen to window resize
      window.addEventListener("resize", handleResize);

      // Clean up
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const firstSpaceIndex = label.indexOf(" ");

    // if (!isSmallScreen || firstSpaceIndex === -1) {
    //   return <span className="font-bold mr-2 text-center leading-tight">{label}</span>;
    // }

    const firstPart = label.slice(0, firstSpaceIndex);
    const secondPart = label.slice(firstSpaceIndex + 1);

    return (
      <p
        className="font-bold flex flex-col dm1:flex-row mr-2 text-center leading-tight"
        style={{
          fontWeight: "bold",
          marginRight: "8px",
          whiteSpace: "nowrap",
          flexShrink: 1,
        }}
      >
        <p className="block mr-1">{firstPart}</p>
        <p className="block whitespace-nowrap">{secondPart}</p>
      </p>
    );
  }

  const renderStatus = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <p className="flex items-center text-sm text-gray-500">
            <svg
              className="w-4 h-4 mr-1 animate-spin text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Saving...
          </p>
        );
      case "saved":
        return (
          <p className="flex items-center text-sm text-gray-500">
            <svg
              className="w-4 h-4 mr-1 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </p>
        );
      case "error":
        return (
          <p className="flex items-center text-sm text-red-500">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Error saving
          </p>
        );
      default:
        return (
          <p className="text-sm text-gray-400">
            All changes saved
          </p>
        );
    }
  };

  function CustomToolbar({ label, onNavigate, onView, view, views }) {
    return (
      <div
        className="rbc-toolbar dm1:px-4 py-4 dm1:bg-white-500 dm1:shadow-md bg-transparent shadow-none"
        style={{
          display: "flex",
          flexWrap: "nowrap",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          borderRadius: "5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            onClick={() => onNavigate("TODAY")}
            style={{ marginRight: "8px", minWidth: 0 }}
          >
            Today
          </div>
          <div
            onClick={() => onNavigate("PREV")}
            className="dm1:px-0 px-2 prev"
            style={{
              marginRight: "8px",
              background: "none",
              border: "none",
              minWidth: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M13.293 16.293a1 1 0 010-1.414L9.414 11l3.879-3.879a1 1 0 00-1.414-1.414l-4.586 4.586a1 1 0 000 1.414l4.586 4.586a1 1 0 001.414-1.414z" />
            </svg>
          </div>
          <ResponsiveLabel label={label} />
          <div
            onClick={() => onNavigate("NEXT")}
            className="prev"
            style={{ background: "none", border: "none" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6.707 16.293a1 1 0 000-1.414L10.586 11 6.707 7.121a1 1 0 011.414-1.414l4.586 4.586a1 1 0 010 1.414l-4.586 4.586a1 1 0 01-1.414 0z" />
            </svg>
          </div>
          <div className="hidden dm:block">
            {renderStatus()}
          </div>
        </div>
        <h2>Common Schedule</h2>

        <div>
          <select
            value={view}
            onChange={(e) => onView(e.target.value)}
            style={{
              padding: "6px 8px",
              width: "80px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              outline: "none",
              boxShadow: "none",
            }}
          >
            {views
              .filter((v) => v !== "Agenda")
              .map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </option>
              ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:h-screen">
      <Head>
        <title>Schedule</title>
        <meta name="description" content="Manage your Schedule" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      <NewHeader />

      <div className="flex flex-grow flex-col lg:flex-row overflow-hidden bg-gray-50 text-black">
        <div className="overflow-auto p-4 border-r bg-white shadow-md">
          {userData &&
          userData.googleCalendar &&
          userData.googleCalendar.accessToken ? (
            <div className="flex items-center mb-4 px-4 py-2 border border-green-500 text-green-600 bg-green-50 rounded-md space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 17H5V10h14v10zm0-12H5V5h14v3z" />
              </svg>
              <span className="font-medium">Google Calendar Connected!</span>
            </div>
          ) : (
            <a
              href="/api/googleCalendar"
              className="hidden lg:inline-flex items-center space-x-2 border-gray-400 border text-gray-600 px-4 py-2 rounded-md my-4 shadow transition duration-200 hover:border-blue-600"
            >
              <img className="w-5 h-5" src="/Google_Calendar_icon.svg" alt="Google Icon" />
              <span className="font-medium">Connect to <b>Google Calendar</b></span>
            </a>
          )}

          <h2 className="text-2xl font-bold text-gray-700 mb-3">
            Appointment Duration
          </h2>

          <div className="mb-6">
            <label
              htmlFor="appointment-duration"
              className="block font-semibold text-gray-600 mb-2"
            >
              How long should each appointment last?
            </label>

            <Select
              value={slotOptions.find(
                (option) => option.value === appointmentDuration
              )}
              onChange={(selected) => setAppointmentDuration(selected.value)}
              options={slotOptions}
              className="w-full"
            />
          </div>

          <h2 className="text-2xl font-bold text-gray-700 mb-3">Timezone</h2>

          <div className="mb-6">
            <label
              htmlFor="appointment-duration"
              className="block font-semibold text-gray-600 mb-2"
            >
              Which timezone are you currently in?
            </label>

            <Select
              value={timeZones.find(
                (option) => option.value === selectedTimeZone
              )}
              onChange={(selected) => setSelectedTimeZone(selected.value)}
              options={timeZones}
              className="w-full"
            />
          </div>

          {/* Buttons Information(Kind of like an index) */}
          <h2 className="text-2xl font-bold text-gray-700 mb-5">
            Instructions
          </h2>
          <div className="flex flex-row justify-between flex-wrap items-start mb-6 gap-3">
            <div className="flex max-w-[80px] flex-col items-center justify-center font-semibold text-sm">
              <span className="material-symbols-outlined text-xs text-red-500 flex justify-center items-center">
                block
              </span>
              <div className="text-center">Remove Time Slot</div>
            </div>
            <div className="flex max-w-[80px] flex-col items-center justify-center font-semibold text-sm">
              <span className="material-symbols-outlined text-xs text-blue-500 flex justify-center items-center">
                add_circle
              </span>
              <div className="text-center">Add Time Slot</div>
            </div>
            <div className="flex max-w-[80px] flex-col items-center justify-center font-semibold text-sm">
              <span className="material-symbols-outlined text-xs text-gray-500 flex justify-center items-center">
                content_copy
              </span>
              <div className="text-center">Copy to all</div>
            </div>
            <div className="flex max-w-[80px] flex-col items-center justify-center font-semibold text-sm">
              <span className="material-symbols-outlined text-xs text-blue-500 flex justify-center items-center">
                groups
              </span>
              <div className="text-center">Assign Group Slot</div>
            </div>
            <div className="flex max-w-[80px] flex-col items-center justify-center font-semibold text-sm">
              <span className="material-symbols-outlined text-xs text-red-500 flex justify-center items-center">
                group_remove
              </span>
              <div className="text-center">Remove Group Slot</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-700 mb-6">
            General Availability
          </h2>
          <label
            htmlFor="general-availability"
            className="block font-semibold text-gray-600 mb-4"
          >
            Set when you're regularly available for appointments
          </label>
          {generalAvailability.map((day, dayIndex) => (
            <div key={dayIndex} className="mb-6">
              <div className="flex justify-between flex-row items-start">
                <h3 className="font-semibold mt-[7px] mr-4 w-[95px] lg:col-span-1 text-gray-600">
                  {day.day}
                </h3>
                <div className="hidden lg:block mr-2">
                  {day.slots.length === 0 ? (
                    <p className="text-gray-500 mt-[7px]">Unavailable</p>
                  ) : (
                    day.slots.map((slot, slotIndex) => (
                      <div>
                        <div
                          key={slotIndex}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <Select
                            value={timeOptions.find(
                              (option) => option.value === slot.startTime
                            )}
                            onChange={(selected) =>
                              handleGeneralInputChange(
                                dayIndex,
                                slotIndex,
                                "startTime",
                                selected.value
                              )
                            }
                            options={timeOptions}
                            className="w-full min-w-[70px]"
                            components={{
                              DropdownIndicator: () => null,
                              IndicatorSeparator: () => null,
                            }}
                          />
                          <span>-</span>
                          <Select
                            value={timeOptions.find(
                              (option) => option.value === slot.endTime
                            )}
                            onChange={(selected) =>
                              handleGeneralInputChange(
                                dayIndex,
                                slotIndex,
                                "endTime",
                                selected.value
                              )
                            }
                            options={timeOptions}
                            className="w-full min-w-[70px]"
                            components={{
                              DropdownIndicator: () => null,
                              IndicatorSeparator: () => null,
                            }}
                          />
                          <button
                            onClick={() =>
                              removeGeneralSlot(dayIndex, slotIndex)
                            }
                            className="text-red-500 flex justify-center items-center hover:text-red-600"
                            title="Unavailable for this time slot"
                          >
                            <span className="material-symbols-outlined text-xs">
                              block
                            </span>
                          </button>
                          <button
                            onClick={() => assignClass(dayIndex, slotIndex)}
                            className={`text-blue-400 ${
                              slot.groupSlot ? "hidden" : ""
                            } flex justify-center items-center hover:text-blue-600`}
                            title="Assign Class"
                          >
                            <span className="material-symbols-outlined text-xs">
                              <span class="material-symbols-outlined">
                                groups
                              </span>
                            </span>
                          </button>

                          <button
                            onClick={() => removeClass(dayIndex, slotIndex)}
                            className={`text-red-500 flex justify-center items-center hover:text-red-600 ${
                              slot.groupSlot ? "" : "hidden"
                            }`}
                            title="Remove Class"
                          >
                            <span className="material-symbols-outlined text-xs">
                              group_remove
                            </span>
                          </button>
                        </div>

                        {showClassDropdown &&
                          showClassDropdown.dayIndex === dayIndex &&
                          showClassDropdown.slotIndex === slotIndex && (
                            <div className="bg-white border rounded-md shadow-md mt-2 mb-3 z-10">
                              <ul>
                                {classes.map((classItem) => (
                                  <li
                                    key={classItem.uid}
                                    onClick={() => {
                                      handleClassAssign(
                                        dayIndex,
                                        slotIndex,
                                        classItem.uid
                                      );
                                      closeClassDropdown();
                                    }}
                                    className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                                  >
                                    {classItem?.Name}
                                  </li>
                                ))}
                              </ul>
                              {classes.length === 0 && (
                                <p className="px-4 py-2 text-gray-500">
                                  No group classes available
                                </p>
                              )}
                              <button
                                onClick={closeClassDropdown}
                                className="block w-full mb-2 text-center text-red-500 hover:text-red-600"
                              >
                                Close
                              </button>
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex mt-[7px] space-x-2 justify-end">
                  <button
                    onClick={() => addGeneralSlot(dayIndex)}
                    className="text-blue-500 hover:text-blue-600"
                    title="Add another period to this day"
                  >
                    <span className="material-symbols-outlined">
                      add_circle
                    </span>
                  </button>
                  <button
                    onClick={() => copyToAllDays(dayIndex)}
                    className="text-gray-500 hover:text-gray-600"
                    title="Copy To All"
                  >
                    <span className="material-symbols-outlined">
                      content_copy
                    </span>
                  </button>
                </div>
              </div>

              <div className="col-span-3 block mt-2 lg:hidden">
                {day.slots.length === 0 ? (
                  <p className="text-gray-500">Unavailable</p>
                ) : (
                  day.slots.map((slot, slotIndex) => (
                    <div>
                      <div
                        key={slotIndex}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Select
                          value={timeOptions.find(
                            (option) => option.value === slot.startTime
                          )}
                          onChange={(selected) =>
                            handleGeneralInputChange(
                              dayIndex,
                              slotIndex,
                              "startTime",
                              selected.value
                            )
                          }
                          options={timeOptions}
                          className="w-full bg-gray-100 min-w-[70px]"
                          styles={{
                            menu: (provided) => ({
                              ...provided,
                              maxHeight: "300px",
                            }),
                          }}
                          components={{
                            DropdownIndicator: () => null,
                            IndicatorSeparator: () => null,
                          }}
                        />

                        <span>-</span>
                        <Select
                          value={timeOptions.find(
                            (option) => option.value === slot.endTime
                          )}
                          onChange={(selected) =>
                            handleGeneralInputChange(
                              dayIndex,
                              slotIndex,
                              "endTime",
                              selected.value
                            )
                          }
                          options={timeOptions}
                          className="w-full bg-gray-100 min-w-[70px]"
                          styles={{
                            menu: (provided) => ({
                              ...provided,
                              maxHeight: "300px",
                            }),
                          }}
                          components={{
                            DropdownIndicator: () => null,
                            IndicatorSeparator: () => null,
                          }}
                        />
                        <button
                          onClick={() => assignClass(dayIndex, slotIndex)}
                          className={`text-blue-400 ${
                            slot.groupSlot ? "hidden" : ""
                          } flex justify-center items-center hover:text-blue-600`}
                          title="Assign Class"
                        >
                          <span className="material-symbols-outlined text-xs">
                            groups
                          </span>
                        </button>

                        <button
                          onClick={() => removeClass(dayIndex, slotIndex)}
                          className={`text-red-500 flex justify-center items-center hover:text-red-600 ${
                            slot.groupSlot ? "" : "hidden"
                          }`}
                          title="Remove Class"
                        >
                          <span className="material-symbols-outlined text-xs">
                            group_remove
                          </span>
                        </button>
                        <button
                          onClick={() => removeGeneralSlot(dayIndex, slotIndex)}
                          className="text-red-500 flex justify-center items-center hover:text-red-600"
                          title="Unavailable for this time slot"
                        >
                          <span className="material-symbols-outlined text-xs">
                            block
                          </span>
                        </button>
                      </div>

                      {showClassDropdown &&
                        showClassDropdown.dayIndex === dayIndex &&
                        showClassDropdown.slotIndex === slotIndex && (
                          <div className="bg-white border rounded-md shadow-md mt-2 mb-3 z-10">
                            <ul>
                              {classes.map((classItem) => (
                                <li
                                  key={classItem.uid}
                                  onClick={() => {
                                    handleClassAssign(
                                      dayIndex,
                                      slotIndex,
                                      classItem.uid
                                    );
                                    closeClassDropdown();
                                  }}
                                  className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                                >
                                  {classItem?.Name}
                                </li>
                              ))}
                            </ul>
                            {classes.length === 0 && (
                              <p className="px-4 py-2 text-gray-500">
                                No group classes available
                              </p>
                            )}
                            <button
                              onClick={closeClassDropdown}
                              className="block w-full text-center text-red-500 mb-2 hover:text-red-600"
                            >
                              Close
                            </button>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
          <h2 className="text-2xl font-bold text-gray-700 mb-6">
            Adjusted Availability
          </h2>
          <label
            htmlFor="general-availability"
            className="block font-semibold text-gray-600 mb-4"
          >
            Indicate times you are available for specific dates
          </label>
          <div className="mb-6">
            <button
              className="px-4 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-600 mb-4"
              onClick={() => {
                setShowDatePicker(true);
                setShowVacationPicker(false);
              }}
            >
              Change a Date's Availability
            </button>
            <button
              className="px-4 ml-2 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-600 mb-4"
              onClick={() => {
                setShowVacationPicker(true);
                setShowDatePicker(false);
              }}
            >
              Add Vacation
            </button>

            {showVacationPicker && (
              <div className="bg-white p-4 w-max rounded-md shadow-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Select Vacation Dates
                </h3>
                <DayPicker
                  mode="range"
                  selected={{ from: vacationStartDate, to: vacationEndDate }}
                  onSelect={(range) => {
                    if (range) {
                      setVacationStartDate(range.from);
                      setVacationEndDate(range.to);
                    }
                  }}
                  className="p-2 bg-white-100 text-sm"
                  disabled={{ before: new Date() }}
                />
                <div className="flex justify-end mt-2">
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2"
                    onClick={addVacation}
                  >
                    Add Vacation
                  </button>
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    onClick={() => setShowVacationPicker(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {showDatePicker && (
              <div className=" bg-white p-4 w-max rounded-md shadow-lg">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) addAdjustedAvailabilityDate(date);
                    setShowDatePicker(false);
                  }}
                  className="border rounded p-2 bg-gray-100 text-sm"
                />
                <button
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  onClick={() => setShowDatePicker(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
          {adjustedAvailability.map((item) => (
            <div key={item.date} className="mb-6">
              <div className="flex flex-row justify-between items-start">
                <h3 className="font-semibold mt-[7px]  w-[95px] text-gray-600">
                  {item.date}
                </h3>
                <div className="hidden lg:block">
                  {item.slots.length === 0 ? (
                    <p className="text-gray-500">Unavailable</p>
                  ) : (
                    item.slots.map((slot, slotIndex) => (
                      <div>
                        <div
                          key={slotIndex}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <Select
                            value={timeOptions.find(
                              (option) => option.value === slot.startTime
                            )}
                            onChange={(selected) =>
                              handleAdjustedInputChange(
                                item.date,
                                slotIndex,
                                "startTime",
                                selected.value
                              )
                            }
                            options={timeOptions}
                            className="w-full min-w-[70px]"
                            styles={{
                              menu: (provided) => ({
                                ...provided,
                                maxHeight: "300px",
                              }),
                            }}
                            components={{
                              DropdownIndicator: () => null,
                              IndicatorSeparator: () => null,
                            }}
                          />

                          <span>-</span>
                          <Select
                            value={timeOptions.find(
                              (option) => option.value === slot.endTime
                            )}
                            onChange={(selected) =>
                              handleAdjustedInputChange(
                                item.date,
                                slotIndex,
                                "endTime",
                                selected.value
                              )
                            }
                            options={timeOptions}
                            className="w-full min-w-[70px]"
                            styles={{
                              menu: (provided) => ({
                                ...provided,
                                maxHeight: "300px",
                              }),
                            }}
                            components={{
                              DropdownIndicator: () => null,
                              IndicatorSeparator: () => null,
                            }}
                          />
                          <button
                            onClick={() =>
                              removeAdjustedSlot(item.date, slotIndex)
                            }
                            className="text-red-500 flex items-center justify-center hover:text-red-600"
                            title="Unavailable for this time slot"
                          >
                            <span className="text-xs material-symbols-outlined  ">
                              block
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              assignAdjustedClass(item.date, slotIndex)
                            }
                            className={`text-blue-400 ${
                              slot.groupSlot ? "hidden" : ""
                            } flex justify-center items-center hover:text-blue-600`}
                            title="Assign Class"
                          >
                            <span className="material-symbols-outlined text-xs">
                              groups
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              removeAdjustedClass(item.date, slotIndex)
                            }
                            className={`text-red-500 ${
                              slot.groupSlot ? "" : "hidden"
                            } flex justify-center items-center hover:text-red-600`}
                            title="Remove Class"
                          >
                            <span className="material-symbols-outlined text-xs">
                              group_remove
                            </span>
                          </button>
                        </div>
                        {showClassDropdown &&
                          showClassDropdown.date === item.date &&
                          showClassDropdown.slotIndex === slotIndex && (
                            <div className="bg-white border rounded-md shadow-md mb-3 mt-2 z-10">
                              <ul>
                                {classes.map((classItem) => (
                                  <li
                                    key={classItem.uid}
                                    onClick={() => {
                                      handleClassAdjustedAssign(
                                        item.date,
                                        slotIndex,
                                        classItem.uid
                                      );
                                      closeClassDropdown();
                                    }}
                                    className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                                  >
                                    {classItem?.Name}
                                  </li>
                                ))}
                              </ul>
                              {classes.length === 0 && (
                                <p className="px-4 py-2 text-gray-500">
                                  No group classes available
                                </p>
                              )}
                              <button
                                onClick={closeClassDropdown}
                                className="block w-full text-center text-red-500 hover:text-red-600"
                              >
                                Close
                              </button>
                            </div>
                          )}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex mt-[7px] space-x-2 justify-end">
                  <button
                    onClick={() => addAdjustedSlot(item.date)}
                    className="text-blue-500 hover:text-blue-600"
                    title="Add another period to this day"
                  >
                    <span className="material-symbols-outlined">
                      add_circle
                    </span>
                  </button>
                  <button
                    onClick={() => removeAdjustedDate(item.date)}
                    className="text-red-500 hover:text-red-600"
                    title="Remove Date"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="block lg:hidden">
                {item.slots.length === 0 ? (
                  <p className="text-gray-500">Unavailable</p>
                ) : (
                  item.slots.map((slot, slotIndex) => (
                    <div>
                      <div
                        key={slotIndex}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Select
                          value={timeOptions.find(
                            (option) => option.value === slot.startTime
                          )}
                          onChange={(selected) =>
                            handleAdjustedInputChange(
                              item.date,
                              slotIndex,
                              "startTime",
                              selected.value
                            )
                          }
                          options={timeOptions}
                          className="w-full min-w-[70px]"
                          styles={{
                            menu: (provided) => ({
                              ...provided,
                              maxHeight: "300px",
                            }),
                          }}
                          components={{
                            DropdownIndicator: () => null,
                            IndicatorSeparator: () => null,
                          }}
                        />

                        <span>-</span>
                        <Select
                          value={timeOptions.find(
                            (option) => option.value === slot.endTime
                          )}
                          onChange={(selected) =>
                            handleAdjustedInputChange(
                              item.date,
                              slotIndex,
                              "endTime",
                              selected.value
                            )
                          }
                          options={timeOptions}
                          className="w-full min-w-w[70px]"
                          styles={{
                            menu: (provided) => ({
                              ...provided,
                              maxHeight: "300px",
                            }),
                          }}
                          components={{
                            DropdownIndicator: () => null,
                            IndicatorSeparator: () => null,
                          }}
                        />

                        <button
                          onClick={() =>
                            assignAdjustedClass(item.date, slotIndex)
                          }
                          className={`text-blue-400 ${
                            slot.groupSlot ? "hidden" : ""
                          } flex justify-center items-center hover:text-blue-600`}
                          title="Assign Class"
                        >
                          <span className="material-symbols-outlined text-xs">
                            groups
                          </span>
                        </button>
                        <button
                          onClick={() =>
                            removeAdjustedClass(item.date, slotIndex)
                          }
                          className={`text-red-500 ${
                            slot.groupSlot ? "" : "hidden"
                          } flex justify-center items-center hover:text-red-600`}
                          title="Remove Class"
                        >
                          <span className="material-symbols-outlined text-xs">
                            group_remove
                          </span>
                        </button>
                      </div>
                      {showClassDropdown &&
                        showClassDropdown.date === item.date &&
                        showClassDropdown.slotIndex === slotIndex && (
                          <div className="bg-white border rounded-md shadow-md mt-2 mb-3 z-10">
                            <ul>
                              {classes.map((classItem) => (
                                <li
                                  key={classItem.uid}
                                  onClick={() => {
                                    handleClassAdjustedAssign(
                                      item.date,
                                      slotIndex,
                                      classItem.uid
                                    );
                                    closeClassDropdown();
                                  }}
                                  className="px-4 py-2 hover:bg-gray-200 cursor-pointer"
                                >
                                  {classItem?.Name}
                                </li>
                              ))}
                            </ul>
                            {classes.length === 0 && (
                              <p className="px-4 py-2 text-gray-500">
                                No group classes available
                              </p>
                            )}
                            <button
                              onClick={closeClassDropdown}
                              className="block w-full text-center text-red-500 hover:text-red-600"
                            >
                              Close
                            </button>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          <h2 className="text-2xl font-bold text-gray-700 mb-3">
            Booking Restrictions
          </h2>
          <div className="mb-6">
            <label
              htmlFor="min-days"
              className="block font-semibold text-gray-600 mb-2"
            >
              Minimum Hours Before Booking
            </label>
            <input
              type="number"
              value={minDays}
              onChange={(e) => setMinDays(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
          <div className="mb-6">
            <label
              htmlFor="max-days"
              className="block font-semibold text-gray-600 mb-2"
            >
              Maximum Days Before Booking
            </label>
            <input
              type="number"
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <div className="flex-grow p-4">
          <div className="dm1:mb-0 mb-8">
            <div className="dm:hidden block">
              {renderStatus()}
            </div>
            <BigCalendar
              selectable
              timeslots={2}
              timeStep={30}
              defaultView={view}
              localizer={localizer}
              events={
                temporaryEvent
                  ? [...events.filter((e) => !e.isVacation), temporaryEvent]
                  : events.filter((e) => !e.isVacation)
              }
              startAccessor="start"
              endAccessor="end"
              style={{ height: "calc(100vh - 150px)" }}
              formats={customFormats}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: event.color,
                  fontSize: "12px",
                },
              })}
              views={["month", "week", "day"]}
              onView={(view) => setCurrentView(view)}
              components={{ toolbar: CustomToolbar }}
              onSelectSlot={handleSlotSelect}
              scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
              tooltipAccessor="tooltip"
              onSelectEvent={handleEventClick} // Event click handler
            />
          </div>
          <div
            className="
    flex justify-end 
    dm1:static dm1:w-auto 
    fixed bottom-0 left-0 w-full 
    bg-white z-50
    pb-1
    dm1:px-0 px-3
  "
          ></div>

          {showPopup && selectedSlot && (
            <div
              className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-10 z-[10000] flex items-center justify-center"
              onClick={() => {
                setShowPopup(false);
                setTemporaryEvent(null);
              }}
            >
              <div className="relative bg-white p-6 rounded-xl z-[10000] shadow-lg w-[300px] popup dm1:w-[400px]" onClick={(e) => e.stopPropagation()}>
                <h3>Add Availability</h3>

                <div className="flex flex-col dm1:flex-row items-start mt-2 justify-start gap-2 py-2 text-sm rounded cursor-pointer">
                  <span
                    onClick={() => setShowDatePicker1(!showDatePicker1)}
                    className="whitespace-nowrap border rounded px-4 py-1 min-h-[41px] bg-white shadow-sm cursor-pointer flex items-center"
                  >
                    {(() => {
                      const startDate = new Date(selectedSlot.start);
                      const endDate = new Date(selectedSlot.end);

                      const formatDate = (date) =>
                        date.toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });

                      const isSameDay =
                        startDate.toDateString() === endDate.toDateString();

                      return isSameDay
                        ? formatDate(startDate)
                        : `${formatDate(startDate)} – ${formatDate(endDate)}`;
                    })()}
                  </span>
                  <div className="flex items-center">
                    <Select
                      value={timeOptions.find(
                        (option) =>
                          option.value ===
                          `${new Date(selectedSlot.start)
                            .getHours()
                            .toString()
                            .padStart(2, "0")}:${new Date(selectedSlot.start)
                            .getMinutes()
                            .toString()
                            .padStart(2, "0")}`
                      )}
                      onChange={(selected) => {
                        const [hours, minutes] = selected.value
                          .split(":")
                          .map(Number);
                        const updatedStart = new Date(selectedSlot.start);

                        updatedStart.setHours(hours);
                        updatedStart.setMinutes(minutes);
                        updatedStart.setSeconds(0);
                        updatedStart.setMilliseconds(0);

                        setSelectedSlot((prev) => {
                          // Adjust the start and end times to ensure they are in the correct order
                          const adjustedStart =
                            updatedStart < prev.end ? updatedStart : prev.end;
                          const adjustedEnd =
                            updatedStart < prev.end ? prev.end : updatedStart;

                          const newSlot = {
                            ...prev,
                            start: adjustedStart,
                            end: adjustedEnd,
                          };

                          // Update the input field for start time
                          const startInput =
                            document.getElementById("startTimeInput");
                          if (startInput) {
                            startInput.value =
                              formatDateTimeLocal(adjustedStart);
                          }

                          // Set the temporary event with adjusted times
                          setTemporaryEvent({
                            start: adjustedStart, // Set the adjusted start time
                            end: adjustedEnd, // Set the adjusted end time
                            title: `${adjustedStart.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${adjustedEnd.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`,
                            color: "#D8F5B6", // light green
                          });
                          return newSlot; // Return the updated slot with adjusted start and end times
                        });

                        // slotInfo = selectedSlot
                        // setTemporaryEvent({
                        //   start: slotInfo.start,
                        //   end: slotInfo.end,
                        //   title: ${slotInfo.start.toLocaleTimeString([], {
                        //     hour: "2-digit",minute: "2-digit",})}-${slotInfo.end.toLocaleTimeString([], {
                        //     hour: "2-digit",minute: "2-digit",})},
                        //   color: "#D8F5B6", // light green
                        // })
                      }}
                      options={timeOptions}
                      className="text-sm w-fit mr-2"
                      classNames={{
                        control: () =>
                          "border rounded min-w-[70px] px-0 py-1 min-h-[36px] bg-white shadow-sm cursor-pointer",
                        option: ({ isFocused }) =>
                          `px-2 py-1 cursor-pointer ${
                            isFocused ? "bg-gray-100" : ""
                          }`,
                        singleValue: () => "text-sm",
                        menu: () =>
                          "z-50 bg-white shadow-lg border rounded mt-1",
                      }}
                      components={{
                        DropdownIndicator: () => null,
                        IndicatorSeparator: () => null,
                      }}
                    />

                    <span>-</span>

                    <Select
                      value={timeOptions.find(
                        (option) =>
                          option.value ===
                          `${new Date(selectedSlot.end)
                            .getHours()
                            .toString()
                            .padStart(2, "0")}:${new Date(selectedSlot.end)
                            .getMinutes()
                            .toString()
                            .padStart(2, "0")}`
                      )}
                      onChange={(selected) => {
                        const [hours, minutes] = selected.value
                          .split(":")
                          .map(Number);
                        const updatedEnd = new Date(selectedSlot.end);

                        updatedEnd.setHours(hours);
                        updatedEnd.setMinutes(minutes);
                        updatedEnd.setSeconds(0);
                        updatedEnd.setMilliseconds(0);

                        setSelectedSlot((prev) => {
                          // Adjust the start and end times to ensure they are in the correct order
                          const adjustedStart =
                            updatedEnd < prev.start ? updatedEnd : prev.start;
                          const adjustedEnd =
                            updatedEnd < prev.start ? prev.start : updatedEnd;

                          const newSlot = {
                            ...prev,
                            start: adjustedStart,
                            end: adjustedEnd,
                          };

                          // Update the input field for start time
                          const startInput =
                            document.getElementById("startTimeInput");
                          if (startInput) {
                            startInput.value =
                              formatDateTimeLocal(adjustedStart);
                          }

                          // Set the temporary event with adjusted times
                          setTemporaryEvent({
                            start: adjustedStart, // Set the adjusted start time
                            end: adjustedEnd, // Set the adjusted end time
                            title: `${adjustedStart.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${adjustedEnd.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`,
                            color: "#D8F5B6", // light green
                          });
                          return newSlot; // Return the updated slot with adjusted start and end times
                        });
                      }}
                      options={timeOptions}
                      className="text-sm w-fit ml-2"
                      classNames={{
                        control: () =>
                          "border rounded px-0 py-1 min-w-[70px] focus:outline-none focus:ring-0 focus:border-none min-h-[36px] bg-white shadow-sm cursor-pointer",
                        option: ({ isFocused }) =>
                          `px-2 py-1 cursor-pointer ${
                            isFocused ? "bg-gray-100" : ""
                          }`,
                        singleValue: () => "text-sm",
                        menu: () =>
                          "z-50 bg-white shadow-lg border rounded mt-1",
                      }}
                      components={{
                        DropdownIndicator: () => null,
                        IndicatorSeparator: () => null,
                      }}
                    />
                  </div>
                </div>
                {showDatePicker1 && (
                  <div className=" absolute max-h-[0vh] p-4 w-[390px] dm1:scale-100 scale-75 bg-transparent">
                    <div className="relative dm1:left-[-20px] left-[-100px] dm1:top-[-20px] top-[-100px] mt-3 border rounded-md p-3 bg-white">
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (!date || !selectedSlot) return;

                          const startInput =
                            document.getElementById("startTimeInput");
                          const endInput =
                            document.getElementById("endTimeInput");

                          const oldStart = new Date(selectedSlot.start);
                          const oldEnd = new Date(selectedSlot.end);

                          const updatedStart = new Date(date);
                          updatedStart.setHours(
                            oldStart.getHours(),
                            oldStart.getMinutes(),
                            0,
                            0
                          );

                          const updatedEnd = new Date(date);
                          updatedEnd.setHours(
                            oldEnd.getHours(),
                            oldEnd.getMinutes(),
                            0,
                            0
                          );

                          const pad = (n) => String(n).padStart(2, "0");
                          const format = (d) =>
                            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
                              d.getDate()
                            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

                          if (startInput && endInput) {
                            startInput.value = format(updatedStart);
                            endInput.value = format(updatedEnd);
                          }

                          // ✅ Update selected slot
                          setSelectedSlot({
                            start: updatedStart,
                            end: updatedEnd,
                          });

                          // ✅ Update temporary event
                          setTemporaryEvent({
                            start: updatedStart,
                            end: updatedEnd,
                            title: `${updatedStart.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })} - ${updatedEnd.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`,
                            color: "#D8F5B6",
                          });

                          setSelectedDate(date);
                          setShowDatePicker1(false);
                        }}
                        className="border rounded p-2 bg-gray-100 text-sm z-[1001]"
                      />

                      <button
                        className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        onClick={() => setShowDatePicker1(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                <label style={{ display: "none" }}>
                  Start:
                  <input
                    id="startTimeInput"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(selectedSlot.start)}
                  />
                </label>

                <label style={{ display: "none" }}>
                  End:
                  <input
                    id="endTimeInput"
                    type="datetime-local"
                    defaultValue={formatDateTimeLocal(selectedSlot.end)}
                  />
                </label>

                <label>
                  Repeat:
                  <select
                    id="repeatSelect"
                    className="border rounded border-gray-300"
                  >
                    <option>Does not repeat</option>
                    <option>Daily</option>
                    <option>
                      Weekly on{" "}
                      {new Date(selectedSlot.start).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                        }
                      )}
                    </option>
                    <option>Every weekday (Monday to Friday)</option>
                  </select>
                </label>

                {/* Group class checkbox properly styled and aligned */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  <input
                    id="groupCheckbox"
                    type="checkbox"
                    checked={isGroup}
                    onChange={(e) => setIsGroup(e.target.checked)}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      height: "18px",
                      width: "18px",
                      borderRadius: "4px",
                      border: "2px solid #ccc",
                      backgroundColor: isGroup ? "#EF4444" : "#fff", // red when checked
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      outline: "none", // kill outline on focus
                      boxShadow: "none", // kill any browser shadow
                    }}
                    onFocus={(e) => {
                      e.target.style.outline = "none";
                      e.target.style.boxShadow = "none";
                    }}
                    onBlur={(e) => {
                      e.target.style.outline = "none";
                      e.target.style.boxShadow = "none";
                    }}
                  />

                  <label
                    htmlFor="groupCheckbox"
                    style={{ margin: 0, fontSize: "14px" }}
                  >
                    Group class
                  </label>
                </div>

                <button
                  className="border border-red-500 text-red-500 rounded-md hover:bg-red-50 mr-4 w-fit"
                  style={{ padding: "8px 14px" }}
                  onClick={() => {
                    setShowPopup(false);
                    setTemporaryEvent(null);
                  }}
                >
                  Close
                </button>
                <button
                  className="bg-red-500 text-white rounded-md hover:bg-red-600"
                  style={{ padding: "9px 20px" }}
                  onClick={() => {
                    const startTime = selectedSlot.start.toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }
                    );

                    const endTime = selectedSlot.end.toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }
                    );

                    const date = selectedSlot.start.toISOString().slice(0, 10);

                    const newSlot = {
                      startTime,
                      endTime,
                      ...(isGroup && { groupSlot: true }),
                    };

                    const updateAvailability = (daysArray) => {
                      setGeneralAvailability((prev) => {
                        const updated = [...prev];

                        daysArray.forEach((day) => {
                          const index = updated.findIndex(
                            (item) => item.day === day
                          );

                          if (index === -1) {
                            updated.push({ day, slots: [newSlot] });
                          } else {
                            // Just append the slot, no merging
                            updated[index] = {
                              ...updated[index],
                              slots: [...updated[index].slots, newSlot],
                            };
                          }
                        });

                        return updated;
                      });

                      setShowPopup(false);
                    };

                    const repeatOption =
                      document.getElementById("repeatSelect").value;

                    if (repeatOption === "Does not repeat") {
                      setAdjustedAvailability((prev) => {
                        const existingEntry = prev.find(
                          (item) => item.date === date
                        );

                        let updatedAvailability;

                        if (!existingEntry) {
                          updatedAvailability = [
                            ...prev,
                            { date, slots: [newSlot] },
                          ];
                        } else {
                          updatedAvailability = prev.map((item) =>
                            item.date === date
                              ? { ...item, slots: [...item.slots, newSlot] }
                              : item
                          );
                        }

                        // (Optional) Create event object here if needed
                        return updatedAvailability;
                      });

                      setShowPopup(false);
                    } else if (repeatOption === "Daily") {
                      updateAvailability([
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ]);
                    } else if (
                      repeatOption === "Every weekday (Monday to Friday)"
                    ) {
                      updateAvailability([
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                      ]);
                    } else if (repeatOption.startsWith("Weekly")) {
                      const weekday = new Date(
                        `${date}T12:00:00`
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                      });
                      updateAvailability([weekday]);
                    } else {
                      alert("Custom repeat type not supported yet.");
                    }

                    setIsGroup(false);
                    setTemporaryEvent(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {selectedBooking && (
            <ReactModal
              isOpen={!!selectedBooking}
              onRequestClose={closeModal}
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
              overlayClassName="fixed inset-0 bg-black bg-opacity-50"
            >
              <div className="bg-white p-6 rounded shadow-lg w-[90%] max-w-md">
                <h2 className="text-xl font-bold mb-4">Booking Details</h2>
                <p>
                  <strong>Title:</strong>{" "}
                  {selectedBooking.title ? selectedBooking.title : "Not Booked"}
                </p>
                <p>
                  <strong>Start Time:</strong>{" "}
                  {moment(selectedBooking.start).format("MMMM Do YYYY, h:mm A")}
                </p>
                <p>
                  <strong>End Time:</strong>{" "}
                  {moment(selectedBooking.end).format("MMMM Do YYYY, h:mm A")}
                </p>
                {selectedBooking.tooltip && (
                  <p className="whitespace-pre">
                    <strong>Details:</strong> {selectedBooking.tooltip}
                  </p>
                )}
                <button
                  onClick={closeModal}
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Close
                </button>
              </div>
            </ReactModal>
          )}
        </div>
      </div>
      <style>{`
        .popup {
          position: relative;
          top:-20vh;
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          z-index: 1000000000000000000000000000000000000000;
        }
        .popup label {
          display: block;
          margin: 10px 0;
        }
        .popup input,
        .popup select {
          width: 100%;
          padding: 6px;
          margin-top: 4px;
        }
        .popup button {
          margin-top: 12px;
          padding: 8px 16px;
        }
      `}</style>
    </div>
  );
}
