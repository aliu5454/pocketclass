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
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { action, ...data } = req.body;

    switch (action) {
      case "validateReferral":
        return await validateReferral(req, res, data);
      case "applyReferralDiscount":
        return await applyReferralDiscount(req, res, data);
      case "processRedemption":
        return await processRedemption(req, res, data);
      case "trackClick":
        return await trackClick(req, res, data);
      default:
        return res.status(400).json({ message: "Invalid action" });
    }
  } catch (error) {
    console.error("Referral API error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// Validate referral code for booking
async function validateReferral(req, res, { referralCode, userId, classId }) {
  try {
    if (!referralCode) {
      return res.status(400).json({ valid: false, error: "Referral code is required" });
    }

    // Get referral data
    const referralsRef = collection(db, "Referrals");
    const q = query(referralsRef, where("referralCode", "==", referralCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ valid: false, error: "Invalid referral code" });
    }

    const referralDoc = querySnapshot.docs[0];
    const referralData = referralDoc.data();

    // Validation checks
    if (referralData.status !== "active") {
      return res.status(400).json({ valid: false, error: "Referral code is no longer active" });
    }

    if (referralData.classId !== classId) {
      return res.status(400).json({ valid: false, error: "Referral code is not valid for this class" });
    }

    if (referralData.referrerId === userId) {
      return res.status(400).json({ valid: false, error: "You cannot use your own referral code" });
    }

    if (referralData.redemptions >= referralData.maxRedemptions) {
      return res.status(400).json({ valid: false, error: "This referral code has reached its usage limit" });
    }

    // Check if user has already used a referral for this instructor
    const redemptionsRef = collection(db, "ReferralRedemptions");
    const existingQuery = query(
      redemptionsRef,
      where("userId", "==", userId),
      where("instructorId", "==", referralData.instructorId)
    );

    const existingRedemptions = await getDocs(existingQuery);
    if (!existingRedemptions.empty) {
      return res.status(400).json({ valid: false, error: "You have already used a referral for this instructor" });
    }

    // Track the click
    await updateDoc(referralDoc.ref, {
      clicks: increment(1),
      lastClickedAt: new Date()
    });

    return res.status(200).json({
      valid: true,
      referralData: {
        ...referralData,
        id: referralDoc.id
      },
      discountType: referralData.discountType,
      discountValue: referralData.discountValue,
    });
  } catch (error) {
    console.error("Error validating referral:", error);
    return res.status(500).json({ valid: false, error: "Error validating referral code" });
  }
}

// Apply referral discount and create coupon
async function applyReferralDiscount(req, res, { referralCode, userId, bookingData }) {
  try {
    // Get referral data
    const referralsRef = collection(db, "Referrals");
    const q = query(referralsRef, where("referralCode", "==", referralCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    const referralDoc = querySnapshot.docs[0];
    const referralData = referralDoc.data();

    // Generate coupon code
    const random = Math.random().toString(36).substr(2, 6);
    const couponCode = `FRIEND-${referralCode.slice(-8)}-${random}`.toUpperCase();

    // Calculate discount amount
    let discountAmount = 0;
    if (referralData.discountType === "fixed") {
      discountAmount = Math.min(referralData.discountValue, bookingData.totalAmount);
    } else if (referralData.discountType === "percentage") {
      discountAmount = (bookingData.totalAmount * referralData.discountValue) / 100;
    }

    // Create coupon
    const couponData = {
      code: couponCode,
      type: "referral_discount",
      discountType: referralData.discountType,
      discountValue: referralData.discountValue,
      discountAmount,
      referralCode,
      referrerId: referralData.referrerId,
      instructorId: referralData.instructorId,
      classId: referralData.classId,
      userId,
      isUsed: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      bookingId: null,
      originalAmount: bookingData.totalAmount,
    };

    await addDoc(collection(db, "ReferralCoupons"), couponData);

    return res.status(200).json({
      couponCode,
      discountAmount,
      discountType: referralData.discountType,
      discountValue: referralData.discountValue,
      finalAmount: bookingData.totalAmount - discountAmount,
    });
  } catch (error) {
    console.error("Error applying referral discount:", error);
    return res.status(500).json({ error: "Error applying referral discount" });
  }
}

// Process referral redemption after successful payment
async function processRedemption(req, res, { couponCode, bookingId, paymentAmount }) {
  try {
    // Get coupon data
    const couponsRef = collection(db, "ReferralCoupons");
    const couponQuery = query(couponsRef, where("code", "==", couponCode));
    const couponSnapshot = await getDocs(couponQuery);

    if (couponSnapshot.empty) {
      return res.status(404).json({ error: "Invalid coupon code" });
    }

    const couponDoc = couponSnapshot.docs[0];
    const couponData = couponDoc.data();

    if (couponData.isUsed) {
      return res.status(400).json({ error: "Coupon has already been used" });
    }

    // Mark coupon as used
    await updateDoc(couponDoc.ref, {
      isUsed: true,
      usedAt: new Date(),
      bookingId,
      finalPaymentAmount: paymentAmount,
    });

    // Update referral statistics
    const referralsRef = collection(db, "Referrals");
    const referralQuery = query(
      referralsRef,
      where("referralCode", "==", couponData.referralCode)
    );
    const referralSnapshot = await getDocs(referralQuery);

    if (!referralSnapshot.empty) {
      const referralDoc = referralSnapshot.docs[0];
      const referralData = referralDoc.data();

      // Calculate referrer reward
      let referrerReward = 0;
      if (referralData.discountType === "fixed") {
        referrerReward = referralData.referrerReward || 5;
      } else {
        referrerReward = (paymentAmount * (referralData.referrerReward || 5)) / 100;
      }

      // Update referral stats
      await updateDoc(referralDoc.ref, {
        redemptions: increment(1),
        totalEarnings: increment(referrerReward),
        conversions: increment(1),
        lastRedeemedAt: new Date(),
      });

      // Create redemption record
      await addDoc(collection(db, "ReferralRedemptions"), {
        referralCode: couponData.referralCode,
        couponCode,
        referrerId: couponData.referrerId,
        userId: couponData.userId,
        instructorId: couponData.instructorId,
        classId: couponData.classId,
        bookingId,
        discountAmount: couponData.discountAmount,
        referrerReward,
        paymentAmount,
        redeemedAt: new Date(),
      });

      // Add reward to referrer's credits
      const userRef = doc(db, "Users", couponData.referrerId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const currentCredits = userDoc.data().referralCredits || 0;
        await updateDoc(userRef, {
          referralCredits: currentCredits + referrerReward,
        });

        // Log the transaction
        await addDoc(collection(db, "ReferralTransactions"), {
          userId: couponData.referrerId,
          type: "credit",
          amount: referrerReward,
          description: `Referral reward for code ${couponData.referralCode}`,
          metadata: {
            type: "referral_reward",
            referralCode: couponData.referralCode,
            fromUserId: couponData.userId,
            bookingId,
          },
          createdAt: new Date(),
        });
      }
    }

    return res.status(200).json({
      success: true,
      discountApplied: couponData.discountAmount,
      referrerRewarded: true,
    });
  } catch (error) {
    console.error("Error processing referral redemption:", error);
    return res.status(500).json({ error: "Error processing referral redemption" });
  }
}

// Track referral click
async function trackClick(req, res, { referralCode }) {
  try {
    const referralsRef = collection(db, "Referrals");
    const q = query(referralsRef, where("referralCode", "==", referralCode));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const referralDoc = querySnapshot.docs[0];
      await updateDoc(referralDoc.ref, {
        clicks: increment(1),
        lastClickedAt: new Date()
      });

      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ error: "Referral code not found" });
  } catch (error) {
    console.error("Error tracking referral click:", error);
    return res.status(500).json({ error: "Error tracking click" });
  }
}
