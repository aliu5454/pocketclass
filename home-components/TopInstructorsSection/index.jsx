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
import { useEffect, useState, useMemo, useCallback } from "react";
import InstructorSection from "../InstructorSection/index";
import { db } from "../../firebaseConfig";

// 🌎 Moved outside component to prevent recreation
const getDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function TopClassesSection({
  activeFilter = null,
  onClassesLoad,
  displayCount = 4,
}) {
  const [rawClasses, setRawClasses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classesWithInstructors, setClassesWithInstructors] = useState([]);

  // 📍 Get user location (optimized with error handling)
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    const handleSuccess = (position) => {
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    const handleError = (error) => {
      console.warn("Geolocation error:", error.message);
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, []);

  // 🔥 Fetch classes data (only once on mount)
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesSnapshot = await getDocs(collection(db, "classes"));
        const classesData = classesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRawClasses(classesData);
      } catch (error) {
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  // 👂 Reviews subscription (unsubscribed properly)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  // 🧩 Process class data with memoization
  const processedClasses = useMemo(() => {
    if (!rawClasses.length) return [];

    return rawClasses.map((classItem) => {
      // 🎯 Calculate average rating
      const classReviews = reviews.filter(
        (rev) => rev.classID === classItem.id
      );
      const totalRating = classReviews.reduce(
        (sum, rev) =>
          sum +
          (rev.qualityRating + rev.recommendRating + rev.safetyRating) / 3,
        0
      );
      const avgRating = classReviews.length
        ? totalRating / classReviews.length
        : 0;

      // 📏 Calculate distance
      let distance = Infinity;
      if (userLocation && classItem.latitude && classItem.longitude) {
        distance = getDistance(
          userLocation.latitude,
          userLocation.longitude,
          parseFloat(classItem.latitude),
          parseFloat(classItem.longitude)
        );
      }

      return {
        ...classItem,
        name: classItem.Name || "N/A",
        profileImage: classItem.Images?.[0] || "N/A",
        category: classItem.Category || "N/A",
        averageRating: avgRating,
        reviewCount: classReviews.length,
        distance,
      };
    });
  }, [rawClasses, reviews, userLocation]);

  // 👨‍🏫 Fetch instructor data (memoized and batched)
  useEffect(() => {
    if (!processedClasses.length) return;

    const fetchInstructors = async () => {
      const instructorPromises = processedClasses.map(async (classItem) => {
        if (!classItem.classCreator) return classItem;

        try {
          const instructorRef = firestoreDoc(
            db,
            "Users",
            classItem.classCreator
          );
          const instructorDoc = await getDoc(instructorRef);

          if (instructorDoc.exists()) {
            return {
              ...classItem,
              instructorName: instructorDoc.data().firstName || "Instructor",
              instructorImage: instructorDoc.data().profileImage,
            };
          }
          return classItem;
        } catch (error) {
          console.error("Error fetching instructor:", error);
          return classItem;
        }
      });

      const result = await Promise.all(instructorPromises);
      setClassesWithInstructors(result);
    };

    fetchInstructors();
  }, [processedClasses]);

  // 🔄 Sorting and filtering logic
  const { sortedClasses, filteredClasses } = useMemo(() => {
    if (!classesWithInstructors.length)
      return { sortedClasses: [], filteredClasses: [] };

    // 📊 Sorting logic
    const sortClasses = (classes) => {
      const hasReviews = (c) => c.reviewCount > 0;
      const hasValidDistance = (c) => c.distance !== Infinity;

      return [...classes]
        .sort((a, b) => {
          // First: Valid location classes
          if (userLocation) {
            if (hasValidDistance(a) !== hasValidDistance(b)) {
              return hasValidDistance(a) ? -1 : 1;
            }
          }

          // Second: Highly rated classes
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }

          // Third: Well-reviewed classes
          return b.reviewCount - a.reviewCount;
        })
        .sort((a, b) => {
          // Highest priority: Reviewed classes
          if (hasReviews(a) !== hasReviews(b)) {
            return hasReviews(a) ? -1 : 1;
          }
          return 0;
        });
    };

    const sorted = sortClasses(classesWithInstructors);
    const filtered = activeFilter
      ? sorted.filter(
          (c) => c.Type === activeFilter || c.SubCategory === activeFilter
        )
      : sorted;

    return { sortedClasses: sorted, filteredClasses: filtered };
  }, [classesWithInstructors, userLocation, activeFilter]);

  // 📬 Notify parent about classes count
  useEffect(() => {
    onClassesLoad?.(filteredClasses.length);
  }, [filteredClasses.length, onClassesLoad]);

  // 🖥️ Prepare displayed classes
  const displayedClasses = useMemo(
    () => filteredClasses.slice(0, displayCount),
    [filteredClasses, displayCount]
  );

  return (
    <div className="grow-0 shrink-0">
      <div>
        {!activeFilter && (
          <p className="section-heading !text-left">
            Top Rated Classes Near You
          </p>
        )}
        <p className="text-lg font-bold text-[#261f22] mt-4">
          Discover amazing learning experiences near you
        </p>
      </div>
      <div>
        <div id="classes-grid" className="gap-8 max-w-[100%] box-border mt-8">
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
                  reviews={reviews}
                  loading={false}
                />
              ))}
        </div>
      </div>
    </div>
  );
}

export default TopClassesSection;
