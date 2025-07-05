"use client";

import {
  collection,
  query,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  onSnapshot,
  where,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import InstructorSection from "../InstructorSection/index";
import { db } from "../../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebaseConfig";

function RecentlyViewedSection({
  activeFilter = null,
  onClassesLoad,
}) {
  const [classes, setClasses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const filteredClasses = activeFilter
      ? classes.filter((classItem) => ((classItem.Type === activeFilter) || (classItem.SubCategory === activeFilter)))
      : classes;
    onClassesLoad?.(filteredClasses.length);
  }, [classes, activeFilter, onClassesLoad]);

  // Fetch reviews
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(true);
    const fetchRecentlyViewedClasses = async () => {
      try {
        // Get recently viewed class IDs from localStorage
        const recentlyViewedClasses =
          JSON.parse(localStorage.getItem("recentlyViewedClasses")) || [];
        if (user && user.uid) {
            // If user is logged in, fetch their recently viewed classes from Firestore
            const userViewedClassesRef = firestoreDoc(
                db,
                "Users",
                user.uid
            );
            const userViewedClassesDoc = await getDoc(userViewedClassesRef);
            if (userViewedClassesDoc.exists()) {
                const userViewedClassesData = userViewedClassesDoc.data();
                if (userViewedClassesData.recentlyViewedClasses) {
                    // If user has recently viewed classes which does not exist in localStorage, add them to the list
                    const userRecentlyViewed = userViewedClassesData.recentlyViewedClasses;
                    userRecentlyViewed.forEach(item => {
                        if (!recentlyViewedClasses.some(rc => rc.id === item.id)) {
                            recentlyViewedClasses.push(item);
                        }
                    });
                }
            }
        }
        
        if (recentlyViewedClasses.length === 0) {
          setClasses([]);
          return;
        }

        // Sort by date (most recent first)
        const sortedByDate = recentlyViewedClasses.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        // Get the class IDs
        const classIds = sortedByDate.map(item => item.id);

        // Fetch class data for these IDs
        const classesWithInstructors = await Promise.all(
          classIds.map(async (classId) => {
            try {
              const classRef = firestoreDoc(db, "classes", classId);
              const classDoc = await getDoc(classRef);
              
              if (!classDoc.exists()) {
                return null;
              }

              const classData = {
                id: classDoc.id,
                ...classDoc.data(),
              };

              if (classData.classCreator) {
                const instructorRef = firestoreDoc(
                  db,
                  "Users",
                  classData.classCreator
                );
                const instructorDoc = await getDoc(instructorRef);
                if (instructorDoc.exists()) {
                  classData.name = classData.Name || "N/A";
                  classData.profileImage = classData.Images?.[0] || "N/A";
                  classData.category = classData.Category || "N/A";
                  classData.instructorName = instructorDoc.data().name || "N/A";
                }
              }

              // Calculate average rating for this class
              const classReviews = reviews.filter(
                (rev) => rev.classID === classData.id
              );
              const avgRating =
                classReviews.length > 0
                  ? classReviews.reduce(
                      (acc, rev) =>
                        acc +
                        (rev.qualityRating +
                          rev.recommendRating +
                          rev.safetyRating) /
                          3,
                      0
                    ) / classReviews.length
                  : 0;

              classData.averageRating = avgRating;
              classData.reviewCount = classReviews.length;

              return classData;
            } catch (error) {
              console.error(`Error fetching class ${classId}:`, error);
              return null;
            }
          })
        );

        // Filter out null values (classes that couldn't be fetched)
        const validClasses = classesWithInstructors.filter(classItem => classItem !== null);
        setClasses(validClasses);
      } catch (error) {
        console.error("Error fetching recently viewed classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyViewedClasses();
  }, [reviews]);

  const displayedClasses = activeFilter
    ? classes.filter((classItem) => ((classItem.Type === activeFilter) || (classItem.SubCategory === activeFilter)))
    : classes;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Don't render if no recently viewed classes
  if (!loading && classes.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 box-border flex justify-start items-stretch flex-col w-[100.00%] section-spacing py-8">
      <div className="">
        <div>
          {!activeFilter && (
            <p className="section-heading !text-left">Recently Viewed</p>
          )}
          <p className="[font-family:'DM_Sans',sans-serif] text-lg font-bold text-[#261f22] mt-4 m-0 p-0">
            Continue exploring where you left off
          </p>
        </div>
      </div>
      <div className="relative">
        {/* Left scroll arrow */}
        <button 
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow hover:bg-gray-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="#261f22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        {/* Right scroll arrow */}
        <button 
          onClick={scrollRight}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow hover:bg-gray-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="#261f22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div 
          ref={scrollContainerRef}
          id="classes-recent" 
          className="gap-8 max-w-[100%] box-border mt-8 overflow-x-auto scrollbar-hide flex px-12"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading
            ? Array(4)
                .fill(null)
                .map((_, index) => (
                  <InstructorSection key={index} loading={true} />
                ))
            : displayedClasses.map((classItem) => (
                <InstructorSection
                  key={classItem.id}
                  classId={classItem.id}
                  instructor={classItem}
                  loading={false}
                />
              ))}
        </div>
      </div>
    </div>
  );
}

export default RecentlyViewedSection;
