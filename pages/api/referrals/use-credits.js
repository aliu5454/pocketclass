import { db } from "../../../firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { 
      action, 
      userId, 
      classId, 
      instructorId, 
      bookingId,
      amountUsed,
      totalClassPrice 
    } = req.body;

    if (action === "useCredits") {
      return await useCreditsForBooking(req, res, {
        userId,
        classId,
        instructorId,
        bookingId,
        amountUsed,
        totalClassPrice,
      });
    } else {
      return res.status(400).json({ 
        error: "Invalid action. Supported actions: useCredits" 
      });
    }

  } catch (error) {
    console.error("Error in use-credits API:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}

// Use credits for a booking and deduct from available credits
async function useCreditsForBooking(req, res, { 
  userId, 
  classId, 
  instructorId, 
  bookingId,
  amountUsed,
  totalClassPrice 
}) {
  if (!userId || !classId || !instructorId || !bookingId || amountUsed === undefined) {
    return res.status(400).json({ 
      error: "Missing required fields: userId, classId, instructorId, bookingId, amountUsed" 
    });
  }

  try {
    const batch = writeBatch(db);
    
    // Get user's current credits for this class
    const creditId = `${userId}_${classId}_${instructorId}`;
    const creditsRef = doc(db, "UserCredits", creditId);
    const creditsDoc = await getDoc(creditsRef);

    if (!creditsDoc.exists()) {
      return res.status(404).json({ 
        error: "No credits found for this class" 
      });
    }

    const creditsData = creditsDoc.data();
    const availableCredits = creditsData.availableCredits || 0;

    // Validate that user has enough credits
    if (availableCredits <= 0) {
      return res.status(400).json({ 
        error: "No available credits for this class" 
      });
    }

    // Calculate actual amount to use (min of available credits and amount requested)
    const actualAmountUsed = Math.min(availableCredits, amountUsed, totalClassPrice || amountUsed);

    if (actualAmountUsed <= 0) {
      return res.status(400).json({ 
        error: "Invalid credit amount" 
      });
    }

    // Update credits document
    const newAvailableCredits = availableCredits - actualAmountUsed;
    const newUsedCredits = (creditsData.usedCredits || 0) + actualAmountUsed;

    batch.update(creditsRef, {
      availableCredits: newAvailableCredits,
      usedCredits: newUsedCredits,
      lastUpdated: serverTimestamp(),
    });

    // Create credit transaction record
    const transactionRef = doc(collection(db, "CreditTransactions"));
    batch.set(transactionRef, {
      userId,
      classId,
      instructorId,
      bookingId,
      type: "credit_used",
      amount: actualAmountUsed,
      balanceAfter: newAvailableCredits,
      description: `Credits used for booking ${bookingId}`,
      createdAt: serverTimestamp(),
    });

    // Update booking record with credit information
    if (bookingId) {
      const bookingRef = doc(db, "Bookings", bookingId);
      batch.update(bookingRef, {
        creditsUsed: actualAmountUsed,
        creditsApplied: true,
        creditsTransactionId: transactionRef.id,
        lastUpdated: serverTimestamp(),
      });
    }

    // Commit all changes
    await batch.commit();

    console.log(`Successfully used $${actualAmountUsed} credits for user ${userId}, booking ${bookingId}`);

    return res.status(200).json({
      success: true,
      amountUsed: actualAmountUsed,
      remainingCredits: newAvailableCredits,
      transactionId: transactionRef.id,
      message: `Successfully applied $${actualAmountUsed.toFixed(2)} in credits`
    });

  } catch (error) {
    console.error("Error using credits:", error);
    throw error;
  }
}
