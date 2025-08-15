"use client";
import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebaseConfig";
import { toast } from "react-toastify";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useRouter } from "next/router";

const FAQAccordion = ({ instructorId, classId}) => {
  const [openIndex, setOpenIndex] = useState(null);
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

  const faqs = [
    {
      question: "How Do I Ask A Question?",
      answer: (
        <span>
          Have a question? We're here to help! Simply click the "Send a Message" button to reach out to your instructor or{" "}
          <button
            onClick={handleChatButton}
            className="text-blue-500 underline cursor-pointer hover:text-blue-600 transition-colors duration-200"
          >
            Contact Us
          </button>. 
          Our team is available to assist you in finding the right instructor and answering any inquiries.
        </span>
      ),
    },
    {
      question: "What Can I Expect During a Typical Lesson?",
      answer:
        "Your instructor will personalize each lesson to match your skill level, guiding you through key techniques, hands-on practice with real-time feedback, and strategic insights to enhance your overall learning experience.",
    },
    {
      question: "How Many Lessons Should I Take?",
      answer:
        "The number of lessons you need depends on your goals—start with a 3-lesson pack for a solid foundation or choose a 10-lesson pack for steady progress and long-term improvement.",
    },
    {
      question: "Can I Take Lessons with Friends or Family?",
      answer:
        "Yes! Group lessons are a fun and cost-effective way to learn together. Instructors have specific time slots and pricing for group lessons. You can directly view group timeslots in the instructor schedule, or contact your instructor to request a larger group session for a specific time!",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="mx-auto p-6 px-0 my-4 rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <button
              className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
                openIndex === index ? 'bg-gray-50/80' : ''
              }`}
              onClick={() => toggleFAQ(index)}
            >
              <h4 className="font-semibold text-gray-900 pr-4">{faq.question}</h4>
              <div className="flex-shrink-0">
                {openIndex === index ? (
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-[500px]' : 'max-h-0'
              }`}
            >
              <div className="px-6 pb-4 text-gray-700 leading-relaxed">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQAccordion;
