import moment from "moment-timezone";
import StatusBadge from "./StatusBadge";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  FaStar,
  FaShoppingCart,
  FaClock,
  FaRegCalendarAlt,
  FaRegCommentDots,
  FaTimesCircle,
  FaSchool,
} from "react-icons/fa";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useRouter } from "next/router";

const renderDetails = ({
  selectedAppointment,
  classDetails,
  ismobile,
  setRating,
  formatDuration,
  rating,
  feedback,
  setFeedback,
  hovered,
  setHovered,
  setInvoiceOpen,
  invoiceOpen,
  handleBackMobile,
  setRescheduleModal,
  onCancelSuccess,
}) => {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const studentId = router.query.id;
  const [isCancelling, setIsCancelling] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [reviewText, setReviewText] = useState("");
  if (!selectedAppointment) return null;
  const classData = classDetails[selectedAppointment.class_id];
  if (!classData) return null;
  const imageUrl = classData.Images?.[0] || "/placeholder.jpg";
  const isUpcoming = moment(selectedAppointment.startTime)
    .tz(selectedAppointment.timezone || "America/Toronto")
    .isAfter(moment().tz("America/Toronto"));

  const handleMessageInstructor = async () => {
    console.log("Message Instructor clicked");
    const goToChat = (cid, chid) => {
      router.push({ pathname: "/chat", query: { cid, chid } });
    };
    const chatRoomRef = collection(db, "chatrooms");
    const q = query(
      chatRoomRef,
      where("student", "==", studentId),
      where("instructor", "==", classData.classCreator),
      where("class", "==", classData.id)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      goToChat(classData.classCreator, snapshot.docs[0].id);
    } else {
      const newChat = await addDoc(chatRoomRef, {
        student: studentId,
        instructor: classData.classCreator,
        class: classData.id,
      });
      goToChat(classData.classCreator, newChat.id);
    }
  };

  const handleSubmitReview = async () => {
    if (!rating) {
      toast.error("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const studentRef = doc(db, "Users", studentId);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        toast.error("Student not found");
        return;
      }

      const studentData = studentSnap.data();

      await addDoc(collection(db, "Reviews"), {
        classId: classData.id,
        studentId,
        name: studentData.firstName
          ? `${studentData.firstName} ${studentData.lastName || ""}`.trim()
          : "",
        photo: studentData.photoURL || "",
        review: feedback.trim(),
        qualityRating: rating,
        userId: studentId,
        recommendRating: rating,
        safetyRating: rating,
        createdAt: new Date(),
      });

      toast.success("Review submitted!");
      setFeedback("");
      setRating(0);
    } catch (err) {
      console.error("Review submission failed:", err);
      toast.error("Something went wrong while submitting the review.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCancel = async () => {
    setIsCancelling(true);

    try {
      const timeZone = selectedAppointment?.timeZone || "America/Toronto";
      const now = moment().tz(timeZone).add(24, "hours");
      const bookingStartDate = moment.utc(
        selectedAppointment.startTime,
        "YYYY-MM-DD HH:mm"
      );
      const diff = bookingStartDate.diff(now, "hours");

      if (diff < 0) {
        toast.error("You cannot cancel less than 24 hours in advance.");
        return;
      }

      if (selectedAppointment.paymentMethod === "Package") {
        toast.error("Cannot cancel package bookings, please reschedule.");
        return;
      }

      const bookingRef = doc(db, "Bookings", selectedAppointment.id);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) {
        toast.error("Booking not found.");
        return;
      }
      const bookingData = bookingSnap.data();

      const studentRef = doc(db, "Users", bookingData.student_id);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) {
        toast.error("Student not found.");
        return;
      }
      const studentData = studentSnap.data();
      const userEmails = [
        studentData.email,
        ...(bookingData.groupEmails || []),
      ];

      let refundAmount = null;

      // Refund
      if (selectedAppointment.paymentIntentId) {
        const refundRes = await fetch("/api/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: selectedAppointment.paymentIntentId,
            bookingId: selectedAppointment.id,
            refundReason: refundReason || "Customer requested",
          }),
        });
        const refundData = await refundRes.json();
        if (!refundRes.ok || !refundData.success) {
          throw new Error(refundData.message || "Refund failed");
        }
        refundAmount = refundData.refund.amount ? refundData.refund.amount / 100 : null; // assuming amount is in cents
      }

      // Delete calendar event
      if (selectedAppointment.meetingLink) {
        await fetch("/api/calendar/delete-event", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instructorId: classData.classCreator,
            userEmails,
            classId: bookingData.class_id,
            start: moment
              .utc(bookingData.startTime)
              .format("YYYY-MM-DDTHH:mm:ss"),
            end: moment.utc(bookingData.endTime).format("YYYY-MM-DDTHH:mm:ss"),
            timeZone: bookingData.timeZone || "America/Toronto",
          }),
        });
      }

      try {
        await fetch("/api/notifications/cancelled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: selectedAppointment.id,
            studentId,
            classId: classData.id,
            instructorId: classData.classCreator,
            refundAmount,
            cancellationReason: refundReason || "Manual cancellation",
          }),
        });
      } catch (error) {
        console.error("Error sending cancellation notification:", error);
      }

      await deleteDoc(bookingRef);

      if (reviewText.trim()) {
        await addDoc(collection(db, "Refunds"), {
          studentId,
          classId: classData.id,
          instructorId: classData.classCreator,
          text: reviewText.trim(),
          createdAt: new Date(),
          refundAmount, // save the refund amount (null if not applicable)
        });
      }

      toast.success("Booking cancelled successfully.");
      onCancelSuccess(selectedAppointment.id);
    } catch (err) {
      console.error("Cancellation error:", err);
      toast.error("Cancellation failed.");
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
      setReviewText("");
    }
  };

  const handleReschedule = () => {
    console.log(selectedAppointment);
    const timeZone = selectedAppointment?.timeZone || "America/Toronto";

    const now = moment().tz(timeZone).add(24, "hours");
    const bookingStartDate = moment.utc(
      selectedAppointment.startTime,
      "YYYY-MM-DD HH:mm"
    );
    if (bookingStartDate.isBefore(now)) {
      toast.error(
        "You cannot reschedule an appointment less than 24 hours away."
      );
      return;
    }
    setRescheduleModal(true);
  };

  const handleBookAgain = () => {
    if (selectedAppointment.class_id) {
      router.push(`/classes/id=${selectedAppointment.class_id}`);
    } else {
      toast.error("Class ID not found. Cannot proceed to booking.");
    }
  };

  return (
    <div className={`w-full z-40 ${ismobile ? "overflow-hidden" : ""}`}>
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Cancellation</h3>
            <p className="mb-4">
              Are you sure you want to cancel this booking?
            </p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded mb-4 resize-none"
              rows={4}
              placeholder="Leave an optional review about the class..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md"
                disabled={isCancelling}
              >
                Back
              </button>
              <button
                onClick={confirmCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-md"
                disabled={isCancelling}
              >
                {isCancelling ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className={`h-full flex flex-col ${
          ismobile ? "" : "rounded-xl overflow-hidden shadow-md"
        }`}
      >
        <div className="relative h-64">
          {/* Blurred background image */}
          <img
            src={imageUrl}
            alt="Class Blurred"
            className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
          />

          {/* Contained image on top */}
          <img
            src={imageUrl}
            alt="Class"
            className="relative w-full h-full object-contain z-[2]"
          />

          {/* Overlay */}
          <div className="absolute blur-sm inset-0 bg-black bg-opacity-25 z-[3]" />

          {/* Back button for mobile */}
          {ismobile && (
            <div className="absolute top-0 left-0 z-[4]">
              <button
                className="m-3 p-2 text-logo-red font-semibold text-sm rounded-full shadow-md flex items-center gap-2"
                onClick={handleBackMobile}
              >
                <button
                  onClick={handleBackMobile}
                  className="text-white font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              </button>
            </div>
          )}

          {/* Class Title */}
          <div className="absolute z-[4] bottom-0 w-full p-2 pl-4 text-left text-3xl text-white font-semibold">
            {classData.Name}
          </div>
        </div>

        <div
          className={`flex-1 flex flex-col justify-between ${
            ismobile ? "px-4 pt-4" : "p-4"
          }`}
        >
          <div>
            <div className="mb-2">
              <StatusBadge type={isUpcoming ? "upcoming" : "past"} />
            </div>

            <p className="text-2xl mb-2">
              {moment(selectedAppointment.startTime)
                .tz(selectedAppointment.timezone || "America/Toronto")
                .format("dddd, MMM D, YYYY [at] h:mm A")}
            </p>
            <p className="text-sm text-gray-500 mb-2">
              {formatDuration(
                selectedAppointment.startTime,
                selectedAppointment.endTime,
                selectedAppointment.timezone
              )}{" "}
              duration
            </p>

            {/* Feedback Section */}
            {!isUpcoming && (
              <div className="flex justify-center items-center mt-6 mb-4">
                <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
                  <h3 className="text-lg font-semibold mb-1">
                    How was your experience?
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Let us know your thoughts
                  </p>

                  <div className="flex justify-center gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar
                        key={star}
                        size={28}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        className={`cursor-pointer transition-colors ${
                          Math.max(rating, hovered) >= star
                            ? "text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>

                  {rating > 0 && (
                    <div className="relative rounded-md px-1 pt-2 pb-1 bg-white border border-gray-300">
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Type your feedback..."
                        className="w-full text-sm resize-none bg-transparent min-h-[80px] max-h-40 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-none border-none"
                        style={{
                          display: "flex",
                          flexDirection: "column-reverse",
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                      />
                    </div>
                  )}
                  {rating > 0 && (
                    <button
                      onClick={handleSubmitReview}
                      disabled={submitting}
                      className={`border-box px-4 mt-4 w-full border py-2 font-semibold rounded transition
              ${submitting ? "cursor-not-allowed opacity-70" : ""}
              ${
                submitting
                  ? "bg-[#E53935] text-white"
                  : "bg-[#E53935] text-white hover:bg-white hover:text-[#E53935] hover:border-[#E53935]"
              }`}
                    >
                      {submitting ? "Saving..." : "Submit"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Section */}
          <div className="bg-white border-t mt-6 pt-4">
            <div className="flex flex-col gap-3">
              {isUpcoming ? (
                <>
                  <ActionItem
                    icon={<FaRegCommentDots className="text-lg" />}
                    title="Message Instructor"
                    subtitle="Ask questions or send updates"
                    onClick={handleMessageInstructor}
                  />
                  <ActionItem
                    icon={
                      <div className="relative w-5 h-5">
                        <FaRegCalendarAlt className="absolute top-0 left-0 text-base" />
                        <FaClock className="absolute bottom-0 right-0 text-[10px]" />
                      </div>
                    }
                    title="Reschedule"
                    subtitle="Pick a new time slot"
                    onClick={handleReschedule}
                  />
                  <ActionItem
                    icon={<FaTimesCircle className="text-lg" />}
                    title="Cancel"
                    subtitle="Cancel this appointment"
                    onClick={confirmCancel}
                  />
                </>
              ) : (
                <ActionItem
                  icon={<FaShoppingCart className="text-lg" />}
                  title="Book again"
                  subtitle="Book your next appointment"
                  onClick={handleBookAgain}
                />
              )}

              <ActionItem
                icon={
                  classData.Mode === "Offline" ? (
                    <FaRegCalendarAlt className="text-lg" />
                  ) : (
                    <FaRegCommentDots className="text-lg" />
                  )
                }
                title={
                  classData.Mode === "Offline"
                    ? "Class Location"
                    : "Online Meeting Link"
                }
                subtitle={
                  classData.Mode === "Offline" ? (
                    classData.Address
                  ) : selectedAppointment?.meetingLink ? (
                    <a
                      href={selectedAppointment.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline break-all"
                    >
                      {selectedAppointment.meetingLink}
                    </a>
                  ) : (
                    "Meeting link not available"
                  )
                }
              />
              <ActionItem
                icon={<FaSchool className="text-lg" />}
                title="Go to Class"
                subtitle="Redirect to class page."
                onClick={handleBookAgain}
              />
            </div>
          </div>
        </div>

        {/* Bill Section */}
        <div className="mt-6 bg-white p-4">
          <h3 className="text-lg font-semibold mb-4 px-4">Bill</h3>
          {(() => {
            const lessonPrice = parseFloat(selectedAppointment.price || 0);
            const packageDiscount = parseFloat(
              selectedAppointment.packageDiscount || 0
            );
            const voucherDiscount = parseFloat(
              selectedAppointment.voucherDiscount || 0
            );
            const processingFee = parseFloat(
              selectedAppointment.processingFee || 0
            );

            const subTotal = lessonPrice - packageDiscount - voucherDiscount;
            const total =
              selectedAppointment.total !== undefined
                ? parseFloat(selectedAppointment.total)
                : subTotal + processingFee;

            const formatCurrency = (amount) => `${amount.toFixed(2)} CAD`;

            return (
              <div className="text-sm text-gray-700 space-y-4">
                <Row label="Lesson Price" value={formatCurrency(lessonPrice)} />
                <div className="pt-2 border-t space-y-4">
                  <p className="text-gray-500 text-xs px-4 mb-2 uppercase tracking-wide">
                    Discounts
                  </p>
                  <Row
                    label="Package Discount"
                    value={formatCurrency(packageDiscount)}
                  />
                  <Row
                    label="Voucher Discount"
                    value={formatCurrency(voucherDiscount)}
                  />
                </div>
                <div className="pt-2 border-t space-y-4">
                  <Row label="Subtotal" value={formatCurrency(subTotal)} />
                  <Row
                    label="Processing Fee"
                    value={formatCurrency(processingFee)}
                  />
                </div>
                <div className="pt-2 border-t">
                  <Row
                    label="Total"
                    value={formatCurrency(total)}
                    bold={true}
                  />
                </div>
              </div>
            );
          })()}

          <button
            onClick={() => setInvoiceOpen(true)}
            className="text-logo-red font-semibold cursor-pointer text-sm mt-2 mb-4 ml-4"
          >
            View Invoice
          </button>
          <h1 className="px-4 text-gray-500 text-sm mt-3">
            Booking Ref: {selectedAppointment.id}
          </h1>
        </div>
      </div>
    </div>
  );
};

// Helper for action items
const ActionItem = ({ icon, title, subtitle, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-start gap-4 px-4 py-3 border-b cursor-pointer hover:shadow-sm transition"
  >
    <div className="bg-[#FDECEA] text-logo-red p-2 rounded-full">{icon}</div>
    <div>
      <p className="font-semibold text-sm text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  </div>
);

// Helper for bill rows
const Row = ({ label, value, bold }) => (
  <div className="flex justify-between px-4">
    <span className={bold ? "font-semibold text-base" : "font-medium"}>
      {label}
    </span>
    <span className={bold ? "font-semibold text-base" : ""}>{value}</span>
  </div>
);

export default renderDetails;
