import NewHeader from "../../components/NewHeader";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { collection, doc as firestoreDoc, getDocs, where, addDoc, query, getDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { toast } from "react-toastify";
import Head from "next/head";
import { UserCircleIcon } from "@heroicons/react/solid";
import { useAuthState } from "react-firebase-hooks/auth";

function MyClasses() {
    const [userData, setUserData] = useState([]);
    const [loading, setLoading] = useState(true); // Start with loading set to true
    const router = useRouter();
    const { id } = router.query;
    const [user, loadingUser] = useAuthState(auth); // Use `loadingUser` to check if Firebase is checking auth state

    useEffect(() => {
        // Handle the case when `user` is null or loading
        if (loadingUser) {
            return; // Don't do anything until the auth state is loaded
        }
        if (!user) {
            toast.error("Please login to see this section");
            setTimeout(() => {
                router.push('/Login');
            }, 1000);
            return;
        }
        if(user.uid.trim()!==String(id).trim()){
            toast.warning("The information you are trying to access does not belong to you!")
            setTimeout(() => {
                router.push('/');
            }, 1000);
            return;
        }
        // If the user is logged in, fetch user info
        if (id) {
            getUserInfo(id);
        }
    }, [id, user, loadingUser, router]);

    const getUserInfo = async (id) => {
        const q = query(collection(db, "Bookings"), where("instructor_id", "==", id));
        const querySnapshot = await getDocs(q);
        let data = [];
    
        const studentPromises = [];
        const classPromises = [];
    
        querySnapshot.docs.forEach(docSnapshot => {
            const userDataItem = { id: docSnapshot.id, ...docSnapshot.data() };
    
            if (userDataItem.student_id) {
                const studentRef = firestoreDoc(db, "Users", userDataItem.student_id);
                studentPromises.push(getDoc(studentRef).then(studentSnap => {
                    if (studentSnap.exists()) {
                        userDataItem.studentDetails = studentSnap.data();
                    } else {
                        userDataItem.studentDetails = {};
                    }
                }));
            }
    
            if (userDataItem.class_id) {
                const classRef = firestoreDoc(db, "classes", userDataItem.class_id);
                classPromises.push(getDoc(classRef).then(classSnap => {
                    if (classSnap.exists()) {
                        userDataItem.classDetails = classSnap.data();
                    } else {
                        userDataItem.classDetails = {};
                    }
                }));
            }
    
            data.push(userDataItem);
        });
    
        await Promise.all([...studentPromises, ...classPromises]);
    
        // Create a map to store unique users based on email
        const uniqueUsersMap = new Map();
    
        data.forEach((item) => {
            const email = item.groupEmails && item.groupEmails.length > 0 ? item.groupEmails[0] : null;
    
            if (email) {
                // If email exists, ensure uniqueness by keeping only the latest entry based on startTime
                if (!uniqueUsersMap.has(email) || new Date(item.startTime) > new Date(uniqueUsersMap.get(email).startTime)) {
                    uniqueUsersMap.set(email, item);
                }
            } else {
                // If no email, include all such entries (keep as they are)
                uniqueUsersMap.set(Symbol(), item); // Use a unique symbol to prevent overwriting
            }
        });
    
        // Convert map back to array and sort by startTime in descending order
        const sortedData = Array.from(uniqueUsersMap.values()).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
        setUserData(sortedData);
        setLoading(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);

        const options = { month: 'long' };
        const month = date.toLocaleString('en-US', options);
        const day = date.getDate();

        const getDaySuffix = (day) => {
            if (day > 3 && day < 21) return 'th';
            switch (day % 10) {
                case 1: return 'st';
                case 2: return 'nd';
                case 3: return 'rd';
                default: return 'th';
            }
        };

        return `${month} ${day}${getDaySuffix(day)}`;
    };

    const chat = async(classId,studentId,instructorId,user)=>{
        const now = Timestamp.now();
        const tenMinutesAgo = new Date(now.toMillis() - 10 * 60 * 1000);

        const newChatRoomData = {
        instructor: instructorId,
        student: studentId,
        class: classId,
        messages: [],
        createdAt: Timestamp.now(),
        lastMessage: Timestamp.fromDate(tenMinutesAgo),
        };

        try {
        // Check if chatroom exists
        const chatRoomRef = collection(db, "chatrooms");
        const q = query(
            chatRoomRef,
            where("student", "==", studentId),
            where("instructor", "==", instructorId),
            where("class", "==", classId)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            router.push({
            pathname: "/chat",
            query: {
                cid: classId,
                chid: querySnapshot.docs[0].id,
            },
            });
            return;
        }

        // Create new chatroom if none exists
        const newChatRoomRef = await addDoc(chatRoomRef, newChatRoomData);
        router.push({
            pathname: "/chat",
            query: {
            cid: classId,
            chid: newChatRoomRef.id,
            },
        });
        } catch (error) {
        toast.error("Chat loading error!");
        console.warn(error);
        }
    }

    return (
        <div className="overflow-hidden">
            <Head>
                <title>My Students</title>
                <meta name="description" content="Update your profile" />
                <link rel="icon" href="/pc_favicon.ico" />
            </Head>
            <NewHeader />
            <h1 className="px-[2%]">Your Students</h1>
            <p className="mb-4 px-[2%]">A list of student's information to keep track of their details, bookings, and more.</p>
            <div className="px-[2%] rounded-3xl flex flex-col justify-center items-start flex-wrap overflow-x-scroll scrollbar-hide w-[99vw]">
                {loading ? (
                    <div className="w-full h-[60vh] flex flex-col justify-center">
                        <div className=" flex flex-col justify-center items-start flex-wrap overflow-x-scroll scrollbar-hide w-[100%] mb-1">
                            <table className="w-[100%] min-w-[800px] border-spacing-8">
                                <thead style={{ borderBottom: '3px solid #B6B6B6' }}>
                                    <tr className="border-spacing-2">
                                        <th className="flex pb-2 pl-4 pr-8">Name</th>
                                        <th className="text-left pb-2 pr-8">Email</th>
                                        <th className="text-left pb-2 pr-8">Most Recent Class Booked</th>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                        <div className="w-full min-w-[800px]">
                            <div className="skeleton-loader animate-pulse bg-gray-800/20 h-[50vh] w-[100%] rounded-lg"></div>
                        </div>
                    </div>
                ) : userData.length === 0 ? (
                    <p className="w-[100%] h-[50vh] flex justify-center items-center text-gray-500">No student available</p>
                ) : (
                    <table className="w-[100%] min-w-[800px] border-spacing-8">
                        <thead style={{ borderBottom: '3px solid #B6B6B6' }}>
                            <tr className="border-spacing-2">
                                <th className="flex pb-2 pl-4 pr-8">Name</th>
                                <th className="text-left pb-2 pr-8">Email</th>
                                <th className="text-left pb-2 pr-8">Most Recent Class Booked</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userData.map((user) => (
                                <tr key={user.id} className="border-b border-b-[#B6B6B6]">
                                    <td className="items-center transform translate-x-[-5px] pb-1 pt-1 pl-4 flex pr-4 whitespace-nowrap">
                                        {user.studentDetails.photoURL || user.studentDetails.profileImage ? (
                                            <img
                                                src={user.studentDetails.profileImage || user.studentDetails.photoURL}
                                                className="rounded-full cursor-pointer shrink-0 w-9 h-9 md:w-9 md:h-9 inline mr-4"
                                            />
                                        ) : (
                                            <UserCircleIcon className="h-10 cursor-pointer inline mr-4" />
                                        )}
                                        <p>{user.student_name || user.studentDetails.firstName +  " " + user.studentDetails.lastName || "User"}</p>
                                    </td>
                                    <td className="pb-1 pt-1 pr-8">
                                        { user.studentDetails.email || user.groupEmails[0]
                                            || 'No Email Available'}
                                    </td>
                                    <td className="pb-1 pt-1 pr-[15px] w-[35%]">
                                        {user.classDetails.Name || 'Class'} @{" "}
                                        {user.startTime ? formatDate(user.startTime) : 'No Date Available'}
                                    </td>
                                    <td className="text-[#DD4328] font-bold pb-1 pt-1 pl-[1px] w-[80px] cursor-pointer" onClick={()=>chat(user.class_id,user.student_id,user.instructor_id,user)}>Message</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default MyClasses;
