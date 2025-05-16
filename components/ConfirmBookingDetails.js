import * as React from "react";
import moment from "moment";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export function ConfirmBookingDetails({ bookingDetails }) {
  // Get Class Details
  const [classDetails, setClassDetails] = React.useState(null);
  React.useEffect(() => {
    if (!bookingDetails) return;
    const fetchClassDetails = async () => {
      try {
        const docRef = doc(db, "classes", bookingDetails?.class_id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          console.log(docSnap.data());
          setClassDetails(docSnap.data());
        }
      } catch (error) {
        console.log(error);
      }
    };
    console.log(bookingDetails);
    fetchClassDetails();
  }, [bookingDetails]);

  const startTime = bookingDetails?.startTime ? moment.utc(bookingDetails.startTime) : null;
  const endTime = bookingDetails?.endTime ? moment.utc(bookingDetails.endTime) : null;

  return (
    <div className="w-[39%] max-md:w-full">
      <div>
        <h2 className="mb-6 text-2xl font-bold leading-8 text-stone-800">
          Your booking details
        </h2>
        <div className="flex gap-6">
          <div className="w-24 text-base font-bold text-stone-800">
            {startTime ? startTime.format("DD MMM, YYYY") : "Date not available"}
          </div>
          <div>
            <div className="text-base font-medium text-stone-800">
              {startTime ? startTime.format("dddd, hh:mm A") : "--"} - {endTime ? endTime.format("hh:mm A") : "--"}
            </div>
            <div className="text-base text-stone-800">
              {bookingDetails?.timeZone || "America/Toronto"}
            </div>
            <div>
              <div className="mt-2 text-lg font-bold leading-7 text-stone-800">
                {classDetails?.Name}
              </div>
              <div
                onClick={() => {
                  if (bookingDetails?.meetingLink) {
                    window.open(bookingDetails?.meetingLink, "_blank");
                  }
                }}
                className={`mt-1 text-sm font-medium text-neutral-400 ${bookingDetails?.meetingLink ? "cursor-pointer" : ""}`}
              >
                {classDetails?.Mode === "Online"
                  ? bookingDetails?.meetingLink || "Online Class"
                  : classDetails?.Location}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
