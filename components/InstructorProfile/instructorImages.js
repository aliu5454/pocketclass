"use client";

import React from "react";
import Image from "next/image";

export default function InstructorImage({ instructorData, onMessageClick }) {
  return (
    <>
      <div className="relative w-full mx-auto">
        {/* Cover Photo */}
        <div className="h-40 md:h-40 w-full bg-gray-300 overflow-hidden relative">
          {instructorData?.images?.[0] ? (
            <Image
              src={instructorData.images[0]}
              alt="Cover"
              layout="fill"
              objectFit="cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300" />
          )}
        </div>

        {/* Profile Photo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-12">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center">
            {instructorData?.profileImage ? (
              <Image
                src={instructorData?.profileImage}
                alt="Profile"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <svg
                className="w-16 h-16 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
          {instructorData?.firstName || "Instructor"}{" "}
          {instructorData?.lastName || ""}
        </h2>
      </div>

      {/* Message Button */}
      <div className="relative w-full max-w-5xl mx-auto">
        <button
          className="absolute right-4 -top-5 md:-top-16 md:right-8 z-10 
               bg-[#303030] text-white px-4 py-2 md:px-6 md:py-3 rounded 
               text-sm md:text-base font-medium shadow-lg 
               md:rounded-md 
               transition-all duration-300
               md:flex md:items-center 
               hidden md:inline-flex"
          onClick={onMessageClick}
        >
          Message {instructorData?.firstName || ""}{" "}
          {instructorData?.lastName || ""}
        </button>

        {/* Floating Circular Button for Mobile */}
        <button
          className="fixed bottom-6 right-6 z-50 bg-black text-white 
               p-4 rounded-full shadow-lg md:hidden"
          onClick={onMessageClick}
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.524 0-2.95-.356-4.168-.98L3 20l1.48-4.35C3.554 14.74 3 13.415 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            ></path>
          </svg>
        </button>
      </div>
    </>
  );
}
