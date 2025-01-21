import { Button } from "@mui/base";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import ClassLocationMap from "../../components/ClassLocationMap";

function DynamicButtonSection({
  classId,
  classData,
  instructorId,
  below = false,
}) {
  const [user] = useAuthState(auth);
  const router = useRouter();

  const handleChatButton = async () => {
    if (!user) {
      toast.warning("Please login to chat with instructor");
      return;
    }

    const now = Timestamp.now();
    const tenMinutesAgo = new Date(now.toMillis() - 10 * 60 * 1000);

    const studentId = user.uid;
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
  };

  const scrollToBookings = () => {
    const element = document.getElementById("booking");
    element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex justify-center items-stretch flex-col grow-0 shrink-0 basis-auto">
      <Button
        style={below ? { margin: "auto", width: "60%" } : {}}
        onClick={() =>
          scrollToBookings()
        }
        className="bg-[#261f22] [font-family:Inter,sans-serif] text-base font-semibold text-[white] w-full h-[45px] cursor-pointer block box-border grow-0 shrink-0 basis-auto rounded-[100px] border-[none] transition-all duration-300 ease-in-out hover:bg-[#3d3438] hover:shadow-lg hover:scale-105"
      >
        <span className="[font-family:Inter,sans-serif] text-base font-semibold">
          Booking schedule
        </span>
      </Button>
      <Button
        style={below ? { margin: "auto", width: "60%", marginTop: "1rem" } : {}}
        onClick={handleChatButton}
        className="mb-[1rem] mt-2 bg-transparent [font-family:Inter,sans-serif] text-base font-semibold text-[#261f22] w-full h-[45px] cursor-pointer block box-border grow-0 shrink-0 basis-auto rounded-[100px] border-2 border-solid border-[#261f22] transition-all duration-300 ease-in-out hover:bg-[#f8f8f8] hover:shadow-md hover:scale-105"
      >
        Send message
      </Button>

      {classData && (
        <div className="mb-8">
          {/* <h3 className="text-lg font-bold mb-4">Location</h3> */}
          <ClassLocationMap
            longitude={classData.longitude}
            latitude={classData.latitude}
            address={classData.Address}
          />
        </div>
      )}
    </div>
  );
}

export default DynamicButtonSection;
