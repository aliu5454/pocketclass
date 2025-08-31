import { db } from "../../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userId, classId, instructorId } = req.body;

    console.log('Free class verification request body:', req.body);
    console.log('Extracted fields:', { userId, classId, instructorId });

    if (!userId || !classId || !instructorId) {
      const missingFields = [];
      if (!userId) missingFields.push('userId');
      if (!classId) missingFields.push('classId');
      if (!instructorId) missingFields.push('instructorId');
      
      console.log('Missing fields:', missingFields);
      
      return res.status(400).json({ 
        eligible: false, 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        receivedFields: { userId: !!userId, classId: !!classId, instructorId: !!instructorId }
      });
    }

    // Get referral settings for the class
    const settingsDoc = await getDoc(doc(db, "ReferralSettings", instructorId));
    if (!settingsDoc.exists()) {
      return res.status(400).json({ 
        eligible: false, 
        error: "Referral settings not found for this instructor" 
      });
    }

    const settings = settingsDoc.data();
    const classSettings = settings.classes?.[classId];

    if (!classSettings?.enabled) {
      return res.status(400).json({ 
        eligible: false, 
        error: "Referral program not enabled for this class" 
      });
    }

    const powerPromotersThreshold = classSettings.powerPromotersThreshold || 5;

    // Get user's referral statistics for this specific class
    const referralsRef = collection(db, "Referrals");
    const userReferralQuery = query(
      referralsRef,
      where("referrerId", "==", userId),
      where("classId", "==", classId),
      where("instructorId", "==", instructorId)
    );

    const userReferralSnapshot = await getDocs(userReferralQuery);
    
    if (userReferralSnapshot.empty) {
      return res.status(400).json({ 
        eligible: false, 
        error: "No referral activity found for this class" 
      });
    }

    const referralDoc = userReferralSnapshot.docs[0];
    const referralData = referralDoc.data();
    const currentProgress = referralData.redemptions || 0;

    // Check if user has reached the threshold
    if (currentProgress < powerPromotersThreshold) {
      return res.status(400).json({ 
        eligible: false, 
        error: `Need ${powerPromotersThreshold - currentProgress} more referrals to be eligible for free class` 
      });
    }

    // Check if user has already claimed a free class for this threshold level
    const currentThresholdLevel = Math.floor(currentProgress / powerPromotersThreshold);
    const expectedFreeClassesClaimed = referralData.freeClassesClaimed || 0;

    if (expectedFreeClassesClaimed >= currentThresholdLevel) {
      return res.status(400).json({ 
        eligible: false, 
        error: "You have already claimed your free class for the current threshold level" 
      });
    }

    // Check if user has already booked this class before
    const bookingsRef = collection(db, "Bookings");
    const existingBookingQuery = query(
      bookingsRef,
      where("student_id", "==", userId),
      where("class_id", "==", classId),
      where("instructor_id", "==", instructorId)
    );

    const existingBookings = await getDocs(existingBookingQuery);
    
    // Allow rebooking if they're eligible for a free class
    // if (!existingBookings.empty) {
    //   return res.status(400).json({ 
    //     eligible: false, 
    //     error: "You have already booked this class" 
    //   });
    // }

    return res.status(200).json({
      eligible: true,
      message: "Eligible for free class",
      currentProgress,
      threshold: powerPromotersThreshold,
      freeClassesClaimed: expectedFreeClassesClaimed,
      thresholdLevel: currentThresholdLevel,
    });

  } catch (error) {
    console.error("Error verifying free class eligibility:", error);
    return res.status(500).json({ 
      eligible: false, 
      error: "Internal server error", 
      message: error.message 
    });
  }
}
