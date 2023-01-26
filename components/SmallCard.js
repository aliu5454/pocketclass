import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router';

function SmallCard({ img, type, category }) {
  const router = useRouter()
  const handleSmallCardClick = () => {
    router.push({
      pathname: '/search',
      query: {
        searchInput: type,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        noOfGuests: 1
      },
    });
  }

  return (
    <div className='flex items-center m-2 mt-5 rounded-xl cursor-pointer space-x-4 hover:bg-gray-100 hover:scale-105 transition transform duration-200 ease-out' onClick={() => handleSmallCardClick()}>
      {/* Left */}
      <div className='relative h-16 w-16'>
        <Image src={img} layout="fill" className='rounded-lg' unoptimized />
      </div>

      {/* Right */}
      <div>
        <h2>{type}</h2>
        <h3 className='text-gray-500'>{category}</h3>
      </div>
    </div>
  )
}

export default SmallCard