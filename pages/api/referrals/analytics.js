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

    // Get referrals for this instructor in the time range
    const referralsRef = collection(db, "Referrals");
    const referralsQuery = query(
      referralsRef,
      where("instructorId", "==", userId),
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      orderBy("createdAt", "desc")
    );

    const referralsSnapshot = await getDocs(referralsQuery);
    const referrals = referralsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate analytics
    const analytics = await calculateAnalytics(referrals, userId, startDate);

    res.status(200).json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
}

async function calculateAnalytics(referrals, instructorId, startDate) {
  // Initialize analytics object
  const analytics = {
    totalViews: 0,
    totalClicks: 0,
    conversionRate: 0,
    avgRevenuePerReferral: 0,
    uniqueVisitors: 0,
    repeatReferrers: 0,
    directEarnings: 0,
    bonusEarnings: 0,
    referralTrends: [],
    topPerformingClasses: [],
    totalRedemptions: 0,
    totalDiscountsGiven: 0,
  };

  if (referrals.length === 0) {
    return analytics;
  }

  // Get redemption data for more accurate analytics
  const redemptionsRef = collection(db, "ReferralRedemptions");
  const redemptionsQuery = query(
    redemptionsRef,
    where("instructorId", "==", instructorId),
    where("redeemedAt", ">=", Timestamp.fromDate(startDate)),
    orderBy("redeemedAt", "desc")
  );

  const redemptionsSnapshot = await getDocs(redemptionsQuery);
  const redemptions = redemptionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Calculate basic metrics
  const totalReferrals = referrals.length;
  const totalRedemptions = redemptions.length;
  analytics.totalRedemptions = totalRedemptions;

  analytics.conversionRate = totalReferrals > 0 ? ((totalRedemptions / totalReferrals) * 100).toFixed(1) : 0;

  // Calculate revenue metrics from actual redemptions
  analytics.directEarnings = redemptions.reduce((sum, redemption) => {
    return sum + (redemption.referrerReward || 0);
  }, 0);

  analytics.totalDiscountsGiven = redemptions.reduce((sum, redemption) => {
    return sum + (redemption.discountAmount || 0);
  }, 0);

  analytics.avgRevenuePerReferral = totalRedemptions > 0 ? 
    (analytics.directEarnings / totalRedemptions).toFixed(2) : 0;

  // Calculate clicks and views from referrals
  analytics.totalClicks = referrals.reduce((sum, referral) => {
    return sum + (referral.clicks || 0);
  }, 0);

  analytics.totalViews = Math.floor(analytics.totalClicks * 1.5); // Estimate views as 1.5x clicks

  // Calculate unique visitors and repeat referrers from redemptions
  const uniqueReferrers = new Set(redemptions.map(r => r.userId));
  analytics.uniqueVisitors = uniqueReferrers.size;

  const referrerCounts = {};
  redemptions.forEach(r => {
    referrerCounts[r.userId] = (referrerCounts[r.userId] || 0) + 1;
  });
  analytics.repeatReferrers = Object.values(referrerCounts).filter(count => count > 1).length;

  // Calculate daily trends from redemptions
  const dailyTrends = {};
  redemptions.forEach(redemption => {
    const date = new Date(redemption.redeemedAt.seconds * 1000).toISOString().split('T')[0];
    dailyTrends[date] = (dailyTrends[date] || 0) + 1;
  });

  analytics.referralTrends = Object.entries(dailyTrends)
    .map(([date, referrals]) => ({ date, referrals }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-10); // Last 10 days

  // Calculate top performing classes from redemptions
  const classPerformance = {};
  
  for (const redemption of redemptions) {
    const classId = redemption.classId;
    
    if (!classPerformance[classId]) {
      // Get class details
      try {
        const classDoc = await getDoc(doc(db, "classes", classId));
        const classData = classDoc.exists() ? classDoc.data() : null;
        
        classPerformance[classId] = {
          classId,
          className: classData?.Name || "Unknown Class",
          referralCount: 0,
          revenue: 0,
          totalDiscounts: 0,
        };
      } catch (error) {
        console.error("Error fetching class data:", error);
        classPerformance[classId] = {
          classId,
          className: "Unknown Class",
          referralCount: 0,
          revenue: 0,
          totalDiscounts: 0,
        };
      }
    }
    
    classPerformance[classId].referralCount += 1;
    classPerformance[classId].revenue += redemption.referrerReward || 0;
    classPerformance[classId].totalDiscounts += redemption.discountAmount || 0;
  }

  analytics.topPerformingClasses = Object.values(classPerformance)
    .sort((a, b) => b.referralCount - a.referralCount)
    .slice(0, 5);

  return analytics;
}
