"use client";

import {
  collection,
  doc as firestoreDoc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import InstructorSection from "../InstructorSection";
import { db, auth } from "../../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { Reveal } from "../Reveal";

function RecentlyViewedSection({ activeFilter = null, onClassesLoad }) {
  const [classes, setClasses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const scrollRef = useRef(null);

  // Listen to reviews
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });

    return unsubscribe;
  }, []);

  // Fetch recently viewed classes
  useEffect(() => {
    const fetchRecentlyViewed = async () => {
      setLoading(true);
      try {
        let recentlyViewed = JSON.parse(localStorage.getItem("recentlyViewedClasses")) || [];

        if (user?.uid) {
          const userDoc = await getDoc(firestoreDoc(db, "Users", user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          const userViewed = userData.recentlyViewedClasses || [];

          userViewed.forEach((item) => {
            if (!recentlyViewed.some((rc) => rc.id === item.id)) {
              recentlyViewed.push(item);
            }
          });
        }

        if (recentlyViewed.length === 0) {
          setClasses([]);
          return;
        }

        const sorted = recentlyViewed
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((item) => item.id);

        const classData = await Promise.all(
          sorted.map(async (id) => {
            try {
              const classDoc = await getDoc(firestoreDoc(db, "classes", id));
              if (!classDoc.exists()) return null;

              const data = { id, ...classDoc.data() };
              const instructorDoc = await getDoc(firestoreDoc(db, "Users", data.classCreator));

              if (instructorDoc.exists()) {
                const instructor = instructorDoc.data();
                return {
                  ...data,
                  name: data.Name || "N/A",
                  profileImage: data.Images?.[0] || "N/A",
                  instructorImage: instructor.profileImage,
                  instructorName: instructor.firstName,
                  category: data.Category || "N/A",
                };
              }

              return data;
            } catch {
              return null;
            }
          })
        );

        const valid = classData.filter(Boolean).map((cls) => {
          const classReviews = reviews.filter((rev) => rev.classID === cls.id);
          const avgRating =
            classReviews.reduce((acc, rev) => acc + (rev.qualityRating + rev.recommendRating + rev.safetyRating) / 3, 0) /
            (classReviews.length || 1);

          return {
            ...cls,
            averageRating: classReviews.length ? avgRating : 0,
            reviewCount: classReviews.length,
          };
        });

        setClasses(valid);
      } catch (err) {
        console.error("Failed to load recently viewed classes", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyViewed();
  }, [user, reviews]);

  // Filtered result
  const displayedClasses = useMemo(() => {
    return activeFilter
      ? classes.filter(
          (cls) => cls.Type === activeFilter || cls.SubCategory === activeFilter
        )
      : classes;
  }, [classes, activeFilter]);

  // Callback to update count
  useEffect(() => {
    onClassesLoad?.(displayedClasses.length);
  }, [displayedClasses, onClassesLoad]);

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }, []);

  if (!loading && classes.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col w-full section-spacing py-8">
      {!activeFilter && (
        <Reveal>
          <p className="section-heading !text-left">Recently Viewed</p>
        </Reveal>
      )}
      <div className="relative">
        {/* Left Scroll */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M15 18L9 12L15 6" stroke="#261f22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Right Scroll */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M9 18L15 12L9 6" stroke="#261f22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Class Cards */}
        <div ref={scrollRef} className="gap-8 max-w-full mt-8 overflow-x-auto overflow-y-hidden flex px-12">
          {loading
            ? Array(4)
                .fill(null)
                .map((_, idx) => (
                  <Reveal key={idx} delay={idx * 120}>
                    <div className="dm1:w-[300px] w-[250px] h-[430px] shrink-0 border border-gray-200 rounded-2xl flex">
                      <InstructorSection loading />
                    </div>
                  </Reveal>
                ))
            : displayedClasses.map((cls, i) => (
                <Reveal key={cls.id} delay={i * 120}>
                  <div className="dm1:w-[300px] w-[250px] h-[430px] shrink-0 border border-gray-200 rounded-2xl flex">
                    <InstructorSection instructor={cls} classId={cls.id} />
                  </div>
                </Reveal>
              ))}
        </div>
      </div>
    </div>
  );
}

export default RecentlyViewedSection;
