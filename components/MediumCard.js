import React from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { StarIcon } from "@heroicons/react/solid";

function MediumCard({
  id,
  img,
  name,
  reviews,
  type,
  description,
  ratings,
  address,
  price,
  category,
}) {
  const router = useRouter();

  const classSearch = () => {
    router.push({
      pathname: "/classes",
      query: {
        id: id,
      },
    });
  };

  let currentClassReview = reviews.filter((rev) => rev[0].classID === id)
  let averageReview = 0;

  if (currentClassReview.length !== 0) {
    currentClassReview.map(rv => {
      averageReview = averageReview + rv[0].qualityRating + rv[0].recommendRating + rv[0].safetyRating
    })

    averageReview = averageReview / (currentClassReview.length * 3)

  }
  
  return (
    <div
      onClick={classSearch}
      className="cursor-pointer hover:scale-105 transform transition duration-300 ease-out"
    >
      <div className="relative h-80 w-80">
        <Image priority={true} src={img} layout="fill" className="rounded-xl" unoptimized />
      </div>
      <div>

        <div className="flex mt-3">
          <svg
            class="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="#AF816C"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z"
              clip-rule="evenodd"
            />
            <path d="M3 15.055v-.684c.126.053.255.1.39.142 2.092.642 4.313.987 6.61.987 2.297 0 4.518-.345 6.61-.987.135-.041.264-.089.39-.142v.684c0 1.347-.985 2.53-2.363 2.686a41.454 41.454 0 01-9.274 0C3.985 17.585 3 16.402 3 15.055z" />
          </svg>
          <h3 className="text-l">{name}</h3>
          
        </div>
        <p className="flex">
            <StarIcon className="h-5 text-logo-red" />
            {
              currentClassReview.length !== 0 ? Math.round(averageReview) + ".0" : "N/A"
            }
          </p>
      </div>
    </div>
  );
}

export default MediumCard;
