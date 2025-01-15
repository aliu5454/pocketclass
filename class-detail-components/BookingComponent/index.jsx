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
} from "firebase/firestore";
import moment from "moment";
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
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { set } from "date-fns";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export default function index({ instructorId, classId, classData }) {
  const router = useRouter();
  const [timer, setTimer] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState({
    generalAvailability: [],
    adjustedAvailability: [],
  });
  const [mode, setMode] = useState("Individual");
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [groupedSlots, setGroupedSlots] = useState([]);
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

  const hasSlots = (date, schedule, bookedSlots, appointmentDuration, mode) => {
    const dateStr = moment(date).format("YYYY-MM-DD");
    var { generalAvailability, adjustedAvailability } = schedule;
    const dayName = moment(date).format("dddd");

    if (mode === "Individual") {
      generalAvailability = generalAvailability.map((day) => ({
        ...day,
        slots: day.slots.filter((slot) => !slot.classId),
      }));

      adjustedAvailability = adjustedAvailability.map((day) => ({
        ...day,
        slots: day.slots.filter((slot) => !slot.classId),
      }));
    } else if (mode === "Group") {
      generalAvailability = generalAvailability.map((day) => ({
        ...day,
        slots: day.slots.filter((slot) => slot.classId === classId),
      }));

      adjustedAvailability = adjustedAvailability.map((day) => ({
        ...day,
        slots: day.slots.filter((slot) => slot.classId === classId),
      }));
    }

    const adjustedDay = adjustedAvailability.find(
      (day) => day.date === dateStr
    );
    if (adjustedDay && adjustedDay.slots.length == 0) return false;
    else if (adjustedDay && adjustedDay.slots.length > 0) {
      return adjustedDay.slots.some((slot) => {
        const slotStart = moment(slot.startTime, "HH:mm");
        const slotEnd = moment(slot.endTime, "HH:mm");
        while (slotStart.isBefore(slotEnd)) {
          const nextSlot = slotStart
            .clone()
            .add(appointmentDuration, "minutes");
          if (
            !bookedSlots.some(
              (booked) =>
                booked.date === dateStr &&
                moment(booked.startTime, "HH:mm").isSame(slotStart)
            )
          ) {
            return true;
          } else if (
            bookedSlots.some(
              (booked) =>
                booked.date === dateStr &&
                moment(booked.startTime, "HH:mm").isSame(slotStart) &&
                booked.classId === classId
            ).length < classData?.groupSize &&
            mode === "Group"
          ) {
            return true;
          }
          slotStart.add(appointmentDuration, "minutes");
        }
        return false;
      });
    }
    const generalDay = generalAvailability.find((day) => day.day === dayName);
    if (generalDay && generalDay.slots.length == 0) return false;
    if (!generalDay) return false;
    if (generalDay && generalDay.slots.length > 0) {
      return generalDay.slots.some((slot) => {
        const slotStart = moment(slot.startTime, "HH:mm");
        const slotEnd = moment(slot.endTime, "HH:mm");
        while (slotStart.isBefore(slotEnd)) {
          const nextSlot = slotStart
            .clone()
            .add(appointmentDuration, "minutes");
          if (
            !bookedSlots.some(
              (booked) =>
                booked.date === dateStr &&
                moment(booked.startTime, "HH:mm").isSame(slotStart)
            )
          ) {
            return true;
          } else if (
            bookedSlots.some(
              (booked) =>
                booked.date === dateStr &&
                moment(booked.startTime, "HH:mm").isSame(slotStart) &&
                booked.classId === classId
            ).length < classData?.groupSize &&
            mode === "Group"
          ) {
            return true;
          }
          slotStart.add(appointmentDuration, "minutes");
        }
        return false;
      });
    }

    return false;
  };

  useEffect(() => {
    const daysToCheck = [];
    const minHourtoDay = 0;
    for (let i = minHourtoDay; i < maxDays; i++) {
      const date = moment(today).add(i, "days").toDate();
      if (!hasSlots(date, schedule, bookedSlots, appointmentDuration, mode)) {
        daysToCheck.push(date);
      }
    }
    setDaysWithNoSlots(daysToCheck);
  }, [schedule, bookedSlots, appointmentDuration, mode, classData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!instructorId || !classId) return;
      const docRef = doc(db, "Schedule", instructorId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSchedule({
          generalAvailability: data.generalAvailability || [],
          adjustedAvailability: data.adjustedAvailability || [],
        });
        setMinDays(data.minDays || 0);
        setMaxDays(data.maxDays || 30);
        setAppointmentDuration(data.appointmentDuration || 30);
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
      (booking) => (booking.startTime === selectedSlot.startTime && booking.date === selectedSlot.date)
    );
    const remainingSlots = classData.groupSize - filteredBookings.length;

    return remainingSlots;
  };

  // Generate slots
  useEffect(() => {
    const generateSlots = () => {
      const { generalAvailability, adjustedAvailability } = schedule;
      if (!selectedDate) return;
      const minDate = moment().add(minDays, "hours").startOf("day");
      const minTime = moment().add(minDays, "hours").format("HH:mm");
      const maxDate = moment().add(maxDays, "days").endOf("day");
      const dateStr = moment(selectedDate).format("YYYY-MM-DD");
      if (
        moment(selectedDate).isAfter(maxDate) ||
        moment(selectedDate).isBefore(minDate)
      ) {
        setGroupedSlots([]);
        return;
      }
      let slots = [];

      // Adjusted availability priority
      const adjustedDay = adjustedAvailability.find(
        (day) => day.date === dateStr
      );
      if (adjustedDay) {
        adjustedDay.slots.forEach((slot) =>
          slots.push(
            ...splitSlots(
              slot.startTime,
              slot.endTime,
              dateStr,
              slot.classId
            ).filter(
              (slot) =>
                slot.date != minDate.format("YYYY-MM-DD") ||
                slot.startTime >= minTime
            )
          )
        );
      } else {
        const dayName = moment(selectedDate).format("dddd"); // Get day name
        const dateStr = moment(selectedDate).format("YYYY-MM-DD");
        const generalDay = generalAvailability.find(
          (day) => day.day === dayName
        );
        if (generalDay) {
          generalDay.slots.forEach((slot) =>
            slots.push(
              ...splitSlots(
                slot.startTime,
                slot.endTime,
                dateStr,
                slot.classId
              ).filter(
                (slot) =>
                  slot.date != minDate.format("YYYY-MM-DD") ||
                  slot.startTime >= minTime
              )
            )
          );
        }
      }
      if (mode === "Individual") {
        slots = slots.filter((slot) => !slot.classId);
      } else if (mode === "Group") {
        slots = slots.filter((slot) => slot.classId === classId);
      }

      setGroupedSlots(slots); // Directly set slots for the selected date
    };

    const splitSlots = (start, end, dateStr, classId) => {
      const slotStart = moment.utc(start, "HH:mm"); // Normalize start to UTC
      const slotEnd = moment.utc(end, "HH:mm"); // Normalize end to UTC
      const slots = [];

      while (slotStart.isBefore(slotEnd)) {
        const nextSlot = slotStart.clone().add(appointmentDuration, "minutes");
        if (nextSlot.isAfter(slotEnd)) break;

        const bookingsForSlot = bookedSlots.filter(
          (booked) =>
            booked.date === moment(selectedDate).format("YYYY-MM-DD") &&
            moment.utc(booked.startTime, "HH:mm").isSame(slotStart)
        );

        const isBooked = bookingsForSlot.length > 0;

        if (
          !isBooked ||
          (mode === "Group" && bookingsForSlot.length < classData.groupSize)
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

  const initializeStripe = async () => {
    const now = moment.utc();
    if (!user && !userLoading) {
      toast.error("Please login to book a slot.");
      return;
    }
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

    if (mode === "Group") {
      const existingGroupBookings = querySnapshot.docs.filter(
        (doc) => doc.data().class_id === classId
      ).length;

      if (existingGroupBookings >= classData?.groupSize) {
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
        price: mode === "Group" ? classData.groupPrice : classData.Price,
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
    <div className="relative flex flex-col my-6 mb-10">
      {/* <h1 className="text-3xl font-bold text-[#E73F2B] mb-4">Book a Slot</h1> */}

      <div className="flex flex-wrap-reverse gap-2 flex-row items-center justify-between mb-4">
        <div className="text-2xl font-bold text-[#E73F2B]">
          Booking Schedule
        </div>

        <div>
          <button
            onClick={() => setMode("Individual")}
            className={`border-[#E73F2B] rounded-tl-lg rounded-bl-lg border-2 border-r-0 text-[#E73F2B] px-4 py-1 hover:bg-[#E73F2B] hover:text-white ${
              mode === "Individual" ? "bg-[#E73F2B] text-white" : ""
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setMode("Group")}
            className={`border-[#E73F2B] rounded-tr-lg rounded-br-lg border-2 text-[#E73F2B] px-4 py-1 hover:bg-[#E73F2B] hover:text-white ${
              mode === "Group" ? "bg-[#E73F2B] text-white" : ""
            }`}
          >
            Group
          </button>
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
          <h2 className="text-xl font-bold text-[#E73F2B] mb-6">
            Select a Time Slot
          </h2>
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
            {groupedSlots.length == 0 && (
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

          {/* Sticky Booking Div */}
          {selectedSlot && (
            <div className="bg-gray-50 border-2 border-red-300 rounded p-4 ">
              <div className=" flex justify-between items-center">
                <div>
                  <p>
                    <strong>Selected: </strong>
                    {moment(selectedSlot.date).format(
                      "dddd, MMMM Do YYYY"
                    )}{" "}
                    {selectedSlot.startTime} - {selectedSlot.endTime}
                  </p>
                  {mode === "Group" && (
                    <div>
                      <strong>Slots Left:</strong>{" "}
                      {calculateRemainingGroupedClassSlots()}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleBookSlot}
                  className="bg-[#E73F2B] text-white p-2 rounded"
                >
                  Book Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Centered Stripe Checkout */}
      {stripeLoading && <CheckoutSkeleton />}
      {stripeOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Elements stripe={stripePromise} options={stripeOptions}>
            <CheckoutForm
              bookingRef={stripeOptions.bookingRef}
              setStripeOptions={setStripeOptions}
              timer={timer}
              price={mode === "Group" ? classData.groupPrice : classData.Price}
              startTime={selectedSlot.startTime}
              endTime={selectedSlot.endTime}
              date={selectedSlot.date}
              setTimer={setTimer}
              mode={mode}
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
}) => {
  const stripe = useStripe();
  const [user, userLoading] = useAuthState(auth);
  const elements = useElements();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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

    if (!error && paymentIntent?.status === "succeeded") {
      const bookingDocRef = doc(db, "Bookings", bookingRef);
      await updateDoc(bookingDocRef, {
        status: "Confirmed",
        expiry: null,
        paymentIntentId: paymentIntent.id,
        paymentStatus: "Paid",
      });

      const bookingSnapshot = await getDoc(bookingDocRef);
      const bookingData = bookingSnapshot.data();
      const classRef = doc(db, "classes", bookingData.class_id);
      const classSnapshot = await getDoc(classRef);
      const classData = classSnapshot.data();

      const instructorRef = doc(db, "Users", bookingData.instructor_id);
      const instructorSnapshot = await getDoc(instructorRef);
      const instructorData = instructorSnapshot.data();

      // Combine both emails
      const recipientEmails = `${user?.email}, ${instructorData.email}`;

      const startDateTime = new Date(`${date}T${startTime}`).toISOString();
      const organizer = instructorData.email;
      const location = classData.Address || "Online";
      const endDateTime = new Date(`${date}T${endTime}`).toISOString();
      const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pocketclass//NONSGML v1.0//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:${classData.Name}
DESCRIPTION:Booking confirmed for the class ${classData.Name}
DTSTART:${startDateTime.replace(/-|:|\.\d+/g, "")}
DTEND:${endDateTime.replace(/-|:|\.\d+/g, "")}
LOCATION:${location}
ORGANIZER;CN=${instructorData.firstName} ${
        instructorData.lastName
      }:MAILTO:${organizer}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR
    `.trim();

      // HTML content for the email
      const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #E73F2B;">New Booking Confirmation</h2>
        <p>Hello,</p>
        <p>We are excited to confirm a new booking for the class <strong>${
          classData.Name
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
            <td style="padding: 8px;">${date + "/" + startTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>End Time:</strong></td>
            <td style="padding: 8px;">${date + "/" + endTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Price:</strong></td>
            <td style="padding: 8px;">${
              mode === "Group" ? classData.groupPrice : classData.Price
            }</td>
          </tr>
        </table>
        <p>Thank you for choosing <strong>Pocketclass</strong>!</p>
        <p style="color: #555;">Best Regards,<br>Pocketclass Team</p>
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
      setLoading(false);
      toast.success("Booking confirmed!");
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
      <div className="flex flex-row justify-end text-[#E73F2B] mb-2">
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
