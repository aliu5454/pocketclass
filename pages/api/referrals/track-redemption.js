import { db } from "../../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  increment,
  Timestamp,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      referralCode,
      userId,
      classId,
      instructorId,
      bookingId,
      originalAmount,
      discountAmount,
      finalAmount,
      paymentIntentId,
    } = req.body;

    if (!referralCode || !userId || !classId || !instructorId || !bookingId) {
      return res.status(400).json({
        error: "Missing required fields: referralCode, userId, classId, instructorId, bookingId"
      });
    }

    // Get the referral data
    const referralsRef = collection(db, "Referrals");
    const referralQuery = query(
      referralsRef,
      where("referralCode", "==", referralCode)
    );

    const referralSnapshot = await getDocs(referralQuery);

    if (referralSnapshot.empty) {
      return res.status(404).json({ error: "Referral code not found" });
    }

    const referralDoc = referralSnapshot.docs[0];
    const referralData = referralDoc.data();

    // Get referral settings to calculate referrer reward
    const settingsDoc = await getDoc(doc(db, "ReferralSettings", instructorId));
    const settings = settingsDoc.exists() ? settingsDoc.data() : null;
    const classSettings = settings?.classes?.[classId];

    if (!classSettings) {
      return res.status(400).json({ error: "Referral settings not found for this class" });
    }

    // Calculate referrer reward
    let referrerReward = 0;
    const referrerRewardType = classSettings.referrerRewardType || "percentage";
    const referrerRewardValue = classSettings.referrerRewardValue || 5;

    if (referrerRewardType === "fixed") {
      referrerReward = referrerRewardValue;
    } else if (referrerRewardType === "percentage") {
      referrerReward = (finalAmount * referrerRewardValue) / 100;
    }

    // Create redemption record
    const redemptionData = {
      referralCode,
      referralId: referralDoc.id,
      referrerId: referralData.referrerId,  // The person who created the referral
      userId,  // The person who used the referral
      classId,
      instructorId,
      bookingId,
      paymentIntentId,
      originalAmount: parseFloat(originalAmount) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      finalAmount: parseFloat(finalAmount) || 0,
      referrerReward: parseFloat(referrerReward),
      status: "completed",
      redeemedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    // Add the redemption record
    await addDoc(collection(db, "ReferralRedemptions"), redemptionData);

    // Update referral statistics
    await updateDoc(referralDoc.ref, {
      redemptions: increment(1),
      totalEarnings: increment(referrerReward),
      conversions: increment(1),
      lastRedeemedAt: Timestamp.now(),
    });

    // Update referrer's credits/earnings (the person who created the referral)
    const referrerRef = doc(db, "Users", referralData.referrerId);
    const referrerDoc = await getDoc(referrerRef);

    if (referrerDoc.exists()) {
      const currentCredits = referrerDoc.data().referralCredits || 0;
      await updateDoc(referrerRef, {
        referralCredits: currentCredits + referrerReward,
        totalReferralEarnings: increment(referrerReward),
      });

      // Log the transaction
      await addDoc(collection(db, "ReferralTransactions"), {
        userId: referralData.referrerId,
        type: "credit",
        amount: referrerReward,
        description: `Referral reward for code ${referralCode}`,
        metadata: {
          type: "referral_reward",
          referralCode,
          fromUserId: userId,
          bookingId,
          classId,
          paymentIntentId,
        },
        createdAt: Timestamp.now(),
      });
    }

    // Update student's referral usage record
    const studentUsageData = {
      userId,  // The person who used the referral
      referralCode,
      referrerId: referralData.referrerId,  // The person who created the referral
      instructorId,
      classId,
      bookingId,
      discountAmount: parseFloat(discountAmount) || 0,
      usedAt: Timestamp.now(),
    };

    await addDoc(collection(db, "StudentReferralUsage"), studentUsageData);

    return res.status(200).json({
      success: true,
      message: "Referral redemption tracked successfully",
      data: {
        referrerReward,
        discountAmount,
        redemptionId: redemptionData.id,
      },
    });

  } catch (error) {
    console.error("Error tracking referral redemption:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
