import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { mockData } from "../../class-detail-components/mockData";
import FitnessClassOverviewWidget from "../../class-detail-components/FitnessClassOverviewWidget";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebaseConfig";
import Head from "next/head";
import { toast } from "react-toastify";
import {
  arrayUnion,
  doc,
  FieldValue,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const ClassDetails = ({ classData }) => {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const classId = router.query.id?.replace("id=", "");
  const [referralCode, setReferralCode] = useState(null);
  const [referralData, setReferralData] = useState(null);

  // Handle referral code from URL
  useEffect(() => {
    if (router.isReady) {
      const { ref } = router.query;
      if (ref) {
        setReferralCode(ref);
        
        // Track referral click
        trackReferralClick(ref);
        
        // Validate referral code
        if (user) {
          validateReferralCode(ref);
        }

        // Show referral banner
        toast.success("🎉 You're using a referral link! You'll get a discount when you book this class.", {
          position: "top-center",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }
  }, [router.isReady, router.query, user]);

  // Track referral click
  const trackReferralClick = async (refCode) => {
    try {
      await fetch('/api/referrals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'trackClick',
          referralCode: refCode,
        }),
      });
    } catch (error) {
      console.error('Error tracking referral click:', error);
    }
  };

  // Validate referral code
  const validateReferralCode = async (refCode) => {
    try {
      const response = await fetch('/api/referrals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'validateReferral',
          referralCode: refCode,
          userId: user.uid,
          classId: classId,
        }),
      });

      const result = await response.json();
      
      if (result.valid) {
        setReferralData(result.referralData);
        // Store referral data in localStorage for booking process
        localStorage.setItem('pendingReferral', JSON.stringify({
          code: refCode,
          discountType: result.discountType,
          discountValue: result.discountValue,
          classId: classId,
        }));
      } else {
        console.warn('Invalid referral code:', result.error);
        toast.warn(`Referral code issue: ${result.error}`, {
          position: "top-center",
        });
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#review") {
      const reviewSection = document.getElementById("review");
      if (reviewSection) {
        reviewSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  // If user is logged in, store class in recently viewed classes, else store in local storage
  useEffect(() => {
    if (`${classId}` === "undefined" || !classId) return;
    if (user) {
      const recentlyViewedClasses =
        JSON.parse(localStorage.getItem("recentlyViewedClasses")) || [];
      if (!recentlyViewedClasses.some((c) => c.id === classId)) {
        recentlyViewedClasses.push({
          id: classId,
          name: classData?.Name || "Unknown Class",
          date: new Date().toISOString(),
        });
        localStorage.setItem(
          "recentlyViewedClasses",
          JSON.stringify(recentlyViewedClasses)
        );
      }
      // Also store in Firebase only class ids
      const userRef = doc(db, "users", user.uid);
      setDoc(
        userRef,
        {
          recentlyViewedClasses: arrayUnion({
            id: classId,
            date: new Date().toISOString(),
          }),
        },
        { merge: true } // ensures it doesn't overwrite the document
      );
    } else {
      const recentlyViewedClasses =
        JSON.parse(localStorage.getItem("recentlyViewedClasses")) || [];
      if (!recentlyViewedClasses.some((c) => c.id === classId)) {
        recentlyViewedClasses.push({
          id: classId,
          name: classData?.name || "Unknown Class",
          image: classData?.image || "/default-class-image.jpg",
          date: new Date().toISOString(),
        });
        localStorage.setItem(
          "recentlyViewedClasses",
          JSON.stringify(recentlyViewedClasses)
        );
      }
    }
  }, [classId, classData, user]);

  return (
    <div data-ignore="used only for top most containter width">
      <Head>
        <title>Explore Class</title>
        <meta name="description" content="Explore this class" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>
      
      {/* Referral Banner */}
      {referralCode && referralData && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                🎉 Great news! You're using a referral link and will get{" "}
                <span className="font-semibold">
                  {referralData.discountType === "fixed" 
                    ? `$${referralData.discountValue}` 
                    : `${referralData.discountValue}%`
                  } off
                </span>{" "}
                when you book this class!
              </p>
            </div>
          </div>
        </div>
      )}

      <FitnessClassOverviewWidget
        {...mockData}
        classData={mockData}
        classId={classId}
        userId={user?.uid}
        referralCode={referralCode}
        referralData={referralData}
      />
    </div>
  );
};

export default ClassDetails;
