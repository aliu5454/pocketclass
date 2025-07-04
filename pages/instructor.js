"use client";

import Head from "next/head";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { auth, db } from "../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import {
    doc,
    getDoc,
    Timestamp,
    collection,
    query,
    where,
    addDoc,
    getDocs,
} from "firebase/firestore";
import Image from "next/image";
import { toast } from "react-toastify";

import NewHeader from "../components/NewHeader";
import InstructorImage from "../components/InstructorProfile/instructorImages";
import StatsBar from "../components/InstructorProfile/statsBar";
import InstructorBio from "../components/InstructorProfile/Bio";
import ClassCarousel from "../components/InstructorProfile/class";
import Gallery from "../components/InstructorProfile/Gallery";
import ReviewCard from "../components/InstructorProfile/Reviews";
import ClassroomFooter from "../home-components/ClassroomFooter";

const LocationMap = dynamic(
    () => import("../components/InstructorProfile/Map"),
    { ssr: false }
);

export default function UpdateClass() {
    const [user, userLoading] = useAuthState(auth);
    const [instructor, setInstructor] = useState(null);
    const [title, setTitle] = useState("Instructor Profile");

    const [classes, setClasses] = useState([]);
    const [locations, setLocations] = useState([]);

    const [avgRating, setAvgRating] = useState(null);
    const [avgRatingCount, setAvgRatingCount] = useState(null);
    const [studentsCount, setStudentsCount] = useState(0);

    const [reviews, setReviews] = useState([]);
    const [loadingReviews, setLoadingReviews] = useState(true);

    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingInstructor, setLoadingInstructor] = useState(true);

    const router = useRouter();
    const { class: classId } = router.query;
    const { creator: id } = router.query;

    const openChat = async () => {
        if (!user) return toast.warning("Please login to chat");

        const data = {
            instructor: id,
            student: user.uid,
            class: classId,
            messages: [],
            createdAt: Timestamp.now(),
            lastMessage: Timestamp.fromDate(new Date(Date.now() - 10 * 60000)),
        };

        try {
            const rooms = collection(db, "chatrooms");
            const q = query(
                rooms,
                where("student", "==", user.uid),
                where("instructor", "==", id),
                where("class", "==", classId)
            );
            const existing = await getDocs(q);

            const docRef = !existing.empty
                ? existing.docs[0]
                : await addDoc(rooms, data);

            router.push({
                pathname: "/chat",
                query: { cid: classId, chid: docRef.id },
            });
        } catch {
            toast.error("Chat launching error");
        }
    };

    const loadStudents = async () => {
        try {
            const q = query(collection(db, "Bookings"), where("instructor_id", "==", id));
            const snap = await getDocs(q);
            let total = 0;
            snap.forEach((d) => {
                const g = parseInt(d.data().groupSize);
                total += isNaN(g) || g < 1 ? 1 : g;
            });
            setStudentsCount(total);
        } catch {
            console.error("Error loading student count");
        }
    };

    const loadReviews = async (clsList) => {
        setLoadingReviews(true);

        const reviewPromises = clsList.map(async (cls) => {
            const q = query(collection(db, "Reviews"), where("classID", "==", cls.id));
            const snap = await getDocs(q);
            return snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    classID: cls.id,
                };
            });
        });

        try {
            const reviewResults = await Promise.all(reviewPromises);
            const allReviews = reviewResults.flat();

            const scores = allReviews
                .map((r) => {
                    const { qualityRating, recommendRating, safetyRating } = r;
                    if (
                        typeof qualityRating === "number" &&
                        typeof recommendRating === "number" &&
                        typeof safetyRating === "number"
                    ) {
                        return (qualityRating + recommendRating + safetyRating) / 3;
                    }
                    return null;
                })
                .filter((score) => score !== null);

            setReviews(allReviews);
            setAvgRating(
                scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0
            );
            setAvgRatingCount(scores.length);
        } catch (err) {
            toast.error("Error loading reviews");
        } finally {
            setLoadingReviews(false);
        }
    };

    const loadClasses = async () => {
        setLoadingClasses(true);
        try {
            const q = query(collection(db, "classes"), where("classCreator", "==", id));
            const snap = await getDocs(q);
            const cls = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setClasses(cls);
            const locs = cls
                .filter((c) => c.latitude && c.longitude)
                .map((c) => ({
                    id: c.id,
                    name: c.Name,
                    lat: parseFloat(c.latitude),
                    lng: parseFloat(c.longitude),
                }));
            setLocations(locs);
            loadReviews(cls);
        } catch {
            console.error("Error loading classes");
        } finally {
            setLoadingClasses(false);
        }
    };

    useEffect(() => {
        const fetchInstructor = async () => {
            if (!id) return;
            try {
                const snap = await getDoc(doc(db, "Users", id));
                const data = snap.data();
                setInstructor(data);
                setTitle(`Instructor Profile - ${data?.firstName || ""}`);
                setLoadingInstructor(false);
                loadClasses();
                loadStudents();
            } catch {
                toast.error("Error fetching profile");
            }
        };
        fetchInstructor();
    }, [id]);

    return (
        <div>
            <Head>
                <title>{title}</title>
                <link rel="icon" href="/pc_favicon.ico" />
            </Head>

            <NewHeader />

            {loadingInstructor ? (
                <div className="max-w-6xl mx-auto px-4 animate-pulse h-40 bg-gray-200 rounded-lg my-4" />
            ) : (
                <InstructorImage instructorData={instructor} onMessageClick={openChat} />
            )}

            {loadingClasses ? (
                <div className="max-w-6xl mx-auto px-4 animate-pulse h-24 bg-gray-200 rounded my-6" />
            ) : (
                <div className="max-w-6xl mx-auto px-4 mt-6">
                    <StatsBar
                        classLength={classes.length}
                        averageRating={avgRating}
                        totalStudentsTaught={studentsCount}
                        totalReviews={avgRatingCount}
                    />
                </div>
            )}

            {loadingInstructor ? (
                <div className="max-w-6xl mx-auto px-4 animate-pulse h-20 bg-gray-200 rounded my-6" />
            ) : instructor?.profileDescription ? (
                <div className="max-w-6xl mx-auto px-4 mt-6">
                    <InstructorBio classData={instructor} />
                </div>
            ) : null}

            {loadingClasses ? (
                <div className="max-w-6xl mx-auto px-4 animate-pulse h-40 bg-gray-200 rounded my-6" />
            ) : (
                <ClassCarousel classes={classes} />
            )}

            {loadingClasses ? (
                <div className="max-w-6xl mx-auto px-4 animate-pulse h-60 bg-gray-200 rounded my-6" />
            ) : (
                <Gallery
                    profileImage={instructor?.profileImage}
                    coverImages={classes.flatMap((c) => c.Images || [])}
                />
            )}

            {loadingClasses ? (
                <div className="max-w-6xl mx-auto px-4 animate-pulse h-[400px] bg-gray-200 rounded my-6" />
            ) : locations.length > 0 ? (
                <div className="max-w-6xl mx-auto px-4 mt-6">
                    <h2 className="text-2xl font-bold mb-4">My Locations</h2>
                    <LocationMap locations={locations} classes={classes} />
                </div>
            ) : null}

            <div className="max-w-6xl mx-auto px-4 mt-6 relative z-10">
                {loadingReviews ? (
                    <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <div
                                key={i}
                                className="w-full h-32 bg-gray-200 animate-pulse rounded"
                            />
                        ))}
                    </div>
                ) : reviews.length > 0 ? (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Full Reviews</h2>
                        <ReviewCard reviewsToShown={reviews} />
                    </div>
                ) : null}
            </div>

            <div className="relative -top-10 z-0">
                <ClassroomFooter isHome={false} />
            </div>
        </div>
    );
}
