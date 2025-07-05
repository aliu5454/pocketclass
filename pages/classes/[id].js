import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { mockData } from "../../class-detail-components/mockData";
import FitnessClassOverviewWidget from "../../class-detail-components/FitnessClassOverviewWidget";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../../firebaseConfig";
import Head from "next/head";
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
      <FitnessClassOverviewWidget
        {...mockData}
        classData={mockData}
        classId={classId}
        userId={user?.uid}
      />
    </div>
  );
};

export default ClassDetails;
