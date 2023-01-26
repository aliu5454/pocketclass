import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router';

function Banner() {
  const router = useRouter();

  const handleButtonClick = () => {
    router.push({
      pathname: '/search',
      query: {
        searchInput: 'all',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        noOfGuests: 1
      },
    });
  }
  return (
    <div className='relative h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px] 2xl:h-[700px]'>
        <Image src="/airbnb-hero.jpeg" //https://links.papareact.com/0fm
        layout="fill" objectFit="cover"/>

        <div className='absolute top-1/2 w-full text-center'>
            <p className='text-xl font-sans sm:text-7xl font-extrabold text-logo-red'>UNLOCK YOUR POTENTIAL</p>
            <button onClick={() => handleButtonClick()} className='text-white bg-logo-red px-10 py-4 shadow-md rounded-full font-bold my-8 hover:shadow-2xl hover:scale-105 active:scale-90 transition duration-150'>Explore Classes</button>
        </div>
    </div>
  )
}

export default Banner