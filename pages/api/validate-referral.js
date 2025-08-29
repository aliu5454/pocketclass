import { db } from "../../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  increment,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ 
        error: "Missing referral code" 
      });
    }

    // Find the referral by code
    const referralsRef = collection(db, "Referrals");
    const referralQuery = query(
      referralsRef,
      where("referralCode", "==", referralCode),
      where("status", "==", "active")
    );

    const referralSnapshot = await getDocs(referralQuery);

    if (referralSnapshot.empty) {
      return res.status(404).json({ 
        error: "Invalid or expired referral code" 
      });
    }

    const referralDoc = referralSnapshot.docs[0];
    const referralData = referralDoc.data();

    // Check if referral has reached max redemptions
    if (referralData.redemptions >= (referralData.maxRedemptions || 50)) {
      return res.status(400).json({ 
        error: "Referral code has reached maximum redemptions" 
      });
    }

    // Get instructor's referral settings to get discount details
    const settingsDoc = await getDoc(doc(db, "ReferralSettings", referralData.instructorId));
    const settings = settingsDoc.exists() ? settingsDoc.data() : null;
    const classSettings = settings?.classes?.[referralData.classId];

    if (!classSettings?.enabled) {
      return res.status(400).json({ 
        error: "Referral program not enabled for this class" 
      });
    }

    // Update click count
    await updateDoc(doc(db, "Referrals", referralDoc.id), {
      clicks: increment(1)
    });

    return res.status(200).json({
      success: true,
      discount: classSettings.studentDiscountValue || 10,
      discountType: classSettings.studentDiscountType || "percentage",
      referralData: {
        id: referralDoc.id,
        ...referralData
      }
    });

  } catch (error) {
    console.error("Error validating referral code:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}
