import stripe from "../../utils/stripe";
import { db } from "../../firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import moment from "moment";

export default async function (req, res) {
  try {
    const { paymentIntentId, bookingId, refundReason } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "PaymentIntent ID is required" });
    }
    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }
    const bookingRef = doc(db, "Bookings", bookingId);
    const booking = await getDoc(bookingRef);
    const bookingData = booking.data();

    const start_time = moment.utc(bookingData.startTime);
    const now = moment.utc();
    if (start_time.diff(now, "hours") < 24) {
      return res
        .status(400)
        .json({
          error: "Refund is not allowed within 24 hours of class start time",
        });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!paymentIntent) {
      return res
        .status(404)
        .json({ error: "No charges found for the specified PaymentIntent ID" });
    }
    if (bookingData.paymentMethod === "Package") {
      const packagesRef = collection(db, "Packages");
      const q = query(
        packagesRef,
        where("class_id", "==", bookingData.class_id),
        where("user_id", "==", bookingData.student_id),
        where("payment_intent_id", "==", paymentIntentId)
      );
      const querySnapshot = await getDocs(q);
      const packageDoc = querySnapshot.docs[0];
      if (!packageDoc) {
        return res
          .status(404)
          .json({
            error: "No package found for the specified PaymentIntent ID",
          });
      }
      await updateDoc(packageDoc.ref, {
        classes_left: increment(1),
      });
      await deleteDoc(bookingRef);
      await addDoc(collection(db, "Refunds"), {
        bookingId,
        type: "Package",
        reason: refundReason,
        createdAt: new Date(),
        ...bookingData,
      });
      return res.status(200).json({
        success: true,
        refund,
      });
    }
    // Deduct 5% fees from total amount
    const refundAmount = Math.floor(paymentIntent.amount * 0.95);
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: "requested_by_customer",
    });

    if (!refund) {
      return res.status(500).json({ error: "Error initiating refund" });
    }

    await updateDoc(bookingRef, {
      status: "Pending",
    });
    await addDoc(collection(db, "Refunds"), {
      bookingId,
      amount: refundAmount,
      reason: refundReason,
      createdAt: new Date(),
      ...bookingData,
    });

    res.status(200).json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error("Error initiating refund:", error);
    res.status(500).json({ error: "Error initiating refund" });
  }
}
