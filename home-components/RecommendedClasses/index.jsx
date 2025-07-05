"use client";

import {
  collection,
  query,
  getDocs,
  doc as firestoreDoc,
  getDoc,
  onSnapshot,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import InstructorSection from "../InstructorSection/index";
import { db } from "../../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../firebaseConfig";

function RecommendedClassesSection({
  activeFilter = null,
  onClassesLoad,
}) {
  const [classes, setClasses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const scrollContainerRef = useRef(null);

  const [displayrec, setDisplayRec] = useState(true);

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
    const fetchRecommendedClasses = async () => {
      try {
        // Get user's recently viewed classes for recommendation analysis
        const recentlyViewedClasses =
          JSON.parse(localStorage.getItem("recentlyViewedClasses")) || [];
        
        let userRecentlyViewed = [];
        let userBookedClasses = [];
        
        if (user && user.uid) {
          // Get user's recently viewed classes from Firestore
          const userViewedClassesRef = firestoreDoc(db, "Users", user.uid);
          const userViewedClassesDoc = await getDoc(userViewedClassesRef);
          if (userViewedClassesDoc.exists()) {
            const userViewedClassesData = userViewedClassesDoc.data();
            if (userViewedClassesData.recentlyViewedClasses) {
              userRecentlyViewed = userViewedClassesData.recentlyViewedClasses;
            }
          }

          // Get user's booked classes for collaborative filtering
          const bookingsQuery = query(
            collection(db, "Bookings"),
            where("studentId", "==", user.uid)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          userBookedClasses = bookingsSnapshot.docs.map(doc => ({
            classId: doc.data().classId,
            timestamp: doc.data().timestamp,
            ...doc.data()
          }));
        }

        // Combine and get unique categories/subcategories from viewed classes
        const allViewedClasses = [...recentlyViewedClasses, ...userRecentlyViewed];
        if (allViewedClasses.length === 0 && userBookedClasses.length === 0) {
          setDisplayRec(false);
          return;
        }
        
        const viewedClassIds = allViewedClasses.map(item => typeof item === 'string' ? item : item.id);
        const bookedClassIds = userBookedClasses.map(booking => booking.classId);
        
        // Get categories and subcategories from viewed and booked classes
        const viewedCategories = new Set();
        const viewedSubCategories = new Set();
        const bookedCategories = new Set();
        const bookedSubCategories = new Set();
        
        // Analyze viewed classes
        if (viewedClassIds.length > 0) {
          const viewedClassesData = await Promise.all(
            viewedClassIds.slice(0, 10).map(async (classId) => {
              try {
                const classRef = firestoreDoc(db, "classes", classId);
                const classDoc = await getDoc(classRef);
                if (classDoc.exists()) {
                  const data = classDoc.data();
                  if (data.Category) viewedCategories.add(data.Category);
                  if (data.SubCategory) viewedSubCategories.add(data.SubCategory);
                  if (data.Type) viewedCategories.add(data.Type);
                  return data;
                }
              } catch (error) {
                console.error(`Error fetching viewed class ${classId}:`, error);
              }
              return null;
            })
          );
        }

        // Analyze booked classes
        if (bookedClassIds.length > 0) {
          const bookedClassesData = await Promise.all(
            bookedClassIds.slice(0, 10).map(async (classId) => {
              try {
                const classRef = firestoreDoc(db, "classes", classId);
                const classDoc = await getDoc(classRef);
                if (classDoc.exists()) {
                  const data = classDoc.data();
                  if (data.Category) bookedCategories.add(data.Category);
                  if (data.SubCategory) bookedSubCategories.add(data.SubCategory);
                  if (data.Type) bookedCategories.add(data.Type);
                  return data;
                }
              } catch (error) {
                console.error(`Error fetching booked class ${classId}:`, error);
              }
              return null;
            })
          );
        }

        // Get user's location for proximity scoring
        let userLocation = null;
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
          } catch (error) {
            console.log("Could not get user location:", error);
          }
        }

        // Fetch all classes for recommendation
        const classesQuery = query(collection(db, "classes"));
        const classesSnapshot = await getDocs(classesQuery);

        // Get all bookings for collaborative filtering
        const allBookingsQuery = query(collection(db, "Bookings"));
        const allBookingsSnapshot = await getDocs(allBookingsQuery);
        const allBookings = allBookingsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        const classesWithInstructors = await Promise.all(
          classesSnapshot.docs.map(async (doc) => {
            const classData = {
              id: doc.id,
              ...doc.data(),
            };

            // Skip if this class is already viewed or booked
            if (viewedClassIds.includes(classData.id) || bookedClassIds.includes(classData.id)) {
              return null;
            }

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
                classData.instructorData = instructorDoc.data();
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

            // Get class bookings for collaborative filtering
            const classBookings = allBookings.filter(booking => booking.classId === classData.id);
            const classBookingUsers = classBookings.map(booking => booking.studentId);

            // Calculate recommendation score using hybrid approach
            let bookingSimilarity = 0;
            let viewingBehavior = 0;
            let contentMatch = 0;
            let classQuality = 0;
            let locationProximity = 0;

            // 1. Collaborative Filtering (Booking Similarity) - Weight: 0.3
            if (userBookedClasses.length > 0) {
              // Find users who booked similar classes
              const similarUsers = new Set();
              userBookedClasses.forEach(userBooking => {
                const usersWhoBookedSame = allBookings
                  .filter(booking => booking.classId === userBooking.classId)
                  .map(booking => booking.studentId);
                usersWhoBookedSame.forEach(userId => similarUsers.add(userId));
              });

              // Check if similar users booked this class
              const similarUserBookings = classBookingUsers.filter(userId => similarUsers.has(userId));
              bookingSimilarity = Math.min(similarUserBookings.length / Math.max(classBookingUsers.length, 1), 1) * 10;
            }

            // 2. Behavioral Signals (View-Based) - Weight: 0.2
            const viewFrequency = allViewedClasses.filter(viewed => 
              (typeof viewed === 'string' ? viewed : viewed.id) === classData.id
            ).length;
            viewingBehavior = Math.min(viewFrequency * 2, 10);

            // 3. Content-Based Filtering - Weight: 0.2
            let categoryMatch = 0;
            let subcategoryMatch = 0;

            // Subcategory similarity is more important than category
            if (bookedSubCategories.has(classData.SubCategory) || viewedSubCategories.has(classData.SubCategory)) {
              subcategoryMatch = 10; // High weight for subcategory match
            }
            if (bookedCategories.has(classData.Category) || bookedCategories.has(classData.Type) || 
                viewedCategories.has(classData.Category) || viewedCategories.has(classData.Type)) {
              categoryMatch = 6; // Lower weight for category match
            }
            
            contentMatch = subcategoryMatch + categoryMatch;

            // 4. Class Quality & Popularity - Weight: 0.15
            let qualityScore = 0;
            
            // Instructor rating
            const instructorRating = classData.instructorData?.rating || 0;
            qualityScore += instructorRating * 1.5;
            
            // Class rating
            qualityScore += avgRating * 1.5;
            
            // Review count (social proof)
            qualityScore += Math.min(classReviews.length * 0.3, 3);
            
            // Booking count (popularity)
            qualityScore += Math.min(classBookings.length * 0.2, 2);
            
            // TopRated bonus
            if (classData.TopRated) {
              qualityScore += 3;
            }
            
            classQuality = Math.min(qualityScore, 10);

            // 5. Location Score - Weight: 0.15
            if (classData.Mode === "Online") {
              locationProximity = 8; // Online classes get high proximity score
            } else if (userLocation && classData.latitude && classData.longitude) {
              // Calculate distance using Haversine formula
              const R = 6371; // Earth's radius in km
              const dLat = (classData.latitude - userLocation.lat) * Math.PI / 180;
              const dLon = (classData.longitude - userLocation.lng) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(classData.latitude * Math.PI / 180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;

              // Scoring: closer = higher score
              if (distance <= 5) locationProximity = 10;
              else if (distance <= 10) locationProximity = 8;
              else if (distance <= 20) locationProximity = 6;
              else if (distance <= 50) locationProximity = 4;
              else locationProximity = 2;
            } else {
              locationProximity = 0; // No location data
            }

            // Final recommendation score with weights
            const recommendationScore = 
              0.3 * bookingSimilarity + 
              0.2 * viewingBehavior + 
              0.2 * contentMatch + 
              0.15 * classQuality + 
              0.15 * locationProximity;

            classData.recommendationScore = recommendationScore;
            classData.scoreBreakdown = {
              bookingSimilarity,
              viewingBehavior,
              contentMatch,
              classQuality,
              locationProximity
            };

            return classData;
          })
        );

        // Filter out null values and sort by recommendation score
        const validClasses = classesWithInstructors
          .filter(classItem => classItem !== null)
          .sort((a, b) => {
            // Primary sort: recommendation score
            if (b.recommendationScore !== a.recommendationScore) {
              return b.recommendationScore - a.recommendationScore;
            }
            // Secondary sort: average rating
            return b.averageRating - a.averageRating;
          });

        // Show top recommendations
        setClasses(validClasses.slice(0, 20));

      } catch (error) {
        console.error("Error fetching recommended classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedClasses();
  }, [reviews, user]);

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

  if (!displayrec) {
    return null;
  }

  // Always show recommendations section
  return (
    <div className="box-border flex justify-start items-stretch flex-col w-[100.00%] section-spacing py-8">
      <div className="">
        <div>
          {!activeFilter && (
            <p className="section-heading !text-left">Recommended</p>
          )}
          <p className="[font-family:'DM_Sans',sans-serif] text-lg font-bold text-[#261f22] mt-4 m-0 p-0">
            {displayedClasses.length > 0 && !loading 
              ? "Discover classes tailored to your interests"
              : "Explore amazing learning experiences"
            }
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
          id="classes-recommended" 
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

export default RecommendedClassesSection;
