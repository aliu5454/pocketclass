import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import moment from "moment";
import { toast } from "react-toastify";
import { db } from "../firebaseConfig";
import { addDoc, collection, doc, updateDoc, getDoc } from "firebase/firestore";
import onClickOutside from "../hooks/OnClickOutside";
import { generateHourlySlotsForDate } from "../utils/slots";
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements,
  AddressElement,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const sendEmail = async (targetEmail, targetSubject, targetText, now) => {
  try {
    const res = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: targetSubject,
        text: `${targetText} \n\nBest Regards,\nPocketclass Team`,
        to: targetEmail,
      }),
    });
  } catch (error) {
    console.warn(error);
  }
};

// Time:${moment(now?.toDate())?.format?.(
// 	"DD-MM-YY / hh:mm A"
// )} \n\n

const AddBooking = ({
  slotDate,
  availability,
  appointments,
  closeModal,
  uid,
  uEmail,
  uName,
  classId,
  insId,
  price,
  groupType,
  classStudents,
  remainingSeats,
  bookingslotInfo,
}) => {
  console.log(slotDate);
  const [options, setOptions] = useState(null);
  const [voucher, setVoucher] = useState("");
  const [bookingSeats, setBookingSeats] = useState(0);
  const [voucherVerified, setVoucherVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hourlySlots, setHourlySlots] = useState([]);
  const [newAppointment, setNewAppointment] = useState({
    owner: uid,
    instructor: insId,
    title: uName,
    class: classId,
    start: null,
    end: null,
    price: price,
    paid: false,
  });
  console.log(bookingslotInfo);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef();
  onClickOutside(modalRef, closeModal);

  const getOptions = async (newPrice) => {
    try {
      let finalPrice;
      if (newPrice != null) { 
        finalPrice = newPrice;
      } else {
        finalPrice = newAppointment.price;
      }
      setLoading(true);
      const checkoutSession = await fetch("/api/create-stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          uEmail,
          uName,
          classId,
          insId,
          price: finalPrice,
        }),
      });
      const data = await checkoutSession.json();
      if (data?.clientSecret) {
        setOptions({ clientSecret: data.clientSecret });
      }
    } catch (error) {
      console.warn(error);
      toast.error("Payments error !" + error.message || "", {
        toastId: "apError2",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOptions();
  }, []);

  useEffect(() => {
    const getSlots = () => {
      setLoading(true);
      const slots = generateHourlySlotsForDate(
        slotDate,
        availability,
        appointments,
        true,
        classStudents
      );
      console.log(slotDate, availability);
      setHourlySlots(slots);
      setLoading(false);
    };

    getSlots();
  }, [slotDate, availability, appointments]);

const handleTime = (start, end) => {
	const formatDate = (date) => {
	  if (!date) return null;
	  const m = moment(date).utcOffset(-300);
	  return `${m.format('ddd MMM DD YYYY HH:mm:ss')} GMT-0500 (Eastern Standard Time)`;
	};
  
	setNewAppointment({ 
	  ...newAppointment, 
	  start: formatDate(start),
	  end: formatDate(end)
	});
  };
  

  const handleAddAppointment = async () => {
    try {
      setLoading(true);
      
      if (
        groupType === "group" &&
        bookingslotInfo &&
        bookingslotInfo[newAppointment.start] &&
        bookingSeats > bookingslotInfo[newAppointment.start]?.remainingSeats
      ) {
        toast.error("Please select the available seats", {
          toastId: "apError3",
        });
        setLoading(false);
        return;
      }
  
      const newAppointmentWithStatus = {
        ...newAppointment,
        status: "pending",  
      };
  
      await addDoc(collection(db, "appointments"), newAppointmentWithStatus);
      toast.success("Appointment added!", { toastId: "apSuccess" });
  
      if (groupType === "group") {
        const newAppointmentData = {
          start: newAppointment.start,
          end: newAppointment.end,
          bookSeats: bookingSeats,
          remainingSeats: classStudents - bookingSeats,
        };
        const classDocRef = doc(db, "classes", classId);
        const classDoc = await getDoc(classDocRef);
        if (!classDoc.exists()) {
          throw new Error("Class document does not exist");
        }
        const classData = classDoc.data();
        const updatedBookings = classData.bookings ? { ...classData.bookings } : {};
  
        if (updatedBookings[newAppointment.start]) {
          updatedBookings[newAppointment.start] = {
            ...updatedBookings[newAppointment.start],
            ...newAppointmentData,
            remainingSeats:
              updatedBookings[newAppointment.start].remainingSeats - bookingSeats,
            bookingSeats:
              updatedBookings[newAppointment.start].bookSeats + bookingSeats,
          };
        } else {
          updatedBookings[newAppointment.start] = newAppointmentData;
        }
  
        await updateDoc(classDocRef, {
          bookings: updatedBookings,
        });
  
        const bandaidText = `There has been a booking by ${
          newAppointment.title
        } \n\n Followings are the details:\n\n User Email: ${uEmail} \n\n Class Id: ${
          newAppointment.class
        }\n\nStart Time: ${moment(newAppointment.start).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nEnd Time: ${moment(newAppointment.end).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nPrice: ${newAppointment.price}`;
        await sendEmail(
          "contact@pocketclass.ca",
          `New Booking for ${newAppointment.title} with Pocketclass!`,
          bandaidText
        );
  
        const targetText = `Hi ${
          newAppointment.title
        }, \n\n Thank you for booking a class with Pocketclass! 🎉 We are excited to be part of your learning journey and cannot wait to see you in your upcoming session.\n\n If you have any questions, need to reschedule, or just want to say hi, feel free to reach out to us at contact@pocketclass.com
        \n\nStart Time: ${moment(newAppointment.start).format(
            "DD-MM-YY / hh:mm A"
          )}\n\nEnd Time: ${moment(newAppointment.end).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nPrice: ${newAppointment.price}`;
        await sendEmail(
          uEmail,
          "Thank You for Booking a Group Lesson with Pocketclass!",
          targetText
        );
      } else {
        const targetText = `Hi ${
          newAppointment.title
        }, \n\n Thank you for booking a class with Pocketclass! 🎉 We are excited to be part of your learning journey and cannot wait to see you in your upcoming session. \n\n If you have any questions, need to reschedule, or just want to say hi, feel free to reach out to us at contact@pocketclass.com \n\n
        Class Details:\n\n
        Start Time: ${moment(newAppointment.start).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nEnd Time: ${moment(newAppointment.end).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nPrice: ${newAppointment.price}`;
        await sendEmail(
          uEmail,
          "Thank You for Booking Your Class with Pocketclass!",
          targetText
        );
  
        const bandaidText = `There has been a booking for ${
          newAppointment.title
        } by ${
          newAppointment.owner
        } \n\n Followings are the details:\n\n User Email: ${uEmail} \n\nClass Id: ${
          newAppointment.class
        }\n\nStart Time: ${moment(newAppointment.start).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nEnd Time: ${moment(newAppointment.end).format(
          "DD-MM-YY / hh:mm A"
        )}\n\nPrice: ${newAppointment.price}`;
        await sendEmail(
          "contact@pocketclass.ca",
          `New Booking for ${newAppointment.title} with Pocketclass!`,
          bandaidText
        );
      }
  
      setLoading(false);
      closeModal();
    } catch (error) {
      setLoading(false);
      console.log(error);
      toast.error("Appointment adding error!", {
        toastId: "apError2",
      });
    }
  };
  
  const checkSlots = () => {
    if (groupType === "group") {
      if (remainingSeats === 0) {
        toast.error("No available seats in this group!");
      } else if (
        bookingslotInfo &&
        (bookingSeats > bookingslotInfo[newAppointment.start]?.remainingSeats || 
        bookingslotInfo[newAppointment.start]?.remainingSeats === undefined)
      ) {
        toast.error("Please enter valid available seats!");
      } else {
        console.log(bookingslotInfo);
        console.log(newAppointment.start);
        newAppointment.price = newAppointment.price * bookingSeats;
        newAppointment.classStudents = bookingSeats;
        setConfirm(true);
      }
    } else {
      setConfirm(true);
    }
  };

  const handleVoucher = async () => {
    try {
      const response = await fetch("/api/verifyVoucher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: voucher }),
      });
      const data = await response.json();
      if (data.verified) {
        setVoucherVerified(true);
        let discountType = data.discountType;
        let discountedPrice;
        if (discountType === "percentage") {
          discountedPrice = newAppointment.price - (price * data.discount) / 100;
        } else {
          discountedPrice = newAppointment.price - data.discount;
        }
        if (discountedPrice < 0) {
          discountedPrice = 1;
        }
        setNewAppointment({ ...newAppointment, price: discountedPrice });
        getOptions(discountedPrice);
        toast.success("Voucher verified!");
      } else if (data.message) {
        toast.error(data.message);
        setError(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Voucher verification error!", {
        toastId: "vError2",
      });
    }
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 transition-opacity duration-300`}
    >
      {loading || !options || hourlySlots.length < 24 ? (
        <section className="flex justify-center items-center min-h-[100vh]">
          <Image
            priority={true}
            src="/Rolling-1s-200px.svg"
            width={"60px"}
            height={"60px"}
          />
        </section>
      ) : (
        <div
          ref={modalRef}
          className={`bg-white rounded-2xl p-8 md:px-12 w-[90%] sm:w-3/4 max-w-[1000px] max-h-[95vh] overflow-y-auto  transform transition-transform duration-300 ease-in-out shadow-xl`}
        >
          {confirm ? (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm
                onSuccess={handleAddAppointment}
                closeModal={closeModal}
                uEmail={uEmail}
                price={newAppointment?.price}
              />
            </Elements>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap">
                <h1 className="text-gray-700 font-bold text-2xl">
                  Add Appointment
                </h1>
                {slotDate && (
                  <h1 className="text-logo-red font-bold text-xl">
                    {moment(slotDate).format("MMMM D, YYYY")}
                  </h1>
                )}
              </div>
              {console.log(hourlySlots)}
              {hourlySlots.some((s) => s.isAvailable) ? (
                <div className="flex flex-col w-full mt-6">
                  {/* slots */}
                  <div className="mt-6 w-full">
                    <h1 className="w-full text-center text-gray-700 font-bold text-xl">
                      Select a slot
                    </h1>

                    <div className="mt-3 flex justify-center flex-wrap max-h-[300px] overflow-y-auto smallScrollbar">
                      {hourlySlots.map((slot) => {
                        const isSelected =
                          moment(newAppointment.start).isSame(slot.start) &&
                          moment(newAppointment.end).isSame(slot.end);

                        const handleClick = () => {
                          isSelected
                            ? handleTime(null, null)
                            : handleTime(slot.start, slot.end);
                        };

                        return (
                          <button
                            key={slot.label}
                            onClick={handleClick}
                            className={`py-2 px-4 border rounded-lg m-1 min-w-[190px] md:min-w-[210px] flex-1
														${isSelected ? "bg-logo-red text-white" : "bg-gray-50 text-gray-700"}
														disabled:bg-gray-300 disabled:opacity-20 disabled:cursor-default`}
                            disabled={!slot.isAvailable}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {groupType === "group" && newAppointment.start && (
                    <div className="grid gap-2 grid-cols-2 mb-2 mt-5">
                      <div className="grid-cols-3 gap-2">
                        <label className="text-lg font-medium">
                          Remaining Seats:
                        </label>
                        <span className="ml-2">
                          {" "}
                          {bookingslotInfo &&
                          bookingslotInfo[newAppointment.start]
                            ?.remainingSeats >= 0
                            ? bookingslotInfo[newAppointment.start]
                                ?.remainingSeats
                            : 0}
                        </span>
                      </div>
                      <div className="grid-cols-6 gap-6">
                        <label className="text-lg font-medium">
                          Price Per Seat:
                        </label>
                        <span className="ml-2">
                          {voucherVerified ? (
                            <>
                              <span className="text-gray-500 line-through mr-2">
                                ${price}
                              </span>
                              <span className="text-logo-red font-bold">
                                ${newAppointment.price}
                              </span>
                            </>
                          ) : (
                            `$${price}`
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  {groupType === "group" && (
                    <div className="flex flex-col mt-6">
                      <label
                        htmlFor="voucher"
                        className="font-bold text-center"
                      >
                        Booking Seats
                      </label>
                      <input
                        type="number"
                        name="bookSeats"
                        id="bookSeats"
                        placeholder="Enter number of seats you want to book"
                        className="bg-gray-100 border !border-gray-100 rounded-md shadow-md mt-2 px-4 py-2 focus:!outline-none"
                        value={bookingSeats}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setError(null);
                          }
                          setBookingSeats(e.target.value);
                        }}
                      />
                    </div>
                  )}

                  {!voucherVerified && (
                    <div className="flex flex-col mt-6">
                      <label
                        htmlFor="voucher"
                        className="font-bold text-center"
                      >
                        Voucher Code
                      </label>
                      <input
                        type="text"
                        name="voucher"
                        id="voucher"
                        placeholder="Enter your voucher code"
                        className="bg-gray-100 border !border-gray-100 rounded-md shadow-md mt-2 px-4 py-2 focus:!outline-none"
                        value={voucher}
                        onChange={(e) => {
                          if (e.target.value === "") {
                            setError(null);
                          }
                          setVoucher(e.target.value);
                        }}
                      />
                      <span className="text-xs text-gray-400 mt-2">
                        *If you have any voucher code, apply here
                      </span>
                      <button
                        className="mx-auto bg-logo-red text-white py-2 px-8 rounded-lg mt-2 w-1/3  disabled:grayscale-[50%] disabled:!opacity-80"
                        onClick={handleVoucher}
                        disabled={
                          groupType === "group" &&
                          bookingslotInfo &&
                          bookingslotInfo[newAppointment.start]
                            ?.remainingSeats === 0
                        }
                      >
                        Apply
                      </button>
                      {error && (
                        <div className="text-red-500 text-center">{error}</div>
                      )}
                    </div>
                  )}

                  {voucherVerified && (
                    <div className="text-green-500 text-center">
                      Voucher Verified
                    </div>
                  )}

                  {/* add btn */}
                  <div className="mt-6 mx-auto">
                    <button
                      onClick={checkSlots}
                      className="bg-logo-red text-white py-2 px-8 rounded-lg opacity-80 hover:opacity-100 duration-150 ease-in-out disabled:grayscale-[50%] disabled:!opacity-80"
                      disabled={
                        !newAppointment.start ||
                        !newAppointment.end ||
                        (voucher.length > 0 && !voucherVerified) ||
                        (groupType === "group" && bookingSeats == 0) ||
                        (groupType === "group" &&
                          bookingslotInfo &&
                          bookingslotInfo[newAppointment.start]
                            ?.remainingSeats === 0)
                      }
                    >
                      Confirm Appointment
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-48 mx-auto my-6">
                  <h1 className="text-gray-400 font-bold text-2xl">
                    No slot available
                  </h1>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AddBooking;

// CHECKOUT FORM
const CheckoutForm = ({ onSuccess, closeModal, uEmail, price }) => {
  const [loading, setLoading] = useState(false);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);
  const [isAddressCompleted, setIsAddressCompleted] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    try {
      event.preventDefault();

      if (!stripe || !elements) {
        return;
      }

      setLoading(true);

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: "https://pocketclass.com",
        },
        redirect: "if_required",
      });

      if (result.error) {
        console.warn(result.error.message);
        toast.error(`Payment error !\n${result?.error?.message || ""}`, {
          toastId: "pError2",
        });
        closeModal();
      } else {
        sendEmail(
          uEmail,
          "Your Pocketclass Payment was Successful",
          `Your payment of $${price} was successful for the Pocketclass appointment. Thank you and hope you have a great class!`
        );
        await onSuccess();
      }
      setLoading(false);
    } catch (error) {
      toast.error(`Payment error !\n${error?.message || ""}`, {
        toastId: "pError2",
      });
      console.warn(error);
      closeModal();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className=" max-h-[85vh] overflow-y-auto smallScrollbar p-4"
    >
      <div className="flex w-full items-center justify-between mb-8">
        <h1 className="text-gray-700 font-bold text-xl">Payment</h1>

        <h1 className="text-gray-700 font-bold">${price}</h1>
      </div>

      <AddressElement
        className=""
        onChange={(e) => setIsAddressCompleted(e?.complete)}
        options={{
          mode: "billing",
          autocomplete: { mode: "automatic" },
          display: { name: "full" },
        }}
      />

      <PaymentElement
        className="mt-4"
        onChange={(e) => setIsPaymentCompleted(e?.complete)}
        options={{
          layout: "accordion",
        }}
      />

      <button
        disabled={
          !stripe ||
          !elements ||
          loading ||
          !isPaymentCompleted ||
          !isAddressCompleted
        }
        className="text-white bg-logo-red w-full mt-6 p-2 rounded-md disabled:opacity-50 hover:opacity-80"
      >
        {loading ? "..." : "Pay"}
      </button>
    </form>
  );
};
