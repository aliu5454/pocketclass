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
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { userId, classId, instructorId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "Missing required parameter: userId" });
    }

    if (classId && instructorId) {
      // Get credits for specific class
      return await getClassCredits(req, res, { userId, classId, instructorId });
    } else {
      // Get all credits for user
      return await getAllUserCredits(req, res, { userId });
    }

  } catch (error) {
    console.error("Error getting user credits:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error.message 
    });
  }
}

// Get credits for a specific class
async function getClassCredits(req, res, { userId, classId, instructorId }) {
  try {
    const creditId = `${userId}_${classId}_${instructorId}`;
    const creditsRef = doc(db, "UserCredits", creditId);
    const creditsDoc = await getDoc(creditsRef);

    if (!creditsDoc.exists()) {
      return res.status(200).json({
        success: true,
        credits: {
          totalCredits: 0,
          availableCredits: 0,
          usedCredits: 0,
        },
      });
    }

    const creditsData = creditsDoc.data();

    return res.status(200).json({
      success: true,
      credits: {
        totalCredits: parseFloat((creditsData.totalCredits || 0).toFixed(2)),
        availableCredits: parseFloat((creditsData.availableCredits || 0).toFixed(2)),
        usedCredits: parseFloat((creditsData.usedCredits || 0).toFixed(2)),
        lastUpdated: creditsData.lastUpdated,
      },
    });

  } catch (error) {
    console.error("Error getting class credits:", error);
    throw error;
  }
}

// Get all credits for a user
async function getAllUserCredits(req, res, { userId }) {
  try {
    const creditsRef = collection(db, "UserCredits");
    const creditsQuery = query(creditsRef, where("userId", "==", userId));
    const creditsSnapshot = await getDocs(creditsQuery);

    const allCredits = {};
    let totalAvailableCredits = 0;
    let totalEarnedCredits = 0;

    creditsSnapshot.docs.forEach(doc => {
      const creditsData = doc.data();
      const key = `${creditsData.classId}_${creditsData.instructorId}`;
      
      allCredits[key] = {
        classId: creditsData.classId,
        instructorId: creditsData.instructorId,
        totalCredits: parseFloat((creditsData.totalCredits || 0).toFixed(2)),
        availableCredits: parseFloat((creditsData.availableCredits || 0).toFixed(2)),
        usedCredits: parseFloat((creditsData.usedCredits || 0).toFixed(2)),
        lastUpdated: creditsData.lastUpdated,
      };

      totalAvailableCredits += creditsData.availableCredits || 0;
      totalEarnedCredits += creditsData.totalCredits || 0;
    });

    return res.status(200).json({
      success: true,
      allCredits,
      summary: {
        totalAvailableCredits: parseFloat(totalAvailableCredits.toFixed(2)),
        totalEarnedCredits: parseFloat(totalEarnedCredits.toFixed(2)),
        totalUsedCredits: parseFloat((totalEarnedCredits - totalAvailableCredits).toFixed(2)),
        classCount: Object.keys(allCredits).length,
      },
    });

  } catch (error) {
    console.error("Error getting all user credits:", error);
    throw error;
  }
}
