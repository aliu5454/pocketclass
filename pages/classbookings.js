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
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import StudentClasses from "../components/StudentClasses/instructorAllClass";
import moment from "moment-timezone";
import NewHeader from "../components/NewHeader";

const MyClass = () => {
  const router = useRouter();
  const [userData, setUserData] = useState();
  const [appointments, setAppointments] = useState([]);
  const [myClass, setMyClass] = useState([]);
  const [classDetails, setClassDetails] = useState({});
  const [reviews, setReviews] = useState([]);
  const [user, loading] = useAuthState(auth);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [activeTab, setActiveTab] = useState("student");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const { id } = router.query;

  useEffect(() => {
    if (!user && !loading) {
      router.push("/");
    }
    if (user && user.uid !== id) {
      router.push(`/mybooking?id=${user.uid}`);
    }
  }, [user, loading]);

  const getUserInfo = async (id) => {
    const docRef = doc(db, "Users", id);
    const data = await getDoc(docRef);
    setUserData(data.data());
    if (data.data().category !== "instructor") {
      router.push(`/mybooking?id=${data.data().id}`);
    }
  };

  const getAppointments = async (userId) => {
    setIsLoading(true);
    const q = query(
      collection(db, "Bookings"),
      where("instructor_id", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    let appointmentsData = querySnapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    }));
    appointmentsData = appointmentsData.filter((a) => a.status !== "Pending");

    const checks = await Promise.all(
      appointmentsData.map(async (appointment) => {
        const classDoc = await getDoc(doc(db, "classes", appointment.class_id));
        return classDoc.exists() ? appointment : null;
      })
    );

    const validAppointments = checks.filter(Boolean);
    setAppointments(validAppointments);
    await fetchClassDetails(validAppointments);
    setIsLoading(false);
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
    if (
      id &&
      !userData?.isInstructor
    ) {
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
    return onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
  }, []);

  const groupAppointments = (appointments) => {
    const now = new Date();
    const grouped = {};
    appointments.forEach((appt) => {
      const startTime = new Date(appt.startTime);
      // if (startTime < now) return;
      const key = `${appt.class_id}_${appt.startTime}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...appt,
          student_names: [appt.student_name],
          all_emails: [...(appt.groupEmails || [])],
        };
      } else {
        grouped[key].student_names.push(appt.student_name);
        grouped[key].all_emails.push(...(appt.groupEmails || []));
      }
    });
    return Object.values(grouped);
  };

  const groupedAppointments = groupAppointments(appointments);

  const handleExportCSV = () => {
    const headers = [
      "Ref #",
      "Client",
      "Service",
      "Created Date",
      "Scheduled Date",
      "Duration (min)",
      "Price",
    ];

    const rows = appointments
      .filter((appt) => {
        const refId = appt.id.slice(0, 8).toLowerCase();
        const client = (appt.student_name || "").toLowerCase();
        const query = searchQuery.toLowerCase().trim();

        if (!query) return true;

        return refId.startsWith(query) || client.includes(query);
      })
      .map((appt) => {
        const classInfo = classDetails[appt.class_id];
        const createdDate = moment(appt.createdAt?.toDate?.()).format(
          "D MMM YYYY, h:mm A"
        );
        const scheduledDate = moment(appt.startTime).format(
          "D MMM YYYY, h:mm A"
        );
        const duration = moment(appt.endTime).diff(
          moment(appt.startTime),
          "minutes"
        );
        const price = appt.price ? Number(appt.price).toFixed(2) : "0.00";

        return [
          `#${appt.id.slice(0, 8)}`,
          appt.student_name,
          classInfo?.Name,
          `"${createdDate}"`,
          `"${scheduledDate}"`,
          duration,
          `CA$${price}`,
        ];
      });

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bookings.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!id || !userData || loading) {
    return null;
  }

  return (
    <div className="myClassesContainer mx-auto px-4 max-w-7xl">
      <Head>
        <title>Class Bookings</title>
        <meta name="description" content="My Class Dashboard" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      <div className="flex space-x-4 border-b mb-4">
        <button
          className={`py-2 px-4 ${
            activeTab === "student"
              ? "border-b-2 border-black font-semibold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("student")}
        >
          My Bookings
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "all"
              ? "border-b-2 border-black font-semibold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Bookings
        </button>
      </div>
      {activeTab === "student" ? (
        <div className="myClassesContainer overflow-hidden mx-auto">
          <StudentClasses
            appointments={groupedAppointments}
            classDetails={classDetails}
            reviews={reviews}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4 mx-auto max-w-7xl">
            <input
              type="text"
              placeholder="Search by Ref # or Client name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm px-4 py-2 border rounded-lg shadow-sm outline-none focus:border-logo-red focus:ring-0"
            />
            <button
              onClick={handleExportCSV}
              className="ml-4 px-4 py-2 bg-logo-red text-white rounded-lg shadow hover:bg-red-600"
            >
              Export to Excel
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl shadow-md mb-8 mx-auto max-w-7xl">
            <table className="min-w-full text-sm text-gray-700">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left">Ref #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-left">Created Date</th>
                  <th className="px-4 py-3 text-left">Scheduled Date</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {appointments
                  .filter((appt) => {
                    const refId = appt.id.slice(0, 8).toLowerCase();
                    const client = (appt.student_name || "").toLowerCase();
                    const query = searchQuery.toLowerCase().trim();
                    return (
                      !query ||
                      refId.startsWith(query) ||
                      client.includes(query)
                    );
                  })
                  .map((appt) => {
                    const classInfo = classDetails[appt.class_id];
                    return (
                      <tr key={appt.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-purple-600 underline">
                          #{appt.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-2">{appt.student_name}</td>
                        <td className="px-4 py-2">{classInfo?.Name}</td>
                        <td className="px-4 py-2">
                          {moment(appt.createdAt?.toDate?.()).format(
                            "D MMM YYYY, h:mm A"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {moment(appt.startTime).format("D MMM YYYY, h:mm A")}
                        </td>
                        <td className="px-4 py-2">
                          {moment(appt.endTime).diff(
                            moment(appt.startTime),
                            "minutes"
                          )}{" "}
                          min
                        </td>
                        <td className="px-4 py-2">
                          CA$
                          {appt.price ? Number(appt.price).toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default MyClass;
