import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  orderBy,
  limit,
  setDoc,
} from "firebase/firestore";
import Head from "next/head";
import NewHeader from "../../components/NewHeader";
import Dashboard from "../../components/referrals/Dashboard";
import Settings from "../../components/referrals/Settings";
import Analytics from "../../components/referrals/Analytics";
import {
  GiftIcon,
  LinkIcon,
  ClipboardCopyIcon,
  UsersIcon,
  TrendingUpIcon,
  StarIcon,
  CashIcon,
  TicketIcon,
  CheckCircleIcon,
  EyeIcon,
  ShareIcon,
  ChartBarIcon,
  CogIcon,
  InformationCircleIcon,
  SaveIcon,
} from "@heroicons/react/outline";
import { CheckIcon } from "@heroicons/react/solid";
import { toast } from "react-toastify";
import { Tabs } from "antd";
import Link from "next/link";

const { TabPane } = Tabs;

export default function ReferralsPage() {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [currentView, setCurrentView] = useState("student");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [referralData, setReferralData] = useState(null);
  const [myReferrals, setMyReferrals] = useState([]);
  const [referralSettings, setReferralSettings] = useState({});
  const [bookedClasses, setBookedClasses] = useState([]);
  const [instructorClasses, setInstructorClasses] = useState([]);
  const [instructorStats, setInstructorStats] = useState({
    totalRedemptions: 0,
    totalReferralRevenue: 0,
    topPromoters: [],
    activeReferrers: 0,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedLinks, setCopiedLinks] = useState({});
  const [userCredits, setUserCredits] = useState({}); // Store credits from Firestore

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("userView");
      if (savedView && user) {
        setCurrentView(savedView);
      }
    }
  }, [user]);

  // Listen for localStorage changes to update currentView automatically
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== "undefined") {
        const savedView = localStorage.getItem("userView");
        if (savedView) {
          setCurrentView(savedView);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const getUserData = async () => {
      if (user?.uid) {
        try {
          const docRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    if (user) {
      getUserData();
    }
  }, [user]);

  // Check if user has premium access
  const isPremiumInstructor = () => {
    if (!userData) return false;
    const premiumExpire = userData.premiumExpire;
    return premiumExpire && new Date(premiumExpire.seconds * 1000) >= new Date();
  };


const fetchBookedClasses = async () => {
  if (!user?.uid) return;

  try {
    const bookingsRef = collection(db, "Bookings");
    // Fetch confirmed and completed bookings (including both cases)
    const q = query(
      bookingsRef,
      where("student_id", "==", user.uid),
      where("status", "in", ["Confirmed", "Completed", "confirmed", "completed"])
    );
    const querySnapshot = await getDocs(q);

    console.log("Found bookings:", querySnapshot.size);

    const classesWithDetails = await Promise.all(
      querySnapshot.docs.map(async (bookingDoc) => {
        const booking = bookingDoc.data();
        console.log("Processing booking:", { id: bookingDoc.id, ...booking });

        // Validate required fields
        if (!booking.class_id) {
          console.warn("Booking missing class_id:", bookingDoc.id);
          return null;
        }
        
        if (!booking.instructor_id) {
          console.warn("Booking missing instructor_id:", bookingDoc.id);
          return null;
        }

        // Get class details using correct field name
        const classDoc = await getDoc(doc(db, "classes", booking.class_id));
        const classData = classDoc.exists() ? classDoc.data() : null;

        // Get instructor details using correct field name
        const instructorDoc = await getDoc(doc(db, "Users", booking.instructor_id));
        const instructorData = instructorDoc.exists() ? instructorDoc.data() : null;

        // Check if referral is active for this class
        const referralSettingsDoc = await getDoc(doc(db, "ReferralSettings", booking.instructor_id));
        let isReferralActive = false;
        let referralSettings = null;
        
        if (referralSettingsDoc.exists()) {
          const settings = referralSettingsDoc.data();
          const classSettings = settings.classes?.[booking.class_id];
          isReferralActive = classSettings?.enabled === true;
          referralSettings = classSettings;
        }

        return {
          id: bookingDoc.id,
          ...booking,
          className: classData?.Name || "Unknown Class",
          classPrice: classData?.Price || 0, // Add class price for credits calculation
          instructorName: instructorData
            ? `${instructorData.firstName} ${instructorData.lastName}`
            : "Unknown Instructor",
          instructorImage: instructorData?.profileImage || null,
          instructorId: booking.instructor_id, // Use correct field name
          classId: booking.class_id, // Use correct field name
          isReferralActive, // Add this flag
          referralSettings, // Add referral settings for this class
        };
      })
    ).then(results => results.filter(result => result !== null)); // Filter out null values

    console.log("Classes with details (before filtering):", classesWithDetails.map(c => ({
      id: c.id,
      classId: c.classId,
      instructorId: c.instructorId,
      className: c.className,
      instructorName: c.instructorName
    })));

    // Filter to only show classes with active referrals
    const classesWithActiveReferrals = classesWithDetails.filter(classData => classData.isReferralActive);

    // Remove duplicates - keep only unique class-instructor combinations
    const uniqueClasses = classesWithActiveReferrals.reduce((acc, current) => {
      const key = `${current.classId}-${current.instructorId}`;
      
      console.log("Processing deduplication for:", {
        key,
        classId: current.classId,
        instructorId: current.instructorId,
        className: current.className
      });
      
      // If we haven't seen this class-instructor combination before, add it
      if (!acc.some(item => `${item.classId}-${item.instructorId}` === key)) {
        const processedClass = {
          ...current,
          currentProgress: 0, // Initialize with 0, will be updated later
        };
        
        console.log("Adding to unique classes:", processedClass);
        acc.push(processedClass);
      } else {
        console.log("Skipping duplicate class-instructor combination:", key);
      }
      
      return acc;
    }, []);

    console.log("Final unique classes:", uniqueClasses.map(c => ({
      id: c.id,
      classId: c.classId,
      instructorId: c.instructorId,
      className: c.className
    })));

    console.log("Classes with active referrals (before dedup):", classesWithActiveReferrals.length);
    console.log("Unique classes with active referrals:", uniqueClasses.length);
    setBookedClasses(uniqueClasses);
  } catch (error) {
    console.error("Error fetching booked classes:", error);
  }
};

  // Fetch referral data for students
  const fetchStudentReferralData = async () => {
    if (!user?.uid) return;

    try {
      console.log("=== DEBUG: Fetching student referral data ===");
      console.log("User ID:", user.uid);
      
      const response = await fetch(`/api/referrals/stats?userId=${user.uid}&type=student`);
      console.log("API Response Status:", response.status);
      
      const result = await response.json();
      console.log("Complete API Response:", result);
      
      if (response.ok && result.success) {
        console.log("Setting myReferrals to:", result.stats.referralDetails || []);
        console.log("Total redemptions (friends referred):", result.stats.totalRedemptions);
        console.log("Total earnings:", result.stats.totalEarnings);
        
        setMyReferrals(result.stats.referralDetails || []);
        
        // Log individual referral details for debugging
        result.stats.referralDetails?.forEach((referral, index) => {
          console.log(`Referral ${index + 1}:`, {
            code: referral.referralCode,
            redemptions: referral.redemptions,
            earnings: referral.totalEarnings,
            className: referral.className
          });
        });
      } else {
        console.error("API Error Response:", result);
        toast.error(result.error || "Failed to fetch referral data");
      }
    } catch (error) {
      console.error("Network Error while fetching student referral data:", error);
      toast.error("Network error while fetching referral data");
    }
  };

  // Fetch instructor referral settings and stats
  const fetchInstructorReferralData = async () => {
    if (!user?.uid) return;

    try {
      // Get instructor's referral settings
      const settingsDoc = await getDoc(doc(db, "ReferralSettings", user.uid));
      if (settingsDoc.exists()) {
        setReferralSettings(settingsDoc.data());
      }

      // Get referral statistics using the API
      const response = await fetch(`/api/referrals/stats?userId=${user.uid}&type=instructor`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        setInstructorStats(result.stats);
      }
    } catch (error) {
      console.error("Error fetching instructor referral data:", error);
    }
  };

  // Fetch instructor's classes for settings
  const fetchInstructorClasses = async () => {
    if (!user?.uid) return;

    try {
      console.log("Fetching classes for instructor:", user.uid);
      
      const classesRef = collection(db, "classes");
      const q = query(classesRef, where("classCreator", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      console.log("Found classes:", querySnapshot.size);
      
      const classes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Class data:", { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data,
        };
      });
      
      setInstructorClasses(classes);
    } catch (error) {
      console.error("Error fetching instructor classes:", error);
      toast.error("Failed to fetch your classes");
    }
  };

  // Fetch user credits from Firestore
  const fetchUserCredits = async (currentReferrals = null) => {
    if (!user?.uid) return;

    try {
      console.log("Fetching user credits from Firestore...");
      
      const response = await fetch(`/api/referrals/get-credits?userId=${user.uid}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log("User credits fetched:", result.allCredits);
        setUserCredits(result.allCredits);
        
        // Use passed referrals or current state, and only migrate if we have referrals
        const referralsToCheck = currentReferrals !== null ? currentReferrals : myReferrals;
        if (Object.keys(result.allCredits).length === 0 && referralsToCheck.length > 0) {
          console.log("No credits found, attempting migration...");
          await migrateExistingCredits();
        }
      } else {
        console.error("Error fetching credits:", result.error);
      }
    } catch (error) {
      console.error("Error fetching user credits:", error);
    }
  };

  // Migrate existing referral data to credits system
  const migrateExistingCredits = async () => {
    if (!user?.uid) return;

    try {
      console.log("Migrating existing credits for user:", user.uid);
      
      const response = await fetch('/api/referrals/update-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrateExistingCredits',
          referrerId: user.uid,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log("Credits migrated successfully:", result);
        toast.success(`Migrated $${result.migratedCredits.toFixed(2)} in credits from your existing referrals!`);
        
        // Refresh credits after migration
        await fetchUserCredits();
      } else {
        console.error("Error migrating credits:", result.error);
      }
    } catch (error) {
      console.error("Error migrating credits:", error);
    }
  };

  useEffect(() => {
    if (user && userData) {
      if (userData.isInstructor && currentView === "instructor") {
        fetchInstructorReferralData();
        fetchInstructorClasses();
      } else {
        const fetchStudentData = async () => {
          await fetchBookedClasses();
          await fetchStudentReferralData();
          await fetchUserCredits(); // Fetch credits from Firestore
          // Progress will be updated by useEffect when myReferrals changes
        };
        fetchStudentData();
      }
    }
  }, [user, userData, currentView]);

  // Function to update class progress after referral data is fetched
  const updateClassProgress = (referralsData = myReferrals) => {
    console.log('Updating class progress for bookedClasses:', bookedClasses);
    console.log('Using referralsData:', referralsData);
    
    setBookedClasses(prevClasses => 
      prevClasses.map(classData => {
        console.log('Processing class data:', {
          classId: classData.classId,
          instructorId: classData.instructorId,
          className: classData.className
        });
        
        const classReferral = referralsData.find(
          ref => ref.classId === classData.classId && ref.instructorId === classData.instructorId
        );
        
        console.log('Found matching referral:', classReferral);
        
        const currentProgress = classReferral ? classReferral.redemptions || 0 : 0;
        const freeClassesClaimed = classReferral ? classReferral.freeClassesClaimed || 0 : 0;
        const powerPromotersThreshold = classData.referralSettings?.powerPromotersThreshold || 5;
        const isPowerPromotersEnabled = classData.referralSettings?.powerPromotersEnabled !== false;
        
        // Calculate the effective threshold based on free classes claimed (only if power promoters is enabled)
        const effectiveThreshold = isPowerPromotersEnabled ? powerPromotersThreshold * (freeClassesClaimed + 1) : Infinity;
        
        const result = {
          ...classData,
          currentProgress,
          freeClassesClaimed,
          effectiveThreshold,
          isPowerPromotersEnabled,
          isEligibleForFreeClass: isPowerPromotersEnabled && 
            currentProgress >= effectiveThreshold && 
            freeClassesClaimed < Math.floor(currentProgress / powerPromotersThreshold),
        };
        
        console.log('Updated class data:', result);
        return result;
      })
    );
  };

  // Combined effect to handle progress updates and credit fetching
  useEffect(() => {
    console.log('=== Combined Effect Triggered ===');
    console.log('myReferrals length:', myReferrals.length);
    console.log('bookedClasses length:', bookedClasses.length);
    console.log('First few referrals:', myReferrals.slice(0, 2));
    
    // Only update if we have booked classes
    if (bookedClasses.length > 0) {
      console.log('Has booked classes, updating progress...');
      updateClassProgress(myReferrals);
    }
  }, [myReferrals, bookedClasses]);

  // Separate effect for credits to avoid infinite loops
  useEffect(() => {
    if (myReferrals.length > 0 && user?.uid) {
      console.log('Fetching credits separately...');
      fetchUserCredits(myReferrals);
    }
  }, [myReferrals.length]); // Only depend on length to avoid re-fetching on every referral update

  // Copy referral link to clipboard
  const copyReferralLink = async (instructorId, classId, className, instructorName) => {
    try {
      const response = await fetch('/api/referrals/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referrerId: user.uid,
          instructorId,
          classId,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Generate the referral link from the referral code
        const referralLink = result.referralLink || 
          `${window.location.origin}/classes/${classId}?ref=${result.referral.referralCode}`;
        
        await navigator.clipboard.writeText(referralLink);
        
        // Set copied state for this specific class
        const linkKey = `${classId}-${instructorId}`;
        setCopiedLinks(prev => ({ ...prev, [linkKey]: true }));
        
        // Clear the copied state after 2 seconds
        setTimeout(() => {
          setCopiedLinks(prev => ({ ...prev, [linkKey]: false }));
        }, 2000);
        
        toast.success(`Referral link copied for ${className} with ${instructorName}!`);
        
        // Refresh referral data and credits
        fetchStudentReferralData();
        fetchUserCredits();
      } else {
        toast.error(result.error || 'Failed to generate referral link');
      }
    } catch (error) {
      console.error('Error generating referral link:', error);
      toast.error('Failed to generate referral link');
    }
  };

  // Update referral settings for instructors
  const updateReferralSettings = async (classId, settings) => {
    if (!user?.uid) return;

    setSavingSettings(true);
    try {
      const settingsRef = doc(db, "ReferralSettings", user.uid);
      const currentSettings = referralSettings || {};
      
      // If this is the first time setting up referrals, create the document
      if (!currentSettings.classes) {
        await setDoc(settingsRef, {
          instructorId: user.uid,
          classes: {
            [classId]: settings,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await updateDoc(settingsRef, {
          [`classes.${classId}`]: settings,
          updatedAt: new Date(),
        });
      }
      
      setReferralSettings({
        ...currentSettings,
        classes: {
          ...currentSettings.classes,
          [classId]: settings,
        },
      });
      
      toast.success("Referral settings updated successfully!");
    } catch (error) {
      console.error("Error updating referral settings:", error);
      toast.error("Failed to update referral settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle referral for a specific class
  const toggleReferralForClass = async (classId, enabled) => {
    const currentClassSettings = referralSettings?.classes?.[classId] || {};
    
    const newSettings = {
      ...currentClassSettings,
      enabled,
      referralType: currentClassSettings.referralType || "percentage",
      studentDiscountType: currentClassSettings.studentDiscountType || "percentage",
      studentDiscountValue: currentClassSettings.studentDiscountValue || 10,
      referrerRewardType: currentClassSettings.referrerRewardType || "percentage",
      referrerRewardValue: currentClassSettings.referrerRewardValue || 15,
      maxRedemptions: currentClassSettings.maxRedemptions || 100,
      maxRedemptionsEnabled: currentClassSettings.maxRedemptionsEnabled !== false,
      powerPromotersThreshold: currentClassSettings.powerPromotersThreshold || 5,
      powerPromotersEnabled: currentClassSettings.powerPromotersEnabled !== false,
    };
    
    await updateReferralSettings(classId, newSettings);
  };

  // Update specific setting for a class
  const updateClassSetting = async (classId, settingKey, value) => {
    const currentClassSettings = referralSettings?.classes?.[classId] || {};
    
    const newSettings = {
      ...currentClassSettings,
      [settingKey]: value,
    };
    
    await updateReferralSettings(classId, newSettings);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-logo-red"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to access the referral program.</p>
          <Link href="/Login">
            <a className="bg-logo-red text-white px-6 py-3 rounded-lg hover:bg-logo-red/90 transition-colors">
              Login
            </a>
          </Link>
        </div>
      </div>
    );
  }

  // Check if instructor has premium access for referral feature
  if (userData?.isInstructor && currentView === "instructor" && !isPremiumInstructor()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NewHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <StarIcon className="w-8 h-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Premium Feature</h1>
            <p className="text-gray-600 mb-6">
              The referral program is available exclusively for premium instructors. 
              Upgrade your account to start earning more through referrals!
            </p>
            <Link href="/premium">
              <a className="bg-logo-red text-white px-6 py-3 rounded-lg hover:bg-logo-red/90 transition-colors">
                Upgrade to Premium
              </a>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>
          {userData?.isInstructor && currentView === "instructor" 
            ? "Referral Program - Instructor Dashboard" 
            : "Refer & Earn - Student Dashboard"
          }
        </title>
        <meta name="description" content="Refer friends and earn rewards on PocketClass" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {userData?.isInstructor && currentView === "instructor" 
              ? "Referral Program" 
              : "Refer & Earn"
            }
          </h1>
          <p className="text-gray-600">
            {userData?.isInstructor && currentView === "instructor"
              ? "Track your student promoters and referral performance"
              : "Share your favorite classes with friends and earn rewards"
            }
          </p>
        </div>

        {/* Instructor View */}
        {userData?.isInstructor && currentView === "instructor" && (
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            className="bg-white rounded-xl shadow-sm border border-gray-100"
            size="large"
          >
            <TabPane 
              tab={
                <span className="flex items-center space-x-2">
                  <ChartBarIcon className="w-4 h-4" />
                  <span>Dashboard</span>
                </span>
              } 
              key="dashboard"
            >
              <Dashboard instructorStats={instructorStats} />
            </TabPane>

            <TabPane 
              tab={
                <span className="flex items-center space-x-2">
                  <CogIcon className="w-4 h-4" />
                  <span>Settings</span>
                </span>
              } 
              key="settings"
            >
              <Settings 
                instructorClasses={instructorClasses}
                referralSettings={referralSettings}
                savingSettings={savingSettings}
                toggleReferralForClass={toggleReferralForClass}
                updateClassSetting={updateClassSetting}
              />
            </TabPane>

            <TabPane 
              tab={
                <span className="flex items-center space-x-2">
                  <TrendingUpIcon className="w-4 h-4" />
                  <span>Analytics</span>
                </span>
              } 
              key="analytics"
            >
              <Analytics 
                instructorStats={instructorStats}
                userId={user?.uid}
              />
            </TabPane>
          </Tabs>
        )}

        {/* Student View */}
        {(!userData?.isInstructor || currentView === "student") && (
          <div className="space-y-8">
            {/* How it works */}
            <div className="bg-gradient-to-r from-logo-red to-red-600 rounded-xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-4">How Refer & Earn Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShareIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Share Your Link</h3>
                  <p className="text-sm opacity-90">Generate a unique referral link for classes you've attended</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <UsersIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Friend Books Class</h3>
                  <p className="text-sm opacity-90">Your friend gets a discount on their first class</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <GiftIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-2">3. You Both Earn</h3>
                  <p className="text-sm opacity-90">You get rewards and your friend gets a great discount</p>
                </div>
              </div>
            </div>

            {/* My Referrals Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {myReferrals.reduce((sum, ref) => sum + (ref.redemptions || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Classes booked using your referral links
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TicketIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Friends Referred</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {myReferrals.reduce((sum, ref) => sum + (ref.uniqueUsers || 0), 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Unique people who used your links
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Number(myReferrals.reduce((sum, ref) => sum + (ref.totalEarnings || 0), 0)).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rewards from successful referrals
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <CashIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Section - Remove after testing */}
            {/* <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Debug: Refresh Analytics</h3>
                  <p className="text-xs text-blue-700">Click to manually refresh your referral data</p>
                </div>
                <button
                  onClick={fetchStudentReferralData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Refresh Data
                </button>
              </div>
              <div className="text-xs text-blue-800 space-y-1">
                <div>User ID: {user?.uid}</div>
                <div>Total Referral Links Created: {myReferrals.length}</div>
                <div>
                  Total People Who Booked: {myReferrals.reduce((sum, ref) => sum + (ref.redemptions || 0), 0)}
                </div>
                <div>
                  Total Earnings: ${myReferrals.reduce((sum, ref) => sum + (ref.totalEarnings || 0), 0).toFixed(2)}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">View Raw Data</summary>
                  <pre className="mt-2 text-xs bg-blue-100 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(myReferrals, null, 2)}
                  </pre>
                </details>
              </div>
            </div> */}

            {/* Classes You Can Refer */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Classes You Can Refer</h3>
              {bookedClasses.length > 0 ? (
                <div className="space-y-4">
                  {bookedClasses.map((classData) => {
                    console.log('Rendering class data:', classData);
                    
                    const linkKey = `${classData.classId}-${classData.instructorId}`;
                    const isCopied = copiedLinks[linkKey];
                    const settings = classData.referralSettings || {};
                    const currentProgress = classData.currentProgress || 0;
                    const freeClassesClaimed = classData.freeClassesClaimed || 0;
                    const powerPromotersThreshold = settings.powerPromotersThreshold || 5;
                    const isPowerPromotersEnabled = classData.isPowerPromotersEnabled;
                    const effectiveThreshold = classData.effectiveThreshold || powerPromotersThreshold;
                    const isEligibleForFreeClass = classData.isEligibleForFreeClass || false;
                    const progressPercentage = isPowerPromotersEnabled ? 
                      parseFloat(Math.min((currentProgress / effectiveThreshold) * 100, 100).toFixed(1)) : 0;
                    
                    console.log('Button visibility conditions:', {
                      isEligibleForFreeClass,
                      classId: classData.classId,
                      instructorId: classData.instructorId,
                      userId: user?.uid
                    });
                    
                    return (
                      <div key={classData.id} className="border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="flex-shrink-0">
                              {classData.instructorImage ? (
                                <img
                                  src={classData.instructorImage}
                                  alt={classData.instructorName}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center border-2 border-gray-200">
                                  <span className="text-gray-600 font-medium text-sm">
                                    {classData.instructorName.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{classData.className}</h4>
                              <p className="text-sm text-gray-600">{classData.instructorName}</p>
                              <p className="text-xs text-gray-500">
                                Booked on {new Date(classData.createdAt?.seconds * 1000 || classData.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            {isCopied && (
                              <div className="mb-1 text-xs text-green-600 font-medium">
                                Copied!
                              </div>
                            )}
                            <button
                              onClick={() => copyReferralLink(
                                classData.instructorId,
                                classData.classId,
                                classData.className,
                                classData.instructorName
                              )}
                              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                                isCopied 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-logo-red text-white hover:bg-logo-red/90'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <CheckIcon className="w-4 h-4" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <ClipboardCopyIcon className="w-4 h-4" />
                                  <span>Get Referral Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Benefits Section */}
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            {/* What your friend gets */}
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <GiftIcon className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Your Friend Gets</span>
                              </div>
                              <p className="text-sm text-blue-800">
                                {settings.studentDiscountValue || 10}
                                {settings.studentDiscountType === "percentage" ? "%" : "$"} off their first booking
                              </p>
                            </div>
                            
                            {/* What you get */}
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <CashIcon className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-900">You Get</span>
                              </div>
                              <p className="text-sm text-green-800">
                                {settings.referrerRewardValue || 15}
                                {settings.referrerRewardType === "percentage" ? "%" : "$"} reward per referral
                              </p>
                            </div>

                            {/* Your Credits */}
                            <div className="bg-purple-50 rounded-lg p-3">
                              <div className="flex items-center space-x-2 mb-2">
                                <TicketIcon className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-900">Your Credits</span>
                              </div>
                              <p className="text-sm text-purple-800 mb-2">
                                {(() => {
                                  // Get credits from Firestore for this specific class
                                  const creditKey = `${classData.classId}_${classData.instructorId}`;
                                  const classCredits = userCredits[creditKey];
                                  
                                  if (classCredits && classCredits.availableCredits > 0) {
                                    return `$${classCredits.availableCredits.toFixed(2)} available for this class`;
                                  } else {
                                    return "No credits yet - refer friends to earn!";
                                  }
                                })()}
                              </p>
                              {(() => {
                                // Show Use Credits button if user has credits > 0
                                const creditKey = `${classData.classId}_${classData.instructorId}`;
                                const classCredits = userCredits[creditKey];
                                
                                if (classCredits && classCredits.availableCredits > 0) {
                                  return (
                                    <button
                                      onClick={() => {
                                        // Redirect to class booking page with credits flag
                                        window.location.href = `/classes/${classData.classId}?useCredits=1&creditAmount=${classCredits.availableCredits.toFixed(2)}`;
                                      }}
                                      className="w-full bg-purple-600 text-white text-xs font-medium py-2 px-3 rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                      Use Credits
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          
                          {/* Power Promoters Progress */}
                          {isPowerPromotersEnabled && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  Power Promoter Progress
                                </span>
                                <span className="text-sm text-gray-600">
                                  {currentProgress}/{effectiveThreshold}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${progressPercentage}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {isEligibleForFreeClass
                                  ? "🎉 Congratulations! You've earned a free class credit!" 
                                  : `${effectiveThreshold - currentProgress} more referrals to earn a free class credit`
                                }
                                {freeClassesClaimed > 0 && (
                                  <span className="block mt-1 text-yellow-600 font-medium">
                                    🏆 Free classes claimed: {freeClassesClaimed}
                                  </span>
                                )}
                              </p>
                              
                              {/* Free Class Button */}
                              {isEligibleForFreeClass && (
                                <div className="mt-3">
                                  <button
                                    onClick={async () => {
                                      try {
                                        
                                        // Verify eligibility from backend
                                        const res = await fetch('/api/referrals/verify-free-class', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            userId: user.uid,
                                            classId: classData.classId,
                                            instructorId: classData.instructorId,
                                          }),
                                        });
                                        
                                        const result = await res.json();
                                        console.log('Free class verification result:', result);
                                        
                                        if (res.ok && result.eligible) {
                                          // Redirect to booking page with free class flag
                                          window.location.href = `/classes/${classData.classId}?freeClass=1&powerPromoter=${user.uid}`;
                                        } else {
                                          toast.error(result.error || 'Not eligible for free class.');
                                        }
                                      } catch (err) {
                                        console.error('Error verifying free class eligibility:', err);
                                        toast.error('Error verifying free class eligibility.');
                                      }
                                    }}
                                    className="w-full bg-gradient-to-r from-green-400 to-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 transform hover:scale-105"
                                  >
                                    🎁 Book Your Free Class
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TicketIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Referral-Enabled Classes</h4>
                  <p className="text-gray-600 mb-4">
                    You can only refer classes where the instructor has enabled the referral program. 
                    Book more classes or check back later as instructors enable referrals!
                  </p>
                  <Link href="/">
                    <a className="bg-logo-red text-white px-6 py-3 rounded-lg hover:bg-logo-red/90 transition-colors">
                      Browse Classes
                    </a>
                  </Link>
                </div>
              )}
            </div>

            {/* My Active Referrals */}
            {myReferrals.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Active Referrals</h3>
                <div className="space-y-4">
                  {myReferrals.map((referral) => (
                    <div key={referral.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">Referral Code: {referral.referralCode}</h4>
                        <p className="text-sm text-gray-600">
                          Created: {new Date(referral.createdAt?.seconds * 1000 || referral.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">
                            {referral.redemptions || 0} redemptions
                          </span>
                          <span className="text-sm text-green-600">
                            ${(referral.totalEarnings || 0).toFixed(2)} earned
                          </span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        referral.status === "active" 
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {referral.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
