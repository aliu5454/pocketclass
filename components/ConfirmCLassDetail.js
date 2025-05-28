import * as React from "react";
import moment from "moment";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/router";

export function ConfirmBookingDetails({ bookingDetails, id }) {
  const router = useRouter();
  const startTime = bookingDetails?.startTime ? moment.utc(bookingDetails.startTime) : null;
  const endTime = bookingDetails?.endTime ? moment.utc(bookingDetails.endTime) : null;

  return (
    <div className="w-[100%] max-md:w-full">
      <div className='w-full'>
        <div className='mb-6 w-full flex flex-wrap justify-between'>
          <h2 className=" mb-4 text-2xl font-bold leading-8 text-stone-800">
            Your class details
          </h2>
          <button onClick={() => router.push(`/classes/id=${id}`)} className="px-6 py-3.5 mt-4 text-base font-semibold text-white cursor-pointer bg-stone-800 relative top-[-24px] rounded-[100px]">
            Go to class
          </button>
        </div>
        <div className="w-full md:flex-row flex-col flex gap-6">
          <div className="min-w-[200px] w-[30%]">
            <div>
              <div className="text-lg font-bold leading-7 text-stone-800">
                {bookingDetails?.Name}
              </div>
              <div
                className={`mt-1 mb-4 text-sm font-medium text-neutral-400 ${bookingDetails?.meetingLink ? "cursor-pointer" : ""}`}
              >
                {bookingDetails?.Mode === "Online"
                  ? bookingDetails?.meetingLink || "Online Class"
                  : bookingDetails?.Address
                    ? `${bookingDetails.Address}`
                    : "Location not available"}
              </div>
              <div className="text-lg font-bold leading-7 text-stone-800">
                Category
              </div>
              <div
                className={`mt-1 text-sm font-medium text-neutral-400`}
              >
                {bookingDetails?.Category || "Category not available"}
              </div>
              <div className="text-lg font-bold leading-7 text-stone-800">
                Sub Category
              </div>
              <div
                className={`mt-1 text-sm font-medium text-neutral-400`}
              >
                {bookingDetails?.SubCategory || " Sub Category not available"}
              </div>
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-stone-800">
              About:
            </div>
            {bookingDetails?.About || "No details available."}
          </div>
        </div>
      </div>
    </div>
  );
}
