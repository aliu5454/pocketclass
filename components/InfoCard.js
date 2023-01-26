import React from "react";
import Image from "next/image";
import { HeartIcon } from "@heroicons/react/outline";
import { StarIcon, MapPinIcon } from "@heroicons/react/solid";
import { useRouter } from "next/router";

function InfoCard({
  type,
  latitude,
  id,
  name,
  images,
  description,
  longitude,
  reviews,
  address,
  price,
  category,
}) {
  const router = useRouter()
  const handleSmallCardClick = () => {
    router.push({
      pathname: '/classes',
      query: {
        id: id
      },
    });
  }

  let currentClassReview = reviews.filter((rev) => rev[0].classID === id)
  let averageReview = 0;

  if (currentClassReview.length !== 0) {
    currentClassReview.map(rv => {
      averageReview = averageReview + rv[0].qualityRating + rv[0].recommendRating + rv[0].safetyRating
    })

    averageReview = averageReview / (currentClassReview.length * 3)

  }

  return (
    <div className="flex py-7 px-2 border-b cursor-pointer hover:opacity-80 hover:shadow-lg pr-4 transition duration-200 ease-out first:border-t min-w-[100%] "
      onClick={() => handleSmallCardClick()}
    >
      <div className="relative h-24 w-40 md:h-52 md:w-80 flex-shrink-0">
        <Image
          src={images?.length ? images[0] : images}
          layout="fill"
          unoptimized
          objectFit="cover"
          className="rounded-xl"
        />
      </div>

      <div className="flex flex-col flex-grow pl-5">
        <div className="flex justify-between">
          {/* <p>{`Lat: ${latitude} Lon: ${longitude}`}</p> */}
          <h4 className="text-xl">{name}</h4>
          <HeartIcon className="h-7 cursor-pointer" />
        </div>

        <div className="flex-row">
          <div className='mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6'>
            <div className="mt-2 flex items-center text-sm text-gray-500">
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
              {type}
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <svg
                class="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#58C18E"
                aria-hidden="true"
              >
                <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152z" />
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-6a.75.75 0 01.75.75v.316a3.78 3.78 0 011.653.713c.426.33.744.74.925 1.2a.75.75 0 01-1.395.55 1.35 1.35 0 00-.447-.563 2.187 2.187 0 00-.736-.363V9.3c.698.093 1.383.32 1.959.696.787.514 1.29 1.27 1.29 2.13 0 .86-.504 1.616-1.29 2.13-.576.377-1.261.603-1.96.696v.299a.75.75 0 11-1.5 0v-.3c-.697-.092-1.382-.318-1.958-.695-.482-.315-.857-.717-1.078-1.188a.75.75 0 111.359-.636c.08.173.245.376.54.569.313.205.706.353 1.138.432v-2.748a3.782 3.782 0 01-1.653-.713C6.9 9.433 6.5 8.681 6.5 7.875c0-.805.4-1.558 1.097-2.096a3.78 3.78 0 011.653-.713V4.75A.75.75 0 0110 4z"
                  clip-rule="evenodd"
                />
              </svg>
              {price}
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <svg
              class="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="#E73F2B"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                clip-rule="evenodd"
              />
            </svg>
            {address}
          </div>
        </div>

        <div className="border-b w-10 pt-2" />
        <p className="pt-2 text-sm text-gray-500 flex-grow">{description}</p>

        <div className="flex justify-between items-end pt-5">
          <p className="flex">
            <StarIcon className="h-5 text-logo-red" />
            {
              currentClassReview.length !== 0 ? Math.round(averageReview) + ".0" : "N/A"
            }
          </p>

          <div>
            {/* <p className='text-lg font-semibold pb-2 lg:text-2xl'>{price}</p> */}
            {/* <p className='text-right font-extralight'>{total}</p> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfoCard;
