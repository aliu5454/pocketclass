import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebaseConfig";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";

export default function MindbodySuccess() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState(null);
  const [mindbodyClasses, setMindbodyClasses] = useState([]);
  const [importComplete, setImportComplete] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState({});

  useEffect(() => {
    const processMindbodyIntegration = async () => {
      if (!user || !router.query.access_token) return;
      try {
        // Step 1: Store Mindbody tokens
        setCurrentStep("Storing Mindbody credentials...");
        const userRef = doc(db, "Users", user.uid);
        await updateDoc(userRef, {
          mindbody: {
            accessToken: router.query.access_token,
            refreshToken: router.query.refresh_token,
            expiresIn: parseInt(router.query.expires_in) || 3600,
            tokenType: router.query.token_type || "Bearer",
            updatedAt: new Date().toISOString(),
          },
        });
        // Get Mindbody site id from user profile
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error("User profile not found");
        }
        const mindbodySiteId = userDoc.data().mindbodySite;
        console.log("Mindbody site ID:", mindbodySiteId);
        // Step 2: Fetch and store Mindbody classes
        setCurrentStep("Fetching classes from Mindbody...");
        const classesResponse = await fetch("/api/mindbody/classes", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${router.query.access_token}`,
            SiteId: mindbodySiteId || "-9", // Default to -99 if not set
          },
        });

        if (!classesResponse.ok) {
          const error = await classesResponse.json();
          throw new Error(
            `Failed to fetch Mindbody classes: ${
              error.message || classesResponse.statusText
            }`
          );
        }

        const mindbodyClasses = await classesResponse.json(); // Store classes in our DB
        setCurrentStep("Organizing classes...");
        console.log("Fetched Mindbody classes:", mindbodyClasses);
        // Remove all classes that are duplocates of same Description ID
        const uniqueClasses = new Map();
        mindbodyClasses.forEach((mbClass) => {
          const classId = mbClass.ClassDescription?.Id;
          if (classId && !uniqueClasses.has(classId)) {
            uniqueClasses.set(classId, mbClass);
          }
        });
        for (const mbClass of uniqueClasses.values()) {
          const classData = {
            mindbodyId: mbClass.ClassDescription?.Id,
            mindbodySessionTypeId: mbClass.SessionType?.Id || null,
            Name: mbClass.ClassDescription?.Name || "Unnamed Class",
            Description: mbClass.ClassDescription?.Description || "",
            Category: mbClass.ClassDescription?.Category || "",
            SubCategory: mbClass.ClassDescription?.Subcategory || "",
            Address:
              mbClass.Location?.Address + ", " + mbClass.Location?.Address2 ||
              "",
            latitude: mbClass.Location?.Latitude || 0,
            longitude: mbClass.Location?.Longitude || 0,
            Mode: mbClass.VirtualStreamLink ? "Online" : "Offline",
            groupSize: mbClass.MaxCapacity,
            status: "pending",
            classCreator: user.uid,
            Images: [mbClass.ClassDescription?.ImageURL] || [],
            updatedAt: new Date().toISOString(),
            About: mbClass.Staff?.Bio || "",
          };
          const existingClassesQuery = query(
            collection(db, "classes"),
            where("mindbodyId", "==", mbClass.ClassDescription?.Id)
          );
          const existingClassesSnapshot = await getDocs(existingClassesQuery);
          if (existingClassesSnapshot.empty) {
            setMindbodyClasses((prev) => [...prev, classData]);
          }
        }

        // Set import as complete to show class list
        setImportComplete(true);
      } catch (error) {
        console.error("Error during Mindbody integration:", error);
        setError(
          error.message || "Unknown error occurred during Mindbody integration"
        );

        // Update user with integration failure
        try {
          await updateDoc(doc(db, "Users", user.uid), {
            mindbodyIntegrationError: error.message,
            mindbodyIntegrationErrorTime: new Date().toISOString(),
          });
        } catch (updateError) {
          console.error(
            "Failed to update user with integration error:",
            updateError
          );
        }
      }
    };

    processMindbodyIntegration();
  }, [user, router.query]);

  const handleClassSelection = (classId) => {
    setSelectedClasses((prev) => ({
      ...prev,
      [classId]: !prev[classId],
    }));
  };

  const handleImportSelected = async () => {
    try {
      setCurrentStep("Importing selected classes to PocketClass...");

      // Find classes that were selected for import
      const classesToImport = mindbodyClasses.filter(
        (classItem, index) => selectedClasses[index]
      );

      if (classesToImport.length === 0) {
        setError("Please select at least one class to import");
        return;
      }

      // Import selected classes to Firestore
      for (const classData of classesToImport) {
        await addDoc(collection(db, "classes"), {
          ...classData,
          createdAt: new Date().toISOString(),
        });
      }

      // Redirect to My Classes page
      router.push("/my-classes");
    } catch (importError) {
      console.error("Error importing classes:", importError);
      setError(importError.message || "Failed to import classes");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Mindbody Integration
        </h2>

        {error ? (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => router.push("/schedule")}
            >
              Return to Schedule
            </button>
          </div>
        ) : !importComplete ? (
          // Loading UI
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              {currentStep || "Initializing connection..."}
            </p>
            <div className="animate-pulse flex justify-center mb-4">
              <div className="h-2 w-24 bg-blue-200 rounded"></div>
            </div>
            <div className="text-sm text-gray-500 italic">
              Please do not close this page
            </div>
          </div>
        ) : (
          // Class list UI
          <div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
              <p className="text-yellow-700">
                <strong>Note:</strong> Imported classes might have missing data,
                please go to My Classes to fill out any missing data of Imported
                classes.
              </p>
            </div>

            <p className="mb-4 text-gray-700">
              We found {mindbodyClasses.length} classes from your Mindbody
              account. Please select the classes you wish to import:
            </p>

            <div className="mb-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                onClick={() =>
                  setSelectedClasses(
                    Object.fromEntries(mindbodyClasses.map((_, i) => [i, true]))
                  )
                }
              >
                Select All
              </button>
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setSelectedClasses({})}
              >
                Deselect All
              </button>
            </div>

            <div className="mb-6 max-h-96 overflow-y-auto border rounded">
              {mindbodyClasses.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Import
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mindbodyClasses.map((classItem, index) => (
                      <tr
                        key={classItem.mindbodyId || index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={!!selectedClasses[index]}
                            onChange={() => handleClassSelection(index)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {classItem.Name || "Unnamed Class"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {classItem.Category || "Uncategorized"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              classItem.Mode === "Online"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {classItem.Mode}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {classItem.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No classes found in your Mindbody account
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => router.push("/schedule")}
              >
                Skip Import
              </button>
              <button
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={handleImportSelected}
                disabled={
                  Object.values(selectedClasses).filter(Boolean).length === 0
                }
              >
                Import Selected Classes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
