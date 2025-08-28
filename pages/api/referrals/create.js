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
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { referrerId, instructorId, classId } = req.body;

    if (!referrerId || !instructorId || !classId) {
      return res.status(400).json({ 
        error: "Missing required fields: referrerId, instructorId, classId" 
      });
    }

    // Check if referral link already exists
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
      const referralData = existingReferral.data();
      return res.status(200).json({
        success: true,
        referral: {
          id: existingReferral.id,
          ...referralData
        },
        referralLink: `${req.headers.origin || 'https://pocketclass.ca'}/classes/${classId}?ref=${referralData.referralCode}`,
        message: "Existing referral link retrieved"
      });
    }

    // Get instructor's referral settings
    const settingsDoc = await getDoc(doc(db, "ReferralSettings", instructorId));
    const settings = settingsDoc.exists() ? settingsDoc.data() : null;

    // Check if instructor has referral enabled for this class
    const classSettings = settings?.classes?.[classId];
    if (!classSettings?.enabled) {
      return res.status(400).json({ 
        error: "Referral program not enabled for this class by the instructor" 
      });
    }

    // Generate referral code
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    const referralCode = `REF-${referrerId.slice(-4)}-${instructorId.slice(-4)}-${classId.slice(-4)}-${timestamp}-${random}`.toUpperCase();

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

    return res.status(201).json({
      success: true,
      referral: {
        id: docRef.id,
        ...referralData
      },
      referralLink: `${req.headers.origin || 'https://pocketclass.ca'}/classes/${classId}?ref=${referralCode}`,
      message: "Referral link created successfully"
    });

  } catch (error) {
    console.error("Error creating referral link:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}
