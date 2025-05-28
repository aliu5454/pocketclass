import * as React from "react";
import { useRouter } from "next/router";

export function BookingSuccess() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center px-5 py-0 mt-12 max-w-full text-center w-[916px] max-md:px-8 max-md:py-0 max-md:w-full max-sm:px-4 max-sm:py-0">
      <img
        src="/assets/TickMark.svg"
        alt="Success checkmark"
        className="mb-8 w-16 h-16"
      />
      <div>
        <h1 className="mb-4 text-3xl font-bold leading-10 text-black max-sm:text-2xl max-sm:leading-8">
          Congratulations! Your class is live!
        </h1>
        <p className="mb-4 text-base font-medium leading-6 text-black">
          You're all set to enjoy your PocketClass experience. If you have any questions or need assistance, feel free to reach out to our support team.
        </p>
        <p className="mb-4 text-base font-medium leading-6 text-black">
          Thank you for choosing PocketClass—let the learning journey begin!
        </p>
        <button onClick={() => router.push("/")} className="px-6 py-3.5 mt-4 text-base font-semibold text-white cursor-pointer bg-stone-800 rounded-[100px]">
          Back to Home
        </button>
      </div>
    </div>
  );
}