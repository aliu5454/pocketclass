import { db } from "../../../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { instructorId, classId, settings } = req.body;

    if (!instructorId || !classId || !settings) {
      return res.status(400).json({ 
        error: "Missing required fields: instructorId, classId, settings" 
      });
    }

    // Get current settings
    const settingsRef = doc(db, "ReferralSettings", instructorId);
    const settingsDoc = await getDoc(settingsRef);
    
    let currentSettings = {};
    if (settingsDoc.exists()) {
      currentSettings = settingsDoc.data();
    }

    // Update settings for the specific class
    const updatedSettings = {
      ...currentSettings,
      classes: {
        ...currentSettings.classes,
        [classId]: {
          enabled: settings.enabled || false,
          discountType: settings.discountType || "fixed",
          discountValue: settings.discountValue || 5,
          referrerReward: settings.referrerReward || 5,
          maxRedemptions: settings.maxRedemptions || 50,
          description: settings.description || "",
          updatedAt: new Date(),
        }
      },
      updatedAt: new Date(),
    };

    // Save to Firestore
    await setDoc(settingsRef, updatedSettings, { merge: true });

    return res.status(200).json({
      success: true,
      settings: updatedSettings,
      message: "Referral settings updated successfully"
    });

  } catch (error) {
    console.error("Error updating referral settings:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}
