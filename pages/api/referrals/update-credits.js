import { db } from "../../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  increment,
  writeBatch,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { action, referrerId, classId, instructorId, bookingId, creditAmount } = req.body;

    if (action === "addCredits") {
      return await addCreditsForBooking(req, res, {
        referrerId,
        classId,
        instructorId,
        bookingId,
        creditAmount,
      });
    } else if (action === "migrateExistingCredits") {
      return await migrateExistingCredits(req, res, { referrerId });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Error updating credits:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}

// Add credits for a specific booking
async function addCreditsForBooking(req, res, { referrerId, classId, instructorId, bookingId, creditAmount }) {
  try {
    const batch = writeBatch(db);

    // Round credit amount to 2 decimal places
    const roundedCreditAmount = parseFloat(creditAmount.toFixed(2));

    // Create unique credit document ID
    const creditId = `${referrerId}_${classId}_${instructorId}`;
    const creditsRef = doc(db, "UserCredits", creditId);

    // Check if credits document exists
    const creditsDoc = await getDoc(creditsRef);
    
    if (creditsDoc.exists()) {
      // Update existing credits
      batch.update(creditsRef, {
        totalCredits: increment(roundedCreditAmount),
        availableCredits: increment(roundedCreditAmount),
        lastUpdated: new Date(),
        lastBookingId: bookingId,
      });
    } else {
      // Create new credits document
      batch.set(creditsRef, {
        userId: referrerId,
        classId: classId,
        instructorId: instructorId,
        totalCredits: roundedCreditAmount,
        availableCredits: roundedCreditAmount,
        usedCredits: 0,
        createdAt: new Date(),
        lastUpdated: new Date(),
        lastBookingId: bookingId,
      });
    }

    // Also create a credit transaction record
    const transactionRef = doc(collection(db, "CreditTransactions"));
    batch.set(transactionRef, {
      userId: referrerId,
      classId: classId,
      instructorId: instructorId,
      bookingId: bookingId,
      type: "earned", // earned, used, expired
      amount: roundedCreditAmount,
      createdAt: new Date(),
      description: `Credits earned from referral booking`,
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      message: "Credits added successfully",
      creditAmount: roundedCreditAmount,
      totalCredits: parseFloat((creditsDoc.exists() 
        ? creditsDoc.data().totalCredits + roundedCreditAmount 
        : roundedCreditAmount).toFixed(2)),
    });

  } catch (error) {
    console.error("Error adding credits:", error);
    throw error;
  }
}

// Migrate existing referral data to credits system
async function migrateExistingCredits(req, res, { referrerId }) {
  try {
    console.log("Migrating existing credits for user:", referrerId);

    // Get all referral redemptions for this user
    const redemptionsRef = collection(db, "ReferralRedemptions");
    const redemptionsQuery = query(redemptionsRef, where("referrerId", "==", referrerId));
    const redemptionsSnapshot = await getDocs(redemptionsQuery);

    if (redemptionsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: "No existing redemptions found to migrate",
        migratedCredits: 0,
      });
    }

    const batch = writeBatch(db);
    const creditsSummary = new Map(); // classId-instructorId -> total credits

    // Process each redemption
    for (const redemptionDoc of redemptionsSnapshot.docs) {
      const redemption = redemptionDoc.data();
      const creditAmount = redemption.referrerReward || 0;
      
      if (creditAmount > 0) {
        const key = `${redemption.classId}_${redemption.instructorId}`;
        const currentCredits = creditsSummary.get(key) || 0;
        creditsSummary.set(key, parseFloat((currentCredits + creditAmount).toFixed(2)));
      }
    }

    // Create or update credits documents
    for (const [key, totalCredits] of creditsSummary.entries()) {
      const [classId, instructorId] = key.split('_');
      const creditId = `${referrerId}_${classId}_${instructorId}`;
      const creditsRef = doc(db, "UserCredits", creditId);

      // Check if already exists
      const existingDoc = await getDoc(creditsRef);
      
      if (!existingDoc.exists()) {
        batch.set(creditsRef, {
          userId: referrerId,
          classId: classId,
          instructorId: instructorId,
          totalCredits: parseFloat(totalCredits.toFixed(2)),
          availableCredits: parseFloat(totalCredits.toFixed(2)),
          usedCredits: 0,
          createdAt: new Date(),
          lastUpdated: new Date(),
          migratedFromRedemptions: true,
        });

        // Add migration transaction record
        const transactionRef = doc(collection(db, "CreditTransactions"));
        batch.set(transactionRef, {
          userId: referrerId,
          classId: classId,
          instructorId: instructorId,
          type: "migrated",
          amount: parseFloat(totalCredits.toFixed(2)),
          createdAt: new Date(),
          description: `Credits migrated from existing referral redemptions`,
        });
      }
    }

    await batch.commit();

    return res.status(200).json({
      success: true,
      message: "Credits migrated successfully",
      migratedCredits: parseFloat(Array.from(creditsSummary.values()).reduce((sum, credits) => sum + credits, 0).toFixed(2)),
      classesUpdated: creditsSummary.size,
    });

  } catch (error) {
    console.error("Error migrating credits:", error);
    throw error;
  }
}
