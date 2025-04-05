import React, { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
// components
// firebase
import { auth, db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  Timestamp,
  arrayUnion,
  getDocs,
  query,
  collection,
  where,
  addDoc,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
// animation
import FlipMove from "react-flip-move";
// moment
import moment from "moment/moment";
import AddMedia from "../components/AddMedia";
import MediaDisplay from "../components/MediaDisplay";
import { v4 } from "uuid";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import NewHeader from "../components/NewHeader";

const Chat = () => {
  const router = useRouter();
  const bottomRef = useRef();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // data
  const [chid, setchid] = useState(router.query.chid);
  const [cid, setcid] = useState(router.query.cid);
  const [user] = useAuthState(auth);
  const [roomData, setRoomData] = useState(null);
  const [classData, setClassData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [instructorData, setInstructorData] = useState(null);
  const [groupAppointments, setGroupAppointments] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupStudents, setGroupStudents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);

  // if user is instructor
  const [isInstructor, setIsInstructor] = useState(false);

  // messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [newMediaPreview, setNewMediaPreview] = useState(null);
  const [newMedia, setNewMedia] = useState(null);
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [selectedChatroom, setSelectedChatroom] = useState(null);

  useEffect(() => {
    if (chid && chatRooms.length > 0 && classes.length > 0) {
      const selectedChatroom = chatRooms.find(
        (chatroom) => chatroom.id === chid
      );
      if (selectedChatroom) {
        const selectedClass = classes.find(
          (classItem) => classItem.id === selectedChatroom.class
        );
        setSelectedClassData(selectedClass || null);
        setSelectedChatroom(selectedChatroom);
      }
    }
  }, [chid, chatRooms, classes]);

  /**
   * UTILITY FUNCTIONS
   */

  // redirect to main page
  const goToMainPage = () => router.push("/");
  useEffect(() => {
    if (router.query.chid) {
      setchid(router.query.chid);
    }
    if (router.query.cid) {
      setcid(router.query.cid);
    }
  }, [router.query.chid, router.query.cid]);

  useEffect(() => {
    // Update isInstructor based on user data
    if (chid && chatRooms && user) {
      const chatRoom = chatRooms.find((chatroom) => chatroom.id === chid);
      if (chatRoom && chatRoom.instructor === user.uid) {
        setIsInstructor(true);
      } else {
        setIsInstructor(false);
      }
    }
  }, [chid, chatRooms, user]);

  // get data (student/instructor/class/chatroom)
  const getData = async (xid, xcol) => {
    const docRef = doc(db, xcol, xid);
    const data = await getDoc(docRef);
    return data?.data();
  };

  const getBookings = async () => {
    if (!user) return;

    try {
      const instructorQuery = query(
        collection(db, "Bookings"),
        where("instructor_id", "==", user?.uid)
      );

      const studentQuery = query(
        collection(db, "Bookings"),
        where("student_id", "==", user?.uid)
      );

      const instructorBookings = await getDocs(instructorQuery);
      const studentBookings = await getDocs(studentQuery);

      const allBookings = [
        ...instructorBookings.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        ...studentBookings.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      ];

      // Resolve student names and class details
      const studentIds = [
        ...new Set(allBookings.map((booking) => booking.student_id)),
      ];
      const classIds = [
        ...new Set(allBookings.map((booking) => booking.class_id)),
      ];

      // Fetch students
      const studentPromises = studentIds.map((id) => getData(id, "Users"));
      const students = await Promise.all(studentPromises);

      // Fetch classes
      const classPromises = classIds.map((id) => getData(id, "classes"));
      const classDetails = await Promise.all(classPromises);

      // Attach names and class details to bookings
      const enrichedBookings = allBookings.map((booking) => ({
        ...booking,
        student_name: `${
          students.find((s) => s?.userUid === booking.student_id)?.firstName || allBookings.find((s) => s?.student_id === booking.student_id)?.student_name ||
          "Unknown"
        } ${
          students.find((s) => s?.userUid === booking.student_id)?.lastName ||
          ""
        }`.trim(),
        class_name:
          classDetails.find((c) => c?.id === booking.class_id)?.Name ||
          "Unknown",
      }));

      setBookings(enrichedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  useEffect(() => {
    if (user) getBookings();
  }, [user]);

  const getChatRooms = async () => {
    const chatroomsQuery = query(
      collection(db, "chatrooms"),
      where("instructor", "==", user?.uid)
    );
    const chatroomsSnapshot = await getDocs(chatroomsQuery);
    const chatRoomQuery1 = query(
      collection(db, "chatrooms"),
      where("student", "==", user?.uid)
    );

    const chatroomsSnapshot1 = await getDocs(chatRoomQuery1);

    // Filter out undefined start times
    const startTimes = bookings
      .map((booking) => booking.startTime)
      .filter((time) => time !== undefined);

    const chatRoomQury2 =
      startTimes.length > 0
        ? query(
            collection(db, "chatrooms"),
            where("startTime", "in", startTimes)
          )
        : null;

    const chatroomsSnapshot2 =
      startTimes.length > 0 ? await getDocs(chatRoomQury2) : { docs: [] };

    const chatRoomTempData = chatroomsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const chatRoomTempData1 = chatroomsSnapshot1.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const chatRoomTempData2 = chatroomsSnapshot2.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const chatRoomTempData3 = chatRoomTempData.concat(chatRoomTempData1);
    const chatRoomTempData4 = chatRoomTempData3.concat(chatRoomTempData2);
    const uniqueChatRooms = [
      ...new Map(chatRoomTempData4.map((item) => [item.id, item])).values(),
    ];
    setChatRooms(uniqueChatRooms);
  };

  useEffect(() => {
    if (user) getChatRooms();
  }, [user, bookings]);
  useEffect(() => {}, [cid, chid, router.isReady]);

  // scroll to bottom
  useEffect(() => {
    const scrollToBottom = () =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    scrollToBottom();
  }, [messages, groupMessages]);

  /**
   * DATA FUNCTIONS
   */

  useEffect(() => {
    const getAllData = async () => {
      try {
        const chatRoomTemp = await getData(chid, "chatrooms");
        setRoomData(chatRoomTemp);

        setStudentData(await getData(chatRoomTemp?.student, "Users"));

        setInstructorData(await getData(chatRoomTemp?.instructor, "Users"));
        const classTempData = await getData(chatRoomTemp?.class, "classes");
        setClassData(classTempData);

        if (classTempData?.groupType === "group") {
          const chatroomsQuery = query(
            collection(db, "chatrooms"),
            where("class", "==", cid)
          );

          const chatroomsSnapshot = await getDocs(chatroomsQuery);
          const chatRoomTempData = chatroomsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Merging messages from all chatrooms
          const mergedMessages = chatRoomTempData.reduce((acc, chatRoom) => {
            return acc.concat(chatRoom.messages);
          }, []);

          // Sorting messages by createdAt timestamp
          mergedMessages.sort(
            (a, b) =>
              a.createdAt.seconds - b.createdAt.seconds ||
              a.createdAt.nanoseconds - b.createdAt.nanoseconds
          );

          setGroupMessages(mergedMessages);

          const appointmentsSnapshot = await getDocs(
            query(collection(db, "appointments"), where("class", "==", cid))
          );
          const appointments = appointmentsSnapshot.docs.map((doc) =>
            doc.data()
          );
          setGroupAppointments(appointments);

          const uniqueStudentIds = [
            ...new Set(appointments.map((appt) => appt.owner)),
          ];

          const studentsDataPromises = uniqueStudentIds.map((uid) =>
            getData(uid, "Users")
          );

          const students = await Promise.all(studentsDataPromises);

          const uniqueStudents = [
            ...new Map(
              students.map((student) => [student.userUid, student])
            ).values(),
          ];
        }

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        console.warn(error);
      }
    };

    if (chid) getAllData();
  }, [chid, cid]);

  useEffect(() => {
    if (chid && bookings.length > 0) {
      const selectedChatroom = chatRooms.find(
        (chatroom) => chatroom.id === chid
      );
      if (selectedChatroom) {
        let relatedBookings = bookings.filter(
          (booking) =>
            booking.class_id === selectedChatroom.class &&
            booking.student_id == selectedChatroom.student
        );
        if (!relatedBookings || !relatedBookings.length) {
          relatedBookings = bookings.filter(
            (booking) =>
              booking.class_id === selectedChatroom.class &&
              booking.startTime === selectedChatroom.startTime
          );
        }
        console.log(relatedBookings);

        const uniqueStudents = [
          ...new Map(
            relatedBookings.map((booking) => [
              booking.student_id,
              { userUid: booking.student_id, name: booking.student_name },
            ])
          ).values(),
        ];

        setGroupStudents(uniqueStudents);
      }
    }
  }, [chid, chatRooms, bookings]);

  // useEffect to get classDetails of all chatrooms
  // To do this we create an array of classIds from chatrooms, and then fetch if array lenght >0
  useEffect(() => {
    const getClassDetails = async () => {
      try {
        if (chatRooms.length > 0) {
          // const classDataPromises = classIds.map((cid) =>
          //   getData(cid, "classes")
          // );
          const classIds = chatRooms.map((chatroom) => chatroom.class);
          const classes = await Promise.all(
            classIds.map(async (cid) => {
              const docRef = doc(db, "classes", cid);
              const data = await getDoc(docRef);
              return { id: data.id, ...data.data() };
            })
          );
          const instructors = await Promise.all(
            classes.map(async (cls) => {
              try {
                const docRef = doc(db, "Users", cls.classCreator);
                const data = await getDoc(docRef);
                return { id: data.id, ...data.data() };
              } catch (error) {
                console.warn(
                  `Error fetching instructor for class ${cls.id}:`,
                  error
                );
                return null;
              }
            })
          );
          // Add instructor names to classes firstName+lastName
          classes.forEach((cls, index) => {
            if (instructors[index]) {
              cls.instructorName = instructors[index].firstName + " " +  instructors[index].lastName;
            }
          })
          setClasses(classes);
        }
      } catch (error) {
        console.warn(error);
      }
    };
    getClassDetails();
  }, [chatRooms]);

  /**
   * LAST SEEN FUNCTIONS
   */

  // mark notification as read
  const updateLastSeens = async () => {
    try {
      const now = Timestamp?.now();
      const querySnapshot = await getDocs(
        query(
          collection(db, "notifications"),
          where("chatroom", "==", chid),
          where("user", "==", user?.uid),
          where("isRead", "==", false)
        )
      );

      querySnapshot.forEach(async (docRef) => {
        await updateDoc(doc(db, "notifications", docRef.id), {
          createdAt: now,
          isRead: true,
        });
      });
    } catch (error) {
      console.warn(error);
    }
  };

  // mark as read
  useEffect(() => {
    if (!!chid && !!user) updateLastSeens();
  }, [chid, user]);

  /**
   * MESSAGING FUNCTIONS
   */

  // realtime message updates
  useEffect(() => {
    const getMessages = async () => {
      try {
        onSnapshot(doc(db, "chatrooms", chid), (doc) => {
          !!doc?.data()?.messages && setMessages(doc?.data()?.messages);
        });
      } catch (error) {
        console.warn(error);
      }
    };

    if (chid) getMessages();
  }, [chid]);

  // upload file
  const uploadFile = async () => {
    const storage = getStorage();
    const mediaRef = ref(
      storage,
      `chat-images/${
        user?.uid?.split(" ").join("") + newMedia?.name ?? "" + v4()
      }`
    );
    return await uploadBytes(mediaRef, newMedia, {
      contentType: newMedia?.type,
    }).then((snapshot) =>
      getDownloadURL(snapshot?.ref).then((downloadURL) => downloadURL)
    );
  };

  // send message
  const sendMessage = async (e) => {
    try {
      e?.preventDefault?.();
      if (newMessage?.trim() === "" && !newMedia) return;
      setIsSending(true);
      setNewMediaPreview(null);
      const chatRoomRef = doc(db, "chatrooms", chid);
      const now = Timestamp?.now();

      let data = {
        text: newMessage,
        sender:
          user?.uid ||
          (isInstructor ? instructorData?.userUid : studentData?.userUid),
        createdAt: now,
      };

      // upload image
      if (!!newMedia) {
        const mediaLink = await uploadFile();
        data["media"] = (await mediaLink) ?? null;
        data["mediaType"] = newMedia?.type ?? null;
      }

      // remove items
      setNewMessage("");
      setNewMedia(null);

      // add message
      await updateDoc(chatRoomRef, {
        lastMessage: now,
        messages: arrayUnion(data),
      });
      setIsSending(false);

      // update last seen & send notification
      updateLastSeens();
      sendNotification();
    } catch (error) {
      setIsSending(false);
      console.warn(error);
    }
  };

  /**
   * NOTIFICATION/EMAIL FUNCTIONS
   */

  // send notification
  const sendNotification = async () => {
    try {
      const now = Timestamp?.now();
      const tenMinutesAgo = moment(now?.toDate()).subtract(10, "minutes");
      const twoMinutesAgo = moment(now?.toDate()).subtract(2, "minutes");
      const chatroom = chatRooms.find((chatroom) => chatroom?.id === chid);
      const classData = classes.find((c) => c?.id === chatroom.class);

      const student = chatroom?.student ? chatroom?.student : !isInstructor ? user.uid : null;
      const studentData = student ? await getData(student, "Users") : null;
      const instructorData = chatroom?.instructor
        ? await getData(chatroom?.instructor, "Users")
        : null;

      const targetUid = isInstructor
        ? chatroom?.student || studentData?.userUid
        : roomData?.instructor || instructorData?.userUid;

      const targetEmail = isInstructor
        ? studentData?.email
        : instructorData?.email;

      const targetName = isInstructor
        ? `${instructorData?.firstName} ${instructorData?.lastName}`
        : `${studentData?.firstName} ${studentData?.lastName}`;
      const senderName = !isInstructor
        ? `${instructorData?.firstName} ${instructorData?.lastName}`
        : `${studentData?.firstName} ${studentData?.lastName}`;

      const chatLink = `https://pocketclass.ca/chat?cid=${cid}&chid=${chid}`;

      const targetText = `You have new messages in class '${classData?.Name}' by '${targetName}'.`;

      const emailContent = `
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.5;">
                <p>Hello ${targetName},</p>

                <p>You’ve received a new message on PocketClass from <strong>${senderName}</strong> in ${classData?.Name}:</p>

                <blockquote style="border-left: 3px solid #ddd; padding-left: 10px; color: #555;">
                    ${newMessage}
                </blockquote>

                <p>To view or respond to this message, please log in to PocketClass or click the link below:</p>

                <p><a href="${chatLink}" style="color: #007bff; text-decoration: none;">View Conversation</a></p>

                <p>If you have any questions, feel free to reach out to <a href="mailto:contact@pocketclass.ca">contact@pocketclass.ca</a> or visit your PocketClass account for more details.</p>

                <p>Best regards,<br>The PocketClass Team</p>
            </body>
            </html>
        `;

      let data = {
        isRead: false,
        user: targetUid,
        text: targetText,
        createdAt: now,
        chatroom: chid,
        type: "message",
      };

      const querySnapshot = await getDocs(
        query(
          collection(db, "notifications"),
          where("chatroom", "==", chid),
          where("user", "==", targetUid)
        )
      );

      if (querySnapshot?.docs?.length > 0) {
        const notifDoc = querySnapshot?.docs?.[0];
        const notifDate = moment(notifDoc?.data()?.createdAt?.toDate());

        if (notifDate?.isBefore(twoMinutesAgo)) {
          await updateDoc(doc(db, "notifications", notifDoc?.id), data);
        }

        if (notifDate?.isBefore(tenMinutesAgo)) {
          await sendEmail(targetEmail, emailContent, now);
        }
      } else {
        await addDoc(collection(db, "notifications"), data);
        await sendEmail(targetEmail, emailContent, now);
      }
    } catch (error) {
      console.warn(error);
    }
  };

  // send email
  const sendEmail = async (targetEmail, html, now) => {
    try {
      const res = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: `Message Alert`,
          html: html,
          to: targetEmail,
        }),
      });
    } catch (error) {
      console.warn(error);
    }
  };

  return isLoading ? (
    <section className="flex justify-center items-center min-h-[100vh]">
      <Image
        priority={true}
        src="/Rolling-1s-200px.svg"
        width={"60px"}
        height={"60px"}
      />
    </section>
  ) : (
    <div className="myClassesContainer mx-auto h-screen flex flex-col">
      {/* head */}
      <Head>
        <title>Chat</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/pc_favicon.ico" />
      </Head>

      {/* header */}
      <NewHeader />

      {/* chat container */}
      <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
        {/* chat left pane */}
        <div className="w-full flex flex-col  md:w-[25%] min-w-[200px] overflow-y-auto md:border-r-2 gap-6 shadow-md md:shadow-none border-b md:border-b-0">
          <div>
            <div>
              {/* Check if chatroom has any Direct message chat room or not using filter */}

              {chatRooms?.filter(
                (chatroom) =>
                  !chatroom?.startTime &&
                  (chatroom?.messages?.length > 0 || chatroom?.id === chid)
              ).length > 0 && (
                <h1 className="text-base  mt-4 text-gray-400 font-semibold mx-4 my-2">
                  Direct Messages
                </h1>
              )}
            </div>
            {chatRooms?.map((chatroom, index) => {
              if (
                !chatroom?.startTime &&
                (chatroom?.messages?.length > 0 || chatroom?.id === chid)
              ) {
                const classData = classes.find((c) => c?.id === chatroom.class);
                const booking = bookings.find(
                  (booking) => booking?.student_id === chatroom.student
                );
                return classData?.Name ? (
                  <div
                    key={index}
                    onClick={() => {
                      setchid(chatroom.id);
                    }}
                    className={` py-4 border-gray-300 hover:bg-gray-100 ${
                      chid === chatroom.id ? " bg-gray-100 " : " bg-white"
                    } border-solid border-b cursor-pointer px-2`}
                  >
                    <h1 className="text-base mx-4 text-black font-semibold overflow-hidden whitespace-nowrap">
                      {booking?.student_name &&
                      booking?.instructor_id == user?.uid
                        ? `${booking?.student_name} - `
                        : `${classData?.instructorName} - `}
                      {classData?.Name}
                    </h1>
                    <div className="flex flex-col space-y-2 mx-2">
                      <div className="flex items-center justify-between px-2 rounded-lg">
                        <h1 className="text-sm text-gray-700">
                          {chatroom?.messages?.length > 0
                            ? chatroom?.messages?.[
                                chatroom?.messages?.length - 1
                              ]?.text
                            : "No messages"}
                        </h1>
                        <h1 className="text-xs text-gray-500">
                          {chatroom?.messages?.length > 0
                            ? moment(
                                chatroom?.messages?.[
                                  chatroom?.messages?.length - 1
                                ]?.createdAt?.toDate()
                              ).format("DD-MM-YY / hh:mm")
                            : ""}
                        </h1>
                      </div>
                    </div>
                  </div>
                ) : null;
              }
              return null; // Ensure a valid return for map()
            })}
          </div>
          <div>
            <div>
              {chatRooms?.filter(
                (chatroom) =>
                  chatroom?.startTime &&
                  (chatroom?.messages?.length > 0 || chatroom?.id === chid)
              ).length > 0 && (
                <h1 className="text-base  mt-4 text-gray-400 font-semibold mx-4 my-2">
                  Group Messages
                </h1>
              )}
            </div>
            {chatRooms?.map((chatroom, index) => {
              if (
                chatroom?.startTime &&
                (chatroom?.messages?.length > 0 || chatroom?.id === chid)
              ) {
                const classData = classes.find((c) => c?.id === chatroom.class);
                return classData?.Name ? (
                  <div
                    key={index}
                    onClick={() => {
                      setchid(chatroom.id);
                    }}
                    className={` py-4 border-gray-300 hover:bg-gray-100 ${
                      chid === chatroom.id ? " bg-gray-100 " : " bg-white"
                    } border-solid border-b cursor-pointer px-2`}
                  >
                    <h1 className="text-base mx-4 text-black font-semibold overflow-hidden whitespace-nowrap">
                      {moment
                        .utc(chatroom?.startTime)
                        .format("DD/MM/YY, HH:MM")}{" "}
                      - {classData?.Name}
                    </h1>
                    <div className="flex flex-col space-y-2 mx-2">
                      <div className="flex items-center justify-between px-2 rounded-lg">
                        <h1 className="text-sm text-gray-700">
                          {chatroom?.messages?.length > 0
                            ? chatroom?.messages?.[
                                chatroom?.messages?.length - 1
                              ]?.text
                            : "No messages"}
                        </h1>
                        <h1 className="text-xs text-gray-500">
                          {chatroom?.messages?.length > 0
                            ? moment(
                                chatroom?.messages?.[
                                  chatroom?.messages?.length - 1
                                ]?.createdAt?.toDate()
                              ).format("DD-MM-YY / hh:mm")
                            : ""}
                        </h1>
                      </div>
                    </div>
                  </div>
                ) : null;
              }
              return null;
            })}
          </div>
        </div>

        <div className="flex-1 md:flex-auto w-full md:w-[75%] bg-gray-50 flex flex-col overflow-hidden">
          {/* messages */}
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide scroll-smooth">
            {/* start conversation */}
            {selectedClassData && (
              <div className="sticky top-0 z-10 bg-white shadow-md">
                <div className="flex w-full flex-col items-center justify-center py-3">
                  <div className="text-sm w-full md:text-base mx-auto text-gray-700 px-4 rounded-full cursor-default">
                    <span className="font-semibold">
                      {isInstructor
                        ? groupStudents
                            .map((student) => student.name)
                            .join(", ")
                        : selectedClassData?.instructorName}
                    </span>{" "}
                    -{" "}
                    <span>
                      {selectedClassData?.Name}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col py-3 px-6 md:py-6 overflow-y-auto scrollbar-hide scroll-smooth">
              <div className="text-sm md:text-base w-fit mx-auto bg-gray-200 text-gray-700 py-0.5 px-4 mb-3 rounded-full cursor-default shadow-md">
                Start Conversation
              </div>

              {/* messages */}
              <FlipMove className="flex flex-col" enterAnimation="elevator">
                {(classData?.groupType == "group"
                  ? groupMessages
                  : messages
                )?.map?.((message, index) => (
                  <Message
                    message={message}
                    userId={user?.uid}
                    key={index}
                    groupStudents={groupStudents}
                    isInstructor={isInstructor}
                    instructorId={
                      classes.find(
                        (classItem) =>
                          chatRooms.find((chatRoom) => chatRoom.id === chid)
                            ?.class === classItem.id
                      )?.classCreator
                    }
                  />
                ))}
              </FlipMove>

              {/* bottom ref */}
              <div ref={bottomRef} className="h-5 w-full" />
            </div>
          </div>

          {/* input message */}
          <div className="w-full flex p-2 relative">
            {/* media preview */}
            <div
              className={`absolute left-0 bottom-full w-[80%] sm:w-96 bg-gray-200 rounded-2xl mx-2 shadow-md overflow-hidden p-4 flex flex-col ${
                !!newMedia ? "" : "!hidden"
              }
							${!!newMediaPreview ? "aspect-square sm:aspect-auto sm:h-80" : ""}
							`}
            >
              {/* selected files */}
              <div className="flex items-center mb-2">
                <h1 className="text-gray-700 font-medium">Selected File</h1>
                {/* remove button */}
                <button
                  onClick={() => {
                    setNewMedia(null);
                    setNewMediaPreview(null);
                  }}
                  className="ml-auto p-1 text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              {!!newMediaPreview && (
                <MediaDisplay link={newMediaPreview} type={newMedia?.type} />
              )}

              {/* file name */}
              <h1 className="mt-1 text-gray-700 font-medium text-sm break-words">
                {newMedia?.name ?? ""}
              </h1>
            </div>

            {/* input bar */}
            <div className="flex-1 flex rounded-full bg-white border border-gray-300 shadow overflow-hidden">
              <form className="flex-1" onSubmit={(e) => sendMessage(e)}>
                <input
                  type="text"
                  placeholder="Write a message ..."
                  className="w-full px-5 py-3 border-0 !outline-0 !ring-0 text-gray-700"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  readOnly={isSending}
                />
              </form>

              <div className="relative my-auto h-full md:mx-1 md:h-10 w-16 rounded-full bg-slate-100 flex items-center justify-center hover:opacity-80 ease-in-out cursor-pointer">
                <Image
                  priority={true}
                  src="/attach.png"
                  alt="attach_img"
                  className="h-6 object-contain"
                  width={"24px"}
                  height={"24px"}
                />
                <AddMedia
                  setMediaPreview={setNewMediaPreview}
                  setMedia={setNewMedia}
                />
              </div>
            </div>

            {/* send button */}
            <button
              onClick={(e) => sendMessage(e)}
              className="bg-logo-red text-white rounded-full ml-4 px-4 md:px-10 md:text-lg
							hover:opacity-80 ease-in-out duration-300 disabled:grayscale-[50%]
							"
              disabled={(newMessage.trim() === "" && !newMedia) || isSending}
            >
              <div
                className={`border-t-2 m-auto border-white rounded-full animate-spin h-6 w-6 ${
                  !isSending && "hidden"
                }`}
              />
              <span className={`${isSending && "hidden"}`}>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;

// Message Card
const Message = React.forwardRef(
  ({ message, userId, groupStudents, isInstructor, instructorId }, ref) => {
    const isMyMessage = message?.sender === userId;

    const messageSender = groupStudents?.find(
      (item) => item?.userUid == message?.sender
    );
    const hasMedia = !!message?.media;

    return (
      <div
        ref={ref}
        className={`my-2 cursor-default max-w-[90%] ${
          isMyMessage ? "ml-auto flex flex-col items-end" : "mr-auto"
        }`}
      >
        <div
          className={`text-lg w-fit px-5 py-2 rounded-3xl 
				hover:opacity-80
				${
          isMyMessage
            ? "rounded-br-none bg-logo-red text-white"
            : "rounded-bl-none bg-gray-300 text-gray-700"
        }`}
        >
          {!!hasMedia && (
            <div className="max-w-xs max-h-xs md:max-w-sm md:max-h-sm overflow-hidden px-1 py-3">
              <MediaDisplay
                link={message?.media}
                type={message?.mediaType}
                isMessage={true}
                isMyMessage={isMyMessage}
              />
            </div>
          )}

          <h1>{message?.text ?? ""}</h1>
        </div>

        <h1
          className={`text-[10px] text-gray-400 flex ${
            isMyMessage && "flex-row-reverse"
          }`}
        >
          <span className="font-bold capitalize">
            &nbsp;
            {isMyMessage
              ? ". You"
              : messageSender
              ? `. ${messageSender?.firstName}`
              : message?.sender != instructorId
              ? ". from Student"
              : ". from Instructor"}
          </span>
          <span className="ml-2">
            {moment(message?.createdAt?.toDate?.())?.format?.(
              "DD-MM-YY / hh:mm"
            )}
          </span>
        </h1>
      </div>
    );
  }
);
