import { db } from "../../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, userType = "instructor" } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    let summary = {};

    if (userType === "instructor") {
      summary = await getInstructorSummary(userId);
    } else {
      summary = await getStudentSummary(userId);
    }

    res.status(200).json({
      success: true,
      summary
    });

  } catch (error) {
    console.error("Error fetching referral summary:", error);
    res.status(500).json({ error: "Failed to fetch referral summary" });
  }
}

async function getInstructorSummary(instructorId) {
  // Get all referrals created by instructor
  const referralsRef = collection(db, "Referrals");
  const referralsQuery = query(
    referralsRef,
    where("instructorId", "==", instructorId)
  );
  const referralsSnapshot = await getDocs(referralsQuery);
  const referrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Get all redemptions for this instructor
  const redemptionsRef = collection(db, "ReferralRedemptions");
  const redemptionsQuery = query(
    redemptionsRef,
    where("instructorId", "==", instructorId),
    orderBy("redeemedAt", "desc")
  );
  const redemptionsSnapshot = await getDocs(redemptionsQuery);
  const redemptions = redemptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Calculate totals
  const totalReferralsCreated = referrals.length;
  const totalRedemptions = redemptions.length;
  const totalEarnings = redemptions.reduce((sum, r) => sum + (r.referrerReward || 0), 0);
  const totalDiscountsGiven = redemptions.reduce((sum, r) => sum + (r.discountAmount || 0), 0);
  const totalClicks = referrals.reduce((sum, r) => sum + (r.clicks || 0), 0);

  // Recent activity (last 5 redemptions)
  const recentActivity = await Promise.all(
    redemptions.slice(0, 5).map(async (redemption) => {
      try {
        const classDoc = await getDoc(doc(db, "classes", redemption.classId));
        const userDoc = await getDoc(doc(db, "Users", redemption.userId));
        
        return {
          id: redemption.id,
          className: classDoc.exists() ? classDoc.data().Name : "Unknown Class",
          studentName: userDoc.exists() ? userDoc.data().displayName || userDoc.data().email : "Unknown User",
          discountAmount: redemption.discountAmount || 0,
          earnings: redemption.referrerReward || 0,
          redeemedAt: redemption.redeemedAt,
        };
      } catch (error) {
        console.error("Error fetching activity details:", error);
        return {
          id: redemption.id,
          className: "Unknown Class",
          studentName: "Unknown User",
          discountAmount: redemption.discountAmount || 0,
          earnings: redemption.referrerReward || 0,
          redeemedAt: redemption.redeemedAt,
        };
      }
    })
  );

  return {
    userType: "instructor",
    totals: {
      referralsCreated: totalReferralsCreated,
      totalRedemptions,
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      totalDiscountsGiven: parseFloat(totalDiscountsGiven.toFixed(2)),
      totalClicks,
      conversionRate: totalClicks > 0 ? ((totalRedemptions / totalClicks) * 100).toFixed(1) : 0,
    },
    recentActivity,
    performance: {
      avgEarningsPerRedemption: totalRedemptions > 0 ? 
        (totalEarnings / totalRedemptions).toFixed(2) : 0,
      avgDiscountPerRedemption: totalRedemptions > 0 ? 
        (totalDiscountsGiven / totalRedemptions).toFixed(2) : 0,
    }
  };
}

async function getStudentSummary(userId) {
  // Get student's referral usage
  const usageRef = collection(db, "StudentReferralUsage");
  const usageQuery = query(
    usageRef,
    where("userId", "==", userId),
    orderBy("usedAt", "desc")
  );
  const usageSnapshot = await getDocs(usageQuery);
  const referralUsage = usageSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Get redemptions where this user was the referrer
  const redemptionsRef = collection(db, "ReferralRedemptions");
  const redemptionsQuery = query(
    redemptionsRef,
    where("referrerId", "==", userId),
    orderBy("redeemedAt", "desc")
  );
  const redemptionsSnapshot = await getDocs(redemptionsQuery);
  const referralRedemptions = redemptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Calculate totals
  const totalSavings = referralUsage.reduce((sum, u) => sum + (u.discountAmount || 0), 0);
  const totalEarnings = referralRedemptions.reduce((sum, r) => sum + (r.referrerReward || 0), 0);
  const referralsUsed = referralUsage.length;
  const referralsShared = referralRedemptions.length;

  // Recent activity - mix of savings and earnings
  const allActivity = [
    ...referralUsage.map(usage => ({
      type: "saved",
      amount: usage.discountAmount || 0,
      date: usage.usedAt,
      classId: usage.classId,
    })),
    ...referralRedemptions.map(redemption => ({
      type: "earned",
      amount: redemption.referrerReward || 0,
      date: redemption.redeemedAt,
      classId: redemption.classId,
    }))
  ];

  // Sort by date and get recent 5
  allActivity.sort((a, b) => b.date.seconds - a.date.seconds);
  
  const recentActivity = await Promise.all(
    allActivity.slice(0, 5).map(async (activity) => {
      try {
        const classDoc = await getDoc(doc(db, "classes", activity.classId));
        
        return {
          type: activity.type,
          className: classDoc.exists() ? classDoc.data().Name : "Unknown Class",
          amount: activity.amount,
          date: activity.date,
        };
      } catch (error) {
        console.error("Error fetching activity details:", error);
        return {
          type: activity.type,
          className: "Unknown Class",
          amount: activity.amount,
          date: activity.date,
        };
      }
    })
  );

  // Get total referrals created for conversion rate
  const referralsRef = collection(db, "Referrals");
  const userReferralsQuery = query(
    referralsRef,
    where("instructorId", "==", userId)
  );
  const userReferralsSnapshot = await getDocs(userReferralsQuery);
  const totalReferralsCreated = userReferralsSnapshot.size;

  return {
    userType: "student",
    totals: {
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      totalEarnings: parseFloat(totalEarnings.toFixed(2)),
      referralsUsed,
      referralsShared,
      referralsCreated: totalReferralsCreated,
      conversionRate: totalReferralsCreated > 0 ? 
        ((referralsShared / totalReferralsCreated) * 100).toFixed(1) : 0,
    },
    recentActivity,
    performance: {
      avgSavingsPerUse: referralsUsed > 0 ? 
        (totalSavings / referralsUsed).toFixed(2) : 0,
      avgEarningsPerShare: referralsShared > 0 ? 
        (totalEarnings / referralsShared).toFixed(2) : 0,
      totalBenefit: parseFloat((totalSavings + totalEarnings).toFixed(2)),
    }
  };
}
