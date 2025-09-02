import { db } from "../../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userId, type } = req.query;

    if (!userId || !type) {
      return res.status(400).json({ 
        error: "Missing required parameters: userId, type" 
      });
    }

    if (type === "instructor") {
      return await getInstructorStats(req, res, userId);
    } else if (type === "student") {
      return await getStudentStats(req, res, userId);
    } else {
      return res.status(400).json({ error: "Invalid type. Must be 'instructor' or 'student'" });
    }

  } catch (error) {
    console.error("Error getting referral stats:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}

async function getInstructorStats(req, res, instructorId) {
  try {
    // Get all referrals for this instructor
    const referralsRef = collection(db, "Referrals");
    const q = query(referralsRef, where("instructorId", "==", instructorId));
    const querySnapshot = await getDocs(q);

    let totalRedemptions = 0;
    let totalRevenue = 0;
    let totalClicks = 0;
    let activeReferrals = 0;
    const referrerStats = new Map();
    const classStats = new Map();

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalRedemptions += data.redemptions || 0;
      totalRevenue += data.totalEarnings || 0;
      totalClicks += data.clicks || 0;

      if (data.status === "active") {
        activeReferrals++;
      }

      // Track per referrer stats
      if (data.redemptions > 0) {
        const referrerId = data.referrerId;
        if (referrerStats.has(referrerId)) {
          referrerStats.set(referrerId, referrerStats.get(referrerId) + data.redemptions);
        } else {
          referrerStats.set(referrerId, data.redemptions);
        }
      }

      // Track per class stats
      const classId = data.classId;
      if (classStats.has(classId)) {
        const existing = classStats.get(classId);
        classStats.set(classId, {
          redemptions: existing.redemptions + (data.redemptions || 0),
          clicks: existing.clicks + (data.clicks || 0),
          earnings: parseFloat((existing.earnings + (data.totalEarnings || 0)).toFixed(2)),
        });
      } else {
        classStats.set(classId, {
          redemptions: data.redemptions || 0,
          clicks: data.clicks || 0,
          earnings: parseFloat((data.totalEarnings || 0).toFixed(2)),
        });
      }
    });

    // Get top referrers with user details
    const topReferrersData = await Promise.all(
      Array.from(referrerStats.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(async ([userId, count]) => {
          const userDoc = await getDoc(doc(db, "Users", userId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          return {
            userId,
            name: userData ? `${userData.firstName} ${userData.lastName}` : "Unknown User",
            referralCount: count,
            profileImage: userData?.profileImage
          };
        })
    );

    // Get class details for top performing classes
    const topClassesData = await Promise.all(
      Array.from(classStats.entries())
        .sort(([,a], [,b]) => b.redemptions - a.redemptions)
        .slice(0, 5)
        .map(async ([classId, stats]) => {
          const classDoc = await getDoc(doc(db, "classes", classId));
          const classData = classDoc.exists() ? classDoc.data() : null;
          return {
            classId,
            className: classData?.Name || "Unknown Class",
            ...stats
          };
        })
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalRedemptions,
        totalReferralRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalClicks,
        activeReferrals,
        totalReferrers: referrerStats.size,
        conversionRate: parseFloat((totalClicks > 0 ? (totalRedemptions / totalClicks) * 100 : 0).toFixed(2)),
        topPromoters: topReferrersData,
        topClasses: topClassesData,
      }
    });

  } catch (error) {
    console.error("Error getting instructor stats:", error);
    throw error;
  }
}

async function getStudentStats(req, res, studentId) {
  try {
    console.log("Getting student stats for:", studentId);
    
    // Get all referrals created by this student
    const referralsRef = collection(db, "Referrals");
    const referralsQuery = query(referralsRef, where("referrerId", "==", studentId));
    const referralsSnapshot = await getDocs(referralsQuery);

    console.log("Found referrals created by student:", referralsSnapshot.size);

    // Get all redemptions for this student's referrals (the actual usage count)
    const redemptionsRef = collection(db, "ReferralRedemptions");
    const redemptionsQuery = query(redemptionsRef, where("referrerId", "==", studentId));
    const redemptionsSnapshot = await getDocs(redemptionsQuery);

    console.log("Found redemptions for student's referrals:", redemptionsSnapshot.size);

    let totalEarnings = 0;
    const uniqueUsers = new Set();

        // Calculate total earnings and unique users who used referrals
    redemptionsSnapshot.docs.forEach(docSnapshot => {
      const redemption = docSnapshot.data();
      totalEarnings += redemption.referrerReward || 0;
      if (redemption.userId) {
        uniqueUsers.add(redemption.userId);
      }
    });

    const totalBookings = redemptionsSnapshot.size; // Total number of bookings using referrals
    const totalRedemptions = uniqueUsers.size; // Unique people who booked using referrals
    const totalReferrals = referralsSnapshot.size; // Total referral links created

    // Build referral details with actual redemption counts
    const referralDetails = await Promise.all(
      referralsSnapshot.docs.map(async (docSnapshot) => {
        const referralData = docSnapshot.data();
        
        // Count redemptions for this specific referral code
        const specificRedemptions = redemptionsSnapshot.docs.filter(
          redemptionDoc => redemptionDoc.data().referralCode === referralData.referralCode
        );
        
        const redemptionCount = specificRedemptions.length; // Total bookings for this referral
        const uniqueUsersForReferral = new Set(
          specificRedemptions.map(doc => doc.data().userId)
        ).size; // Unique users for this referral

        const earnings = specificRedemptions.reduce((sum, doc) => {
          return sum + (doc.data().referrerReward || 0);
        }, 0);

        // Get class and instructor details
        const classDoc = await getDoc(doc(db, "classes", referralData.classId));
        const classData = classDoc.exists() ? classDoc.data() : null;

        const instructorDoc = await getDoc(doc(db, "Users", referralData.instructorId));
        const instructorData = instructorDoc.exists() ? instructorDoc.data() : null;

        return {
          id: docSnapshot.id,
          ...referralData,
          redemptions: redemptionCount, // Total bookings for this referral
          uniqueUsers: uniqueUsersForReferral, // Unique users for this referral
          totalEarnings: parseFloat(earnings.toFixed(2)), // Actual earnings from this referral
          className: classData?.Name || "Unknown Class",
          instructorName: instructorData ? `${instructorData.firstName} ${instructorData.lastName}` : "Unknown Instructor",
        };
      })
    );

    // Get recent redemptions for this student's referrals
    const recentRedemptionsQuery = query(
      redemptionsRef,
      where("referrerId", "==", studentId),
      limit(10)
    );
    const recentRedemptionsSnapshot = await getDocs(recentRedemptionsQuery);

    const recentRedemptions = await Promise.all(
      recentRedemptionsSnapshot.docs.map(async (docSnapshot) => {
        try {
          const redemption = docSnapshot.data();
          
          // Get user who redeemed
          const userDoc = await getDoc(doc(db, "Users", redemption.userId));
          const userData = userDoc.exists() ? userDoc.data() : null;

          // Get class details
          const classDoc = await getDoc(doc(db, "classes", redemption.classId));
          const classData = classDoc.exists() ? classDoc.data() : null;

          return {
            id: docSnapshot.id,
            ...redemption,
            redeemedByName: userData ? `${userData.firstName} ${userData.lastName}` : "Unknown User",
            className: classData?.Name || "Unknown Class",
          };
        } catch (error) {
          console.error("Error processing recent redemption:", error);
          return {
            id: docSnapshot.id,
            redeemedByName: "Error loading user",
            className: "Error loading class",
          };
        }
      })
    );

    console.log("Student stats calculated:", {
      totalReferrals,
      totalBookings,
      totalRedemptions,
      totalEarnings,
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalReferrals,
        totalBookings, // Total number of bookings using referrals
        totalRedemptions, // Unique people who booked using referrals
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        totalClicks: 0, // Not tracking clicks for students currently
        conversionRate: parseFloat((totalReferrals > 0 ? (totalRedemptions / totalReferrals) * 100 : 0).toFixed(2)),
        referralDetails: referralDetails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        recentRedemptions,
      }
    });

  } catch (error) {
    console.error("Error getting student stats:", error);
    throw error;
  }
}
