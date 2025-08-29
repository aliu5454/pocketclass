import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  increment,
} from "firebase/firestore";

/**
 * Referral Database Schema:
 * 
 * Collections:
 * 1. Referrals - Individual referral links and their usage
 * 2. ReferralSettings - Instructor settings for referral programs
 * 3. ReferralRedemptions - Track when referrals are used
 * 4. ReferralCoupons - Auto-generated discount codes
 */

// Generate unique referral code
export const generateReferralCode = (referrerId, instructorId, classId) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  return `REF-${referrerId.slice(-4)}-${instructorId.slice(-4)}-${classId.slice(-4)}-${timestamp}-${random}`.toUpperCase();
};

// Generate unique coupon code
export const generateCouponCode = (referralCode) => {
  const random = Math.random().toString(36).substr(2, 6);
  return `FRIEND-${referralCode.slice(-8)}-${random}`.toUpperCase();
};

// Create or get existing referral link
export const createReferralLink = async (referrerId, instructorId, classId) => {
  try {
    // Check if referral already exists
    const referralsRef = collection(db, "Referrals");
    const existingQuery = query(
      referralsRef,
      where("referrerId", "==", referrerId),
      where("instructorId", "==", instructorId),
      where("classId", "==", classId)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      const existingReferral = existingSnapshot.docs[0];
      return {
        id: existingReferral.id,
        ...existingReferral.data()
      };
    }

    // Get instructor's referral settings
    const settingsDoc = await getDoc(doc(db, "ReferralSettings", instructorId));
    const settings = settingsDoc.exists() ? settingsDoc.data() : null;
    
    // Check if instructor has referral enabled for this class
    const classSettings = settings?.classes?.[classId];
    if (!classSettings?.enabled) {
      throw new Error("Referral program not enabled for this class");
    }

    // Generate referral code
    const referralCode = generateReferralCode(referrerId, instructorId, classId);
    
    // Create referral record
    const referralData = {
      referralCode,
      referrerId,
      instructorId,
      classId,
      createdAt: new Date(),
      status: "active",
      redemptions: 0,
      totalEarnings: 0,
      clicks: 0,
      conversions: 0,
      discountType: classSettings.discountType || "fixed",
      discountValue: classSettings.discountValue || 5,
      referrerReward: classSettings.referrerReward || 5,
      maxRedemptions: classSettings.maxRedemptions || 50,
    };

    const docRef = await addDoc(referralsRef, referralData);
    
    return {
      id: docRef.id,
      ...referralData
    };
  } catch (error) {
    console.error("Error creating referral link:", error);
    throw error;
  }
};

// Track referral click
export const trackReferralClick = async (referralCode) => {
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
      
      return referralDoc.data();
    }
    
    return null;
  } catch (error) {
    console.error("Error tracking referral click:", error);
    throw error;
  }
};

// Apply referral discount and create coupon
export const applyReferralDiscount = async (referralCode, newUserId, bookingData) => {
  try {
    // Get referral data
    const referralsRef = collection(db, "Referrals");
    const q = query(referralsRef, where("referralCode", "==", referralCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("Invalid referral code");
    }
    
    const referralDoc = querySnapshot.docs[0];
    const referralData = referralDoc.data();
    
    // Check if referral is still active and within limits
    if (referralData.status !== "active") {
      throw new Error("Referral code is no longer active");
    }
    
    if (referralData.redemptions >= referralData.maxRedemptions) {
      throw new Error("Referral code has reached maximum redemptions");
    }
    
    // Check if user hasn't used a referral for this instructor before
    const redemptionsRef = collection(db, "ReferralRedemptions");
    const existingRedemptionQuery = query(
      redemptionsRef,
      where("userId", "==", newUserId),
      where("instructorId", "==", referralData.instructorId)
    );
    
    const existingRedemptions = await getDocs(existingRedemptionQuery);
    if (!existingRedemptions.empty) {
      throw new Error("You have already used a referral for this instructor");
    }
    
    // Generate coupon code
    const couponCode = generateCouponCode(referralCode);
    
    // Calculate discount amount
    let discountAmount = 0;
    if (referralData.discountType === "fixed") {
      discountAmount = referralData.discountValue;
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
      userId: newUserId,
      isUsed: false,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      bookingId: null,
    };
    
    await addDoc(collection(db, "ReferralCoupons"), couponData);
    
    return {
      couponCode,
      discountAmount,
      discountType: referralData.discountType,
      discountValue: referralData.discountValue,
    };
  } catch (error) {
    console.error("Error applying referral discount:", error);
    throw error;
  }
};

// Process referral redemption (call this after successful payment)
export const processReferralRedemption = async (couponCode, bookingId, paymentAmount) => {
  try {
    // Get coupon data
    const couponsRef = collection(db, "ReferralCoupons");
    const couponQuery = query(couponsRef, where("code", "==", couponCode));
    const couponSnapshot = await getDocs(couponQuery);
    
    if (couponSnapshot.empty) {
      throw new Error("Invalid coupon code");
    }
    
    const couponDoc = couponSnapshot.docs[0];
    const couponData = couponDoc.data();
    
    if (couponData.isUsed) {
      throw new Error("Coupon has already been used");
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
      
      // Add reward to referrer's wallet/credits (if you have a wallet system)
      // You can implement this based on your existing wallet structure
      await addReferrerReward(couponData.referrerId, referrerReward, {
        type: "referral_reward",
        referralCode: couponData.referralCode,
        fromUserId: couponData.userId,
        bookingId,
      });
    }
    
    return {
      success: true,
      discountApplied: couponData.discountAmount,
      referrerRewarded: true,
    };
  } catch (error) {
    console.error("Error processing referral redemption:", error);
    throw error;
  }
};

// Add reward to referrer (integrate with your existing wallet/credit system)
const addReferrerReward = async (referrerId, rewardAmount, metadata) => {
  try {
    // Add to referral credits/wallet
    const userRef = doc(db, "Users", referrerId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentCredits = userDoc.data().referralCredits || 0;
      await updateDoc(userRef, {
        referralCredits: currentCredits + rewardAmount,
      });
      
      // Log the transaction
      await addDoc(collection(db, "ReferralTransactions"), {
        userId: referrerId,
        type: "credit",
        amount: rewardAmount,
        description: `Referral reward for code ${metadata.referralCode}`,
        metadata,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error adding referrer reward:", error);
  }
};

// Get referral statistics for instructor
export const getInstructorReferralStats = async (instructorId) => {
  try {
    const referralsRef = collection(db, "Referrals");
    const q = query(referralsRef, where("instructorId", "==", instructorId));
    const querySnapshot = await getDocs(q);
    
    let totalRedemptions = 0;
    let totalRevenue = 0;
    let totalClicks = 0;
    let activeReferrals = 0;
    const referrerStats = new Map();
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalRedemptions += data.redemptions || 0;
      totalRevenue += data.totalEarnings || 0;
      totalClicks += data.clicks || 0;
      
      if (data.status === "active") {
        activeReferrals++;
      }
      
      if (data.redemptions > 0) {
        const referrerId = data.referrerId;
        if (referrerStats.has(referrerId)) {
          referrerStats.set(referrerId, referrerStats.get(referrerId) + data.redemptions);
        } else {
          referrerStats.set(referrerId, data.redemptions);
        }
      }
    });
    
    // Get top referrers
    const topReferrers = Array.from(referrerStats.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    return {
      totalRedemptions,
      totalRevenue,
      totalClicks,
      activeReferrals,
      totalReferrers: referrerStats.size,
      conversionRate: totalClicks > 0 ? (totalRedemptions / totalClicks) * 100 : 0,
      topReferrers,
    };
  } catch (error) {
    console.error("Error getting instructor referral stats:", error);
    throw error;
  }
};

// Update instructor referral settings
export const updateInstructorReferralSettings = async (instructorId, classId, settings) => {
  try {
    const settingsRef = doc(db, "ReferralSettings", instructorId);
    const settingsDoc = await getDoc(settingsRef);
    
    let currentSettings = {};
    if (settingsDoc.exists()) {
      currentSettings = settingsDoc.data();
    }
    
    const updatedSettings = {
      ...currentSettings,
      classes: {
        ...currentSettings.classes,
        [classId]: {
          enabled: settings.enabled || false,
          discountType: settings.discountType || "fixed", // "fixed" or "percentage"
          discountValue: settings.discountValue || 5,
          referrerReward: settings.referrerReward || 5,
          maxRedemptions: settings.maxRedemptions || 50,
          description: settings.description || "",
          updatedAt: new Date(),
        }
      },
      updatedAt: new Date(),
    };
    
    await setDoc(settingsRef, updatedSettings, { merge: true });
    
    return updatedSettings;
  } catch (error) {
    console.error("Error updating referral settings:", error);
    throw error;
  }
};

// Validate and get referral data for booking
export const validateReferralForBooking = async (referralCode, userId, classId) => {
  try {
    if (!referralCode) return null;
    
    // Track the click
    const referralData = await trackReferralClick(referralCode);
    
    if (!referralData) {
      return { valid: false, error: "Invalid referral code" };
    }
    
    // Check if referral is for the correct class
    if (referralData.classId !== classId) {
      return { valid: false, error: "Referral code is not valid for this class" };
    }
    
    // Check if user is trying to use their own referral
    if (referralData.referrerId === userId) {
      return { valid: false, error: "You cannot use your own referral code" };
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
      return { valid: false, error: "You have already used a referral for this instructor" };
    }
    
    // Check redemption limits
    if (referralData.redemptions >= referralData.maxRedemptions) {
      return { valid: false, error: "This referral code has reached its usage limit" };
    }
    
    return {
      valid: true,
      referralData,
      discountType: referralData.discountType,
      discountValue: referralData.discountValue,
    };
  } catch (error) {
    console.error("Error validating referral:", error);
    return { valid: false, error: "Error validating referral code" };
  }
};
