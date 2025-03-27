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
  const [vacationStartDate, setVacationStartDate] = useState(null);
  const [vacationEndDate, setVacationEndDate] = useState(null);
  const [showVacationPicker, setShowVacationPicker] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(null);
  const [timeZones, setTimeZones] = useState([]);
  const [selectedTimeZone, setSelectedTimeZone] = useState("America/Toronto");

  const [events, setEvents] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointmentDuration, setAppointmentDuration] = useState(30);
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

    setAdjustedAvailability([...updatedAdjustedAvailability, ...vacationDates]);
    setVacationStartDate(null);
    setVacationEndDate(null);
    setShowVacationPicker(false);
  };

  const saveSchedule = async (
    db,
    user,
    generalAvailability,
    adjustedAvailability
  ) => {
    try {
      setScheduleLoading(true);
      const data = {
        generalAvailability,
        adjustedAvailability,
        appointmentDuration,
        timezone: selectedTimeZone,
        minDays,
        maxDays,
      };

      await setDoc(doc(db, "Schedule", user.uid), data, { merge: true });

      toast.success("Schedule saved successfully");
      setScheduleLoading(false);
    } catch (error) {
      toast.error("Error saving schedule");
      console.error("Error saving schedule:", error);
      setScheduleLoading(false);
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

  const addAdjustedSlot = (date) => {
    const updatedAvailability = adjustedAvailability.map((item) =>
      item.date === date
        ? {
            ...item,
            slots: [...item.slots, { startTime: "09:00", endTime: "09:30" }],
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
    let newEvents = [];

    general.forEach((day, index) => {
      day.slots.forEach((slot) => {
        if (slot.startTime && slot.endTime) {
          const slotStart = moment(slot.startTime, "HH:mm");
          const slotEnd = moment(slot.endTime, "HH:mm");
          let current = slotStart.clone();

          while (current.isBefore(slotEnd)) {
            const next = current.clone().add(appointmentDuration, "minutes");
            if (next.isAfter(slotEnd)) break;

            for (let i = 0; i < 52; i++) {
              const start = moment()
                .startOf("week")
                .add(index + 1 > 6 ? 0 : index + 1, "days")
                .add(i, "weeks")
                .set({
                  hour: current.hours(),
                  minute: current.minutes(),
                });
              const end = moment()
                .startOf("week")
                .add(index + 1 > 6 ? 0 : index + 1, "days")
                .add(i, "weeks")
                .set({
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
            }
            current = next;
          }
        }
      });
    });

    adjusted.forEach((item) => {
      const date = moment(item.date, "YYYY-MM-DD");

      newEvents = newEvents.filter(
        (event) => !moment(event.start).isSame(date, "day")
      );

      item.slots.forEach((slot) => {
        if (slot.startTime && slot.endTime) {
          const slotStart = moment(slot.startTime, "HH:mm");
          const slotEnd = moment(slot.endTime, "HH:mm");
          let current = slotStart.clone();

          while (current.isBefore(slotEnd)) {
            const next = current.clone().add(appointmentDuration, "minutes");
            if (next.isAfter(slotEnd)) break;

            const start = date.clone().set({
              hour: current.hours(),
              minute: current.minutes(),
            });
            const end = date.clone().set({
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
    });

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
      // Get classId by find GroupedSlots in BookedSlot
      const bookingSlot = bookedSlots.find(
        (bookedSlot) =>
          moment(bookedSlot.startTime).format() === start &&
          moment(bookedSlot.endTime).format() === end
      );

      const classDetail = classes.find((c) => c.uid === bookingSlot.classId);
      newEvents.push({
        title:
          students.length === 1
            ? (students[0] || "Booked by a student")
            : `${students.length} students booked`,
        start: new Date(start),
        end: new Date(end),
        color: students.length === 1 ? "#87CEEB" : "#369bc5", // Light blue for single bookings, yellow for group bookings
        tooltip:
          students.length === 1
            ? `Class: ${classDetail?.Name}, Booked by ${students[0]}`
            : `Class: ${classDetail?.Name}\nStudents:\n- ${students.join("\n- ")} `,
      });
    });

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
                            className="w-full"
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
                            className="w-full"
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
                          components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
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
                          components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
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
            Indivate times you are available for specific dates
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
                  className="border rounded p-2 bg-gray-100 text-sm"
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
                            className="w-full bg-gray-100"
                            styles={{
                              menu: (provided) => ({
                                ...provided,
                                maxHeight: "300px",
                              }),
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
                            className="w-full bg-gray-100"
                            styles={{
                              menu: (provided) => ({
                                ...provided,
                                maxHeight: "300px",
                              }),
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
                          components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
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
                          components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
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

          <button
            onClick={() =>
              saveSchedule(db, user, generalAvailability, adjustedAvailability)
            }
            disabled={scheduleLoading}
            className={` px-4 py-2 bg-logo-red text-white rounded-md hover:bg-red-600`}
          >
            {scheduleLoading ? "Saving..." : "Save Schedule"}
          </button>
        </div>
        <div className="flex-grow p-4">
          <BigCalendar
            timeslots={2}
            timeStep={30}
            defaultView={view}
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "calc(100vh - 150px)" }}
            formats={customFormats}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.color,
              },
            })}
            scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
            tooltipAccessor="tooltip"
            onSelectEvent={handleEventClick} // Event click handler
          />
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
    </div>
  );
}
