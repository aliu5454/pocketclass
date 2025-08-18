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
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import InstructorSection from "../InstructorSection";
import { db, auth } from "../../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { Reveal } from "../Reveal";

function RecommendedClassesSection({
  activeFilter = null,
  onClassesLoad,
  classId = null,
  currentClassData = null,
}) {
  const [classes, setClasses] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useAuthState(auth);
  const scrollRef = useRef(null);
  const [displayRec, setDisplayRec] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        let localViewed = JSON.parse(localStorage.getItem("recentlyViewedClasses")) || [];
        let firestoreViewed = [];
        let booked = [];

        if (user?.uid) {
          const userDoc = await getDoc(firestoreDoc(db, "Users", user.uid));
          firestoreViewed = userDoc?.data()?.recentlyViewedClasses || [];

          const bookingsQuery = query(
            collection(db, "Bookings"),
            where("studentId", "==", user.uid)
          );
          const bookingsSnap = await getDocs(bookingsQuery);
          booked = bookingsSnap.docs.map((doc) => doc.data());
        }

        const allViewed = [...localViewed, ...firestoreViewed];
        if (!allViewed.length && !booked.length) {
          setDisplayRec(false);
          return;
        }

        const viewedIds = new Set(allViewed.map((v) => typeof v === "string" ? v : v.id));
        const bookedIds = new Set(booked.map((b) => b.classId));

        const extractMeta = async (ids, categorySet, subCatSet, typeSet) => {
          await Promise.all([...ids].slice(0, 10).map(async (id) => {
            const docSnap = await getDoc(firestoreDoc(db, "classes", id));
            if (!docSnap.exists()) return;
            const data = docSnap.data();
            if (data.Category) categorySet.add(data.Category);
            if (data.SubCategory) subCatSet.add(data.SubCategory);
            if (data.Type) typeSet.add(data.Type);
          }));
        };

        const bookedCategories = new Set(), bookedSubCategories = new Set(), bookedTypes = new Set();
        const viewedCategories = new Set(), viewedSubCategories = new Set(), viewedTypes = new Set();

        await Promise.all([
          extractMeta(viewedIds, viewedCategories, viewedSubCategories, viewedTypes),
          extractMeta(bookedIds, bookedCategories, bookedSubCategories, bookedTypes)
        ]);

        // Location
        let userLocation = null;
        if (navigator.geolocation) {
          try {
            const pos = await new Promise((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
            );
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          } catch {}
        }

        // Fetch all classes + bookings
        const [allClassSnap, allBookingsSnap] = await Promise.all([
          getDocs(query(collection(db, "classes"))),
          getDocs(collection(db, "Bookings")),
        ]);

        const allBookings = allBookingsSnap.docs.map((doc) => doc.data());

        const recommendations = await Promise.all(
          allClassSnap.docs.map(async (doc) => {
            const data = { id: doc.id, ...doc.data() };
            if (viewedIds.has(data.id) || bookedIds.has(data.id)) return null;

            const instructorDoc = await getDoc(firestoreDoc(db, "Users", data.classCreator));
            const instructor = instructorDoc.exists() ? instructorDoc.data() : {};

            data.name = data.Name || "N/A";
            data.instructorImage = instructor.profileImage;
            data.profileImage = data.Images?.[0] || null;
            data.category = data.Category || "N/A";
            data.instructorName = instructor.firstName;
            data.instructorData = instructor;

            // Ratings
            const classReviews = reviews.filter((r) => r.classID === data.id);
            const avgRating = classReviews.length
              ? classReviews.reduce((acc, r) =>
                  acc + (r.qualityRating + r.recommendRating + r.safetyRating) / 3, 0
                ) / classReviews.length
              : 0;

            data.averageRating = avgRating;
            data.reviewCount = classReviews.length;

            // Bookings for this class
            const thisClassBookings = allBookings.filter(b => b.classId === data.id);
            const bookingUsers = thisClassBookings.map(b => b.studentId);

            // 1. Collaborative Filtering
            let bookingSimilarity = 0;
            if (booked.length) {
              const similarUsers = new Set();
              booked.forEach(b =>
                allBookings.filter(ab => ab.classId === b.classId)
                  .forEach(ab => similarUsers.add(ab.studentId))
              );
              const overlap = bookingUsers.filter(u => similarUsers.has(u)).length;
              bookingSimilarity = Math.min(overlap / (bookingUsers.length || 1), 1) * 10;
            }

            // 2. View Frequency
            const viewedFreq = allViewed.filter(
              (v) => (typeof v === "string" ? v : v.id) === data.id
            ).length;
            const viewingBehavior = Math.min(viewedFreq * 2, 10);

            // 3. Content Matching
            let categoryScore = 0, subCatScore = 0;
            if (bookedSubCategories.has(data.SubCategory) || viewedSubCategories.has(data.SubCategory))
              subCatScore = 10;
            if (bookedCategories.has(data.Category) || viewedCategories.has(data.Category) ||
                bookedTypes.has(data.Type) || viewedTypes.has(data.Type))
              categoryScore = 6;
            if (currentClassData) {
              if (data.SubCategory === currentClassData.SubCategory) subCatScore += 20;
              if (data.Category === currentClassData.Category || data.Type === currentClassData.Type) categoryScore += 6;
            }
            const contentMatch = subCatScore + categoryScore;

            // 4. Quality Score
            const quality = Math.min(
              (data.instructorData.rating || 0) * 1.5 +
              avgRating * 1.5 +
              Math.min(classReviews.length * 0.3, 3) +
              Math.min(thisClassBookings.length * 0.2, 2) +
              (data.TopRated ? 3 : 0),
              10
            );

            // 5. Location Score
            let locationScore = 0;
            if (data.Mode === "Online") {
              locationScore = 8;
            } else if (userLocation && data.latitude && data.longitude) {
              const toRad = (deg) => deg * Math.PI / 180;
              const R = 6371;
              const dLat = toRad(data.latitude - userLocation.lat);
              const dLon = toRad(data.longitude - userLocation.lng);
              const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(toRad(userLocation.lat)) *
                        Math.cos(toRad(data.latitude)) *
                        Math.sin(dLon / 2) ** 2;
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const dist = R * c;

              if (dist <= 5) locationScore = 10;
              else if (dist <= 10) locationScore = 8;
              else if (dist <= 20) locationScore = 6;
              else if (dist <= 50) locationScore = 4;
              else locationScore = 2;
            }

            data.recommendationScore = (
              0.3 * bookingSimilarity +
              0.2 * viewingBehavior +
              0.2 * contentMatch +
              0.15 * quality +
              0.15 * locationScore
            );

            return data;
          })
        );

        const validClasses = recommendations
          .filter(Boolean)
          .sort((a, b) =>
            b.recommendationScore !== a.recommendationScore
              ? b.recommendationScore - a.recommendationScore
              : b.averageRating - a.averageRating
          );

        setClasses(validClasses.slice(0, 20));
      } catch (e) {
        console.error("Recommendation error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [reviews, user]);

  const displayedClasses = useMemo(() => {
    return activeFilter
      ? classes.filter(c => c.Type === activeFilter || c.SubCategory === activeFilter)
      : classes;
  }, [classes, activeFilter]);

  useEffect(() => {
    onClassesLoad?.(displayedClasses.length);
  }, [displayedClasses, onClassesLoad]);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  }, []);
  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  }, []);

  if (!displayRec) return null;

  return (
    <div className={`flex flex-col w-full py-8 ${currentClassData ? "px-0" : "section-spacing"}`}>
      {!activeFilter && (
        <Reveal>
          <p className="section-heading !text-left">
            {currentClassData ? "Similar Classes" : "Recommended"}
          </p>
        </Reveal>
      )}
      <div className="relative">
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M15 18L9 12L15 6" stroke="#261f22" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:shadow-lg hover:bg-gray-50"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path d="M9 18L15 12L9 6" stroke="#261f22" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div ref={scrollRef} className="gap-8 max-w-full mt-8 overflow-x-auto overflow-y-hidden flex px-12">
          {loading
            ? Array(4)
                .fill(0)
                .map((_, i) => (
                  <Reveal key={i} delay={i * 120}>
                    <div className="dm1:w-[300px] w-[250px] h-[430px] shrink-0 border border-gray-200 rounded-2xl flex">
                      <InstructorSection loading />
                    </div>
                  </Reveal>
                ))
            : displayedClasses.map((item, i) => (
                <Reveal key={item.id} delay={i * 120}>
                  <div className="dm1:w-[300px] w-[250px] h-[430px] shrink-0 border border-gray-200 rounded-2xl flex">
                    <InstructorSection instructor={item} classId={item.id} />
                  </div>
                </Reveal>
              ))}
        </div>
      </div>
    </div>
  );
}

export default RecommendedClassesSection;
