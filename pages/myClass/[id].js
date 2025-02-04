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
import InstructorCard from "../../components/InstructorClasses/InstructorCard";
import InstructorClasses from "../../components/InstructorClasses";

const MyClass = () => {
  const router = useRouter();
  const [userData, setUserData] = useState();
  const [appointments, setAppointments] = useState([]);
  const [myClass, setMyClass] = useState([]);
  const [classDetails, setClassDetails] = useState({});
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [user, loading] = useAuthState(auth);

  const { id } = router.query;
  const [selectedStatus, setSelectedStatus] = useState("All");

  const getUserInfo = async (id) => {
    const docRef = doc(db, "Users", id);
    const data = await getDoc(docRef);
    setUserData(data.data());
  };

  const getAppointments = async (userId) => {
    const q = query(
      collection(db, "Bookings"),
      where("student_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    let appointmentsData = querySnapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    }));
    // Filter appointments to remove ones that are pending
    appointmentsData = appointmentsData.filter((a) => a.status !== "Pending");
    setAppointments(appointmentsData);
    fetchClassDetails(appointmentsData);
  };

  const fetchClassDetails = async (appointments) => {
    let classData = {};
    await Promise.all(
      appointments.map(async (appointment) => {
        const classDoc = await getDoc(doc(db, "classes", appointment.class_id));
        if (classDoc.exists()) {
          classData[appointment.class_id] = {
            ...classDoc.data(),
            id: appointment.class_id,
          };
        }
      })
    );
    setClassDetails(classData);
  };

  const getClass = async (q) => {
    const querySnapshot = await getDocs(q);
    let temp = querySnapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    }));
    setMyClass(temp);
  };

  useEffect(() => {
    if (id) getUserInfo(id);
  }, [id]);

  useEffect(() => {
    if (id && userData?.category === "student") {
      getAppointments(id);
    }
  }, [id, userData]);

  useEffect(() => {
    if (id && userData?.category === "instructor") {
      const q = query(
        collection(db, "classes"),
        where("classCreator", "==", id)
      );
      getClass(q);
    }
  }, [id, userData]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (id && userData?.category === "instructor") {
        try {
          const q = query(
            collection(db, "Bookings"),
            where("instructor_id", "==", id)
          );
          const querySnapshot = await getDocs(q); 
          const temp = querySnapshot.docs.map((docSnap) => ({
            ...docSnap.data(),
            id: docSnap.id,
          }));
          console.log("temp", temp);
          setBookings(temp);
        } catch (error) {
          console.error("Error fetching bookings:", error);
        }
      }
    };

    fetchBookings();
  }, [id, userData]);

  useEffect(() => {
    return onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
  }, []);

  const handleTabChange = (key) => {
    setSelectedStatus(key);
  };

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

  const filteredAppointments = appointments.filter((appointment) => {
    if (selectedStatus === "Active") return appointment.status === "pending";
    if (selectedStatus === "Completed")
      return appointment.status === "completed";
    return true;
  });

  const filteredClasses = myClass.filter((classData) => {
    if (selectedStatus === "Active") return classData.status === "pending";
    if (selectedStatus === "Completed") return classData.status === "completed";
    return true;
  });

  return (
    <div className="myClassesContainer mx-auto">
      <Head>
        <title>My Class</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      <NewHeader />

      <h1 className="text-center text-4xl font-bold py-[50px]">My Classes</h1>

      {userData?.category === "instructor" && (
        <InstructorClasses
          classes={myClass}
          bookings={bookings}
          reviews={reviews}
        />
      )}

      {userData?.category === "student" && (
        <StudentClasses
          appointments={appointments}
          classDetails={classDetails}
          reviews={reviews}
        />
      )}
    </div>
  );
};

export default MyClass;
