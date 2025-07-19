import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebaseConfig";
import InfoCard from "../../components/InfoCard";
import { useAuthState } from "react-firebase-hooks/auth";
import { Tabs } from "antd";
import NewHeader from "../../components/NewHeader";
import StudentClasses from "../../components/StudentClasses";
import InstructorClasses from "../../components/InstructorClasses";

const MyClass = () => {
  const router = useRouter();
  const { id } = router.query;

  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [myClass, setMyClass] = useState([]);
  const [classDetails, setClassDetails] = useState({});
  const [bookings, setBookings] = useState([]);
  const [bookingsByMe, setBookingsByMe] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // ✅ Main loading flag

  const getUserInfo = async (uid) => {
    try {
      const docSnap = await getDoc(doc(db, "Users", uid));
      if (docSnap.exists()) setUserData(docSnap.data());
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  const fetchInstructorNames = async (appointments) => {
    const uniqueInstructorIds = [
      ...new Set(appointments.map((a) => a.instructor_id)),
    ];

    const instructorMap = {};
    await Promise.all(
      uniqueInstructorIds.map(async (instructorId) => {
        try {
          const docSnap = await getDoc(doc(db, "Users", instructorId));
          if (docSnap.exists()) {
            const data = docSnap.data();
            instructorMap[instructorId] =
              data.firstName && data.lastName
                ? `${data.firstName} ${data.lastName}`
                : data.firstName || "Instructor";
          }
        } catch (err) {
          console.error("Failed to fetch instructor", instructorId);
        }
      })
    );

    return instructorMap;
  };

  const groupAppointments = (appointments) => {
    const grouped = {};
    appointments.forEach((appt) => {
      const key = `${appt.class_id}_${appt.startTime}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...appt,
          student_names: [appt.student_name],
          groupEmails: [...(appt.groupEmails || [])],
        };
      } else {
        grouped[key].student_names.push(appt.student_name);
        grouped[key].groupEmails.push(...(appt.groupEmails || []));
      }
    });
    return Object.values(grouped);
  };

  const getAppointments = async (userId) => {
    try {
      setIsLoading(true); // ✅ Start loading
      const q = query(
        collection(db, "Bookings"),
        where("student_id", "==", userId)
      );
      const snapshot = await getDocs(q);

      let appts = snapshot.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }))
        .filter((a) => a.status !== "Pending");

      const filtered = [];
      await Promise.all(
        appts.map(async (a) => {
          const classSnap = await getDoc(doc(db, "classes", a.class_id));
          if (classSnap.exists()) filtered.push(a);
        })
      );

      const instructorMap = await fetchInstructorNames(filtered);

      const appointmentsWithNames = filtered.map((a) => ({
        ...a,
        student_name: instructorMap[a.instructor_id] || "Instructor",
      }));

      const grouped = groupAppointments(appointmentsWithNames);
      setAppointments(grouped);
      await fetchClassDetails(grouped);
    } catch (error) {
      console.error("Error getting appointments:", error);
    } finally {
      setIsLoading(false); // ✅ Done loading
    }
  };

  const fetchClassDetails = async (appointments) => {
    const newClassDetails = { ...classDetails };
    const alreadyFetched = new Set(Object.keys(classDetails));

    await Promise.all(
      appointments.map(async (appt) => {
        const cid = appt.class_id;
        if (!alreadyFetched.has(cid)) {
          const classSnap = await getDoc(doc(db, "classes", cid));
          if (classSnap.exists()) {
            newClassDetails[cid] = { ...classSnap.data(), id: cid };
            alreadyFetched.add(cid);
          }
        }
      })
    );

    setClassDetails(newClassDetails);
  };

  const getClass = async (q) => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(q);
      let temp = querySnapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      }));
      setMyClass(temp);
      
      // Also fetch bookings for instructors
      if (userData?.isInstructor) {
        await fetchInstructorBookings(id);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstructorBookings = async (instructorId) => {
    try {
      // Fetch bookings where instructor_id matches
      const q1 = query(
        collection(db, "Bookings"),
        where("instructor_id", "==", instructorId)
      );
      const querySnapshot1 = await getDocs(q1);
      const instructorBookings = querySnapshot1.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      }));
      setBookings(instructorBookings);

      // Fetch bookings where student_id matches (instructor as student)
      const q2 = query(
        collection(db, "Bookings"),
        where("student_id", "==", instructorId)
      );
      const querySnapshot2 = await getDocs(q2);
      const studentBookings = querySnapshot2.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      }));
      setBookingsByMe(studentBookings);
    } catch (error) {
      console.error("Error fetching instructor bookings:", error);
    }
  };

  useEffect(() => {
    if (id) getUserInfo(id);
  }, [id]);

  useEffect(() => {
    if (id && !userData?.isInstructor) {
      getAppointments(id);
    }
  }, [id, userData]);

  useEffect(() => {
    if (id && userData?.isInstructor) {
      const q = query(
        collection(db, "classes"),
        where("classCreator", "==", id)
      );
      getClass(q);
    }
  }, [id, userData]);

  useEffect(() => {
    if (!user && !loading) {
      router.push("/");
    }
    if (user && user.uid !== id) {
      router.push(`/myClass?id=${user.uid}`);
    }
  }, [user, loading]);

  if (!id || !userData || loading) {
    return (
      <section className="flex justify-center items-center min-h-[100vh]">
        <Image
          priority={true}
          src="/Rolling-1s-200px.svg"
          width={600}
          height={600}
        />
      </section>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="myClassesContainer overflow-hidden mx-auto">
      <Head>
        <title>My Classes</title>
        <meta name="description" content="My Class Dashboard" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      {userData?.isInstructor && (
        <InstructorClasses
          classes={myClass}
          setMyClass={setMyClass}
          bookings={bookings}
          bookingsByMe={bookingsByMe}
          reviews={reviews}
          userData={userData}
          isLoading={isLoading} // ✅ Pass loading prop
        />
      )}

      {!userData?.isInstructor && (
        <StudentClasses
          appointments={appointments}
          setMyClass={setMyClass}
          classDetails={classDetails}
          reviews={reviews}
          isLoading={isLoading} // ✅ Pass loading prop
        />
      )}
    </div>
  );
};

export default MyClass;
