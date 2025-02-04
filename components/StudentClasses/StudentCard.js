import React, { useState } from "react";
import Image from "next/image";
import { HeartIcon } from "@heroicons/react/outline";
import { StarIcon } from "@heroicons/react/solid";
import { TrashIcon } from "@heroicons/react/outline";
import { PencilIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import RescheduleClass from "../RescheduleClass";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "../../firebaseConfig";
import moment from "moment-timezone";

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

function StudentCard({
  appointmentId,
  type,
  latitude,
  id,
  name,
  images,
  description,
  longitude,
  reviews,
  address,
  price,
  category,
  start = null,
  end = null,
  studentId,
  classCreator,
  paymentIntentId,
  studentName,
  timezone,
  rescheduleBooking = false,
  cancelBooking = false,
}) {
  const router = useRouter();
  const [refundAmnt, setRefundAmnt] = useState(0);
  const [refundReason, setRefundReason] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(cancelBooking);
  const [refundLoading, setRefundLoading] = useState(false);

  const [rescheduleModal, setRescheduleModal] = useState(rescheduleBooking);
  const deleteClass = async () => {
    const classRef = doc(db, "classes", id);
    await deleteDoc(classRef);
    toast.success("Class deleted successfully");

    const card = document.getElementById("infoCard" + id);
    card?.remove();
  };

  const handleBookAgain = () => {
    router.push({
      pathname: "/classes/id=" + id,
    });
  };

  const handleMessageInstructor = async () => {
    const goToChat = (cid, chid) => {
      router.push({
        pathname: "/chat",
        query: {
          cid,
          chid,
        },
      });
    };
    const createChatRoom = async () => {
      const chatRoomRef = collection(db, "chatrooms");
      const chatRoom = await addDoc(chatRoomRef, {
        student: studentId,
        instructor: classCreator,
        class: id,
      });
      return chatRoom;
    };
    console.log("handleMessageInstructor");
    const chatRoomRef = collection(db, "chatrooms");
    const q = query(
      chatRoomRef,
      where("student", "==", studentId),
      where("instructor", "==", classCreator),
      where("class", "==", id)
    );
    console.log(studentId, classCreator, id);
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      goToChat(classCreator, querySnapshot?.docs[0]?.id);
      return;
    }
    const chatRoom = await createChatRoom();
    goToChat(classCreator, chatRoom?.id);
    console.log("Error");
  };

  const handleReschedule = () => {
    const now = moment().tz(timezone).add(24, "hours");
    const bookingStartDate = moment.utc(start, "YYYY-MM-DD HH:mm");

    if (bookingStartDate.isBefore(now)) {
      toast.error(
        "You cannot reschedule an appointment less than 24 hours away."
      );
      return;
    }
    setRescheduleModal(true);
  };

  const handleCancel = async () => {
    const now = moment().tz(timezone).add(24, "hours");
    const bookingStartDate = moment.utc(start, "YYYY-MM-DD HH:mm");
    const diff = bookingStartDate.diff(now, "hours");

    if (diff >= 24) {
      fetch("/api/retrieve-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntentId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setRefundAmnt(
              (data.paymentIntent.amount -
                (5 / 100) * data.paymentIntent.amount) /
                100
            );
            setIsModalOpen(true);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    } else {
      toast.error("You cannot cancel an appointment less than 24 hours away.");
    }
  };

  const handleRefund = async () => {
    const now = moment().tz(timezone).add(24, "hours");
    const bookingStartDate = moment.utc(start, "YYYY-MM-DD HH:mm");
    const diff = bookingStartDate.diff(now, "hours");
    if (diff < 24) {
      toast.error("You cannot refund an appointment less than 24 hours away.");
      return;
    }
    setRefundLoading(true);
    const refund = await fetch("/api/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: paymentIntentId,
        bookingId: appointmentId,
        refundReason: refundReason,
      }),
    });
    const data = await refund.json();
    if (data.success) {
      toast.success("Refund initiated successfully");
      setIsModalOpen(false);
      setRefundLoading(false);
    } else {
      toast.error("Error initiating refund");
      setIsModalOpen(false);
      setRefundLoading(false);
    }
  };
  const handleSmallCardClick = () => {
    router.push({
      pathname: "/classes/id=" + id,
    });
  };

  const formatTime = (timeString) => {
    const time = moment.utc(timeString);
    return time.format("DD-MM-YY h:mm A");
  };
  let currentClassReview = Array.isArray(reviews)
    ? reviews.filter((rev) => {
        return rev.classID === id;
      })
    : [];

  let averageReview = 0;

  if (currentClassReview.length !== 0) {
    currentClassReview.forEach((rv) => {
      averageReview += rv.qualityRating + rv.recommendRating + rv.safetyRating;
    });
    averageReview = averageReview / (currentClassReview.length * 3);
  }

  return (
    <>
      <div
        className="flex py-7 px-2 border-b cursor-pointer hover:opacity-80 hover:shadow-lg pr-4 transition duration-200 ease-out first:border-t min-w-[100%]"
        onClick={() => handleSmallCardClick()}
        id={"infoCard" + id}
      >
        <div className="relative h-24 w-40 md:h-52 md:w-80 flex-shrink-0">
          <Image
            priority={true}
            src={
              images?.length
                ? typeof images[0] === "string"
                  ? images[0]
                  : images[0]?.url
                : images
            }
            layout="fill"
            unoptimized
            objectFit="contain"
            className="rounded-xl"
          />
        </div>

        <div className="flex flex-row flex-wrap justify-between flex-grow pl-5">
          <div className="flex flex-col flex-grow">
            <div className="flex flex-col flex-grow">
              <h4 className="text-xl">{name}</h4>

              <div className="flex-row">
                <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <svg
                      className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="#AF816C"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z"
                        clipRule="evenodd"
                      />
                      <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 01-9.274 0C3.985 17.585 3 16.402 3 15.055z" />
                    </svg>
                    {type}
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <svg
                      className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="#58C18E"
                      aria-hidden="true"
                    >
                      <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152z" />
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-6a.75.75 0 01.75.75v.316a3.78 3.78 0 011.653.713c.426.33.744.74.925 1.2a.75.75 0 01-1.395.55 1.35 1.35 0 00-.447-.563 2.187 2.187 0 00-.736-.363V9.3c.698.093 1.383.32 1.959.696.787.514 1.29 1.27 1.29 2.13 0 .86-.504 1.616-1.29 2.13-.576.377-1.261.603-1.96.696v.299a.75.75 0 11-1.5 0v-.3c-.697-.092-1.382-.318-1.958-.695-.482-.315-.857-.717-1.078-1.188a.75.75 0 111.359-.636c.08.173.245.376.54.569.313.205.706.353 1.138.432v-2.748a3.782 3.782 0 01-1.653-.713C6.9 9.433 6.5 8.681 6.5 7.875c0-.805.4-1.558 1.097-2.096a3.78 3.78 0 011.653-.713V4.75A.75.75 0 0110 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {price}
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <svg
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#E73F2B"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9.69 18.933l.003.006.007.01c-.1-.01-.21-.02-.31-.03-.1-.01-.21-.02-.32-.02s-.22.01-.32.02c-.1.01-.21.02-.31.03l.003-.006a11.387 11.387 0 00-.047-.068C8.128 18.464 7.42 17.95 7 17c-.394-.914-.708-2.004-.89-3.119-.183-1.115-.31-2.297-.36-3.514-.065-.287-.124-.595-.194-.895-.065-.261-.133-.523-.211-.787a8.635 8.635 0 011.384-.722l.407-.422.381-.339.354-.275.298-.211.213-.148.151-.097.106-.065.068-.035a9.537 9.537 0 00.264-.128C9.053 8.89 9.459 8.778 9.82 8.709C10.4 8.679 10.82 8.878 10.82 9.348v1.273c0 .374-.242.654-.599.732-.554.118-.73-.085-.83-.183-.107-.1-.228-.174-.347-.259-.222-.154-.472-.348-.736-.497-.396-.187-.799-.389-1.198-.607C7.255 7.707 7.172 5.145 7 4.25c-.37-2.078-.445-.41-.735-.662-.421-.436-.656-.712-.682-.86-.118-.485-.23-.68-.439-.902-.379-.418-.915-.559-.74-.92.266-.358.498-.266.63-.383.252-.352.69-.004.837-.108-.27-.305.211-.79-.179-.443-.155-.667-.19-.705-.47-.287z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{address}</span>
                </div>
              </div>

              {start && end && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <svg
                    className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4B5563"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    {formatTime(start)} - {formatTime(end)}
                  </span>
                </div>
              )}

              {studentName && (
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <svg
                    fill="#000000"
                    width="20px"
                    className="mr-2"
                    height="20px"
                    viewBox="0 0 575.616 575.616"
                  >
                    <g>
                      <g>
                        <path
                          d="M429.248,141.439C429.248,63.33,365.985,0,287.808,0c-78.109,0-141.439,63.33-141.439,141.439
                      c0,78.11,63.33,141.439,141.439,141.439C365.988,282.878,429.248,219.549,429.248,141.439z M181.727,144.499
                      c0,0-4.079-40.12,24.82-70.72c20.34,20.389,81.261,70.72,187.342,70.72c0,58.498-47.586,106.081-106.081,106.081
                      S181.727,202.994,181.727,144.499z"
                        />
                        <path
                          d="M45.049,391.68v62.559v80.919c0,22.365,18.136,40.459,40.459,40.459h404.6c22.365,0,40.459-18.097,40.459-40.459v-80.919
                      V391.68c0-44.688-36.193-80.919-80.919-80.919H377.91c-5.07,0-11.46,3.422-14.271,7.639l-70.735,99.982
                      c-2.812,4.22-7.372,4.22-10.184,0l-70.738-99.986c-2.812-4.22-9.202-7.638-14.272-7.638h-71.742
                      C81.319,310.758,45.049,346.991,45.049,391.68z"
                        />
                      </g>
                    </g>
                  </svg>
                  <span>{studentName}</span>
                </div>
              )}
            </div>

            <div className="flex mt-2">
              {averageReview > 0 ? (
                <>
                  <div className="flex items-center">
                    <StarIcon className="h-4" />
                    <span className="ml-1">{averageReview.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <span>No reviews yet</span>
              )}
            </div>
          </div>
          <div
            className="flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {moment.utc(start).format("YYYY-MM-DD HH:mm") <
            moment
              .tz(timezone || "America/Toronto")
              .format("YYYY-MM-DD HH:mm") ? (
              <button
                onClick={() => handleBookAgain()}
                className="px-4 py-1 border-solid border border-logo-red text-logo-red rounded-md hover:bg-logo-red hover:text-white hover:opacity-80 transition duration-200 ease-out"
              >
                Book Again
              </button>
            ) : (
              <>
                <div className="mt-4 flex flex-col gap-3 w-full">
                  <button
                    onClick={() => handleCancel()}
                    className="px-4 py-1 border-solid border border-logo-red text-logo-red rounded-md hover:bg-logo-red hover:text-white hover:opacity-80 transition duration-200 ease-out"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReschedule()}
                    className="px-4 py-1 border-solid border border-logo-red text-logo-red rounded-md hover:bg-logo-red hover:text-white hover:opacity-80 transition duration-200 ease-out"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => handleMessageInstructor()}
                    className="px-4 py-1 border-solid border border-logo-red text-logo-red rounded-md hover:bg-logo-red hover:text-white hover:opacity-80 transition duration-200 ease-out"
                  >
                    Message Instructor
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="bg-white p-8 rounded shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <h1 className="text-black font-bold text-2xl">Refund Details</h1>
            <div className="mt-4">
              <textarea
                className="w-full p-2 border border-gray-300 text-black rounded"
                type="text"
                placeholder="Reason for refund"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <p className="text-sm tracking-wide font-mono text-black rounded-full">
                Refund Amount: {refundAmnt}
              </p>
            </div>
            <button
              onClick={() => {
                handleRefund();
              }}
              disabled={refundLoading}
              className="mt-4 w-full p-2 hover:bg-logo-red text-logo-red border hover:text-white border-logo-red border-solid rounded"
            >
              {refundLoading ? "Loading..." : "Refund"}
            </button>
            <button
              onClick={() => {
                setIsModalOpen(false);
              }}
              className="mt-4 w-full p-2 hover:bg-logo-red text-logo-red border hover:text-white border-logo-red border-solid rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
      {rescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 pt-2 pb-4 rounded shadow-lg max-h-[80vh] overflow-y-auto">
            <RescheduleClass
              classId={id}
              setRescheduleModal={setRescheduleModal}
              instructorId={classCreator}
              bookingId={appointmentId}
            />
            <button
              onClick={() => setRescheduleModal(false)}
              className="mt-4 w-full p-2 hover:bg-logo-red text-logo-red border hover:text-white border-logo-red border-solid rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default StudentCard;
