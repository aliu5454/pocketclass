import { auth, db } from "../../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, timeRange = "30days" } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case "7days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90days":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12months":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get student's referral usage in the time range
    const usageRef = collection(db, "StudentReferralUsage");
    const usageQuery = query(
      usageRef,
      where("userId", "==", userId),
      where("usedAt", ">=", Timestamp.fromDate(startDate)),
      orderBy("usedAt", "desc")
    );

    const usageSnapshot = await getDocs(usageQuery);
    const referralUsage = usageSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get student's redemptions (when others used their referrals)
    const redemptionsRef = collection(db, "ReferralRedemptions");
    const redemptionsQuery = query(
      redemptionsRef,
      where("referrerId", "==", userId),
      where("redeemedAt", ">=", Timestamp.fromDate(startDate)),
      orderBy("redeemedAt", "desc")
    );

    const redemptionsSnapshot = await getDocs(redemptionsQuery);
    const referralRedemptions = redemptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate analytics
    const analytics = await calculateStudentAnalytics(referralUsage, referralRedemptions, userId, startDate);

    res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error("Error fetching student analytics:", error);
    res.status(500).json({ error: "Failed to fetch student analytics data" });
  }
}

async function calculateStudentAnalytics(referralUsage, referralRedemptions, userId, startDate) {
  // Initialize analytics object
  const analytics = {
    totalSavings: 0,
    totalEarnings: 0,
    referralsUsed: 0,
    referralsShared: 0,
    avgSavingsPerBooking: 0,
    avgEarningsPerReferral: 0,
    savingsTrends: [],
    earningsTrends: [],
    classesWithReferrals: [],
    referralSuccess: {
      totalShared: 0,
      totalUsed: 0,
      conversionRate: 0,
    },
  };

  // Calculate savings from using referrals
  analytics.totalSavings = referralUsage.reduce((sum, usage) => {
    return sum + (usage.discountAmount || 0);
  }, 0);

  analytics.referralsUsed = referralUsage.length;
  analytics.avgSavingsPerBooking = analytics.referralsUsed > 0 ? 
    (analytics.totalSavings / analytics.referralsUsed).toFixed(2) : 0;

  // Calculate earnings from others using student's referrals
  analytics.totalEarnings = referralRedemptions.reduce((sum, redemption) => {
    return sum + (redemption.referrerReward || 0);
  }, 0);

  analytics.referralsShared = referralRedemptions.length;
  analytics.avgEarningsPerReferral = analytics.referralsShared > 0 ? 
    (analytics.totalEarnings / analytics.referralsShared).toFixed(2) : 0;

  // Get total referrals created by this user
  const referralsRef = collection(db, "Referrals");
  const userReferralsQuery = query(
    referralsRef,
    where("instructorId", "==", userId)
  );

  const userReferralsSnapshot = await getDocs(userReferralsQuery);
  const totalReferralsCreated = userReferralsSnapshot.size;

  analytics.referralSuccess.totalShared = totalReferralsCreated;
  analytics.referralSuccess.totalUsed = analytics.referralsShared;
  analytics.referralSuccess.conversionRate = totalReferralsCreated > 0 ? 
    ((analytics.referralsShared / totalReferralsCreated) * 100).toFixed(1) : 0;

  // Calculate daily savings trends
  const savingsTrends = {};
  referralUsage.forEach(usage => {
    const date = new Date(usage.usedAt.seconds * 1000).toISOString().split('T')[0];
    savingsTrends[date] = (savingsTrends[date] || 0) + (usage.discountAmount || 0);
  });

  analytics.savingsTrends = Object.entries(savingsTrends)
    .map(([date, savings]) => ({ date, savings: parseFloat(savings.toFixed(2)) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10); // Last 10 days

  // Calculate daily earnings trends
  const earningsTrends = {};
  referralRedemptions.forEach(redemption => {
    const date = new Date(redemption.redeemedAt.seconds * 1000).toISOString().split('T')[0];
    earningsTrends[date] = (earningsTrends[date] || 0) + (redemption.referrerReward || 0);
  });

  analytics.earningsTrends = Object.entries(earningsTrends)
    .map(([date, earnings]) => ({ date, earnings: parseFloat(earnings.toFixed(2)) }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10); // Last 10 days

  // Calculate classes with referrals
  const classReferrals = {};
  
  // From usage
  for (const usage of referralUsage) {
    const classId = usage.classId;
    
    if (!classReferrals[classId]) {
      try {
        const classDoc = await getDoc(doc(db, "classes", classId));
        const classData = classDoc.exists() ? classDoc.data() : null;
        
        classReferrals[classId] = {
          classId,
          className: classData?.Name || "Unknown Class",
          savings: 0,
          earnings: 0,
          usageCount: 0,
          sharingCount: 0,
        };
      } catch (error) {
        console.error("Error fetching class data:", error);
        classReferrals[classId] = {
          classId,
          className: "Unknown Class",
          savings: 0,
          earnings: 0,
          usageCount: 0,
          sharingCount: 0,
        };
      }
    }
    
    classReferrals[classId].savings += usage.discountAmount || 0;
    classReferrals[classId].usageCount += 1;
  }

  // From redemptions (earnings)
  for (const redemption of referralRedemptions) {
    const classId = redemption.classId;
    
    if (!classReferrals[classId]) {
      try {
        const classDoc = await getDoc(doc(db, "classes", classId));
        const classData = classDoc.exists() ? classDoc.data() : null;
        
        classReferrals[classId] = {
          classId,
          className: classData?.Name || "Unknown Class",
          savings: 0,
          earnings: 0,
          usageCount: 0,
          sharingCount: 0,
        };
      } catch (error) {
        console.error("Error fetching class data:", error);
        classReferrals[classId] = {
          classId,
          className: "Unknown Class",
          savings: 0,
          earnings: 0,
          usageCount: 0,
          sharingCount: 0,
        };
      }
    }
    
    classReferrals[classId].earnings += redemption.referrerReward || 0;
    classReferrals[classId].sharingCount += 1;
  }

  analytics.classesWithReferrals = Object.values(classReferrals)
    .sort((a, b) => (b.savings + b.earnings) - (a.savings + a.earnings))
    .slice(0, 10);

  return analytics;
}
