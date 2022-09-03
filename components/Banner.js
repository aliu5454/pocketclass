import React from 'react'
import Image from 'next/image'
// import Router, { useRouter } from 'next/router';

function Banner() {
  // const router = useRouter();
  // const returnAllClasses = () => {
  //   router.push({
  //     pathname: '/search',
  //     query:{
  //         location: searchInput,
  //         startDate: startDate.toISOString(),
  //         endDate: endDate.toISOString(),
  //         noOfGuests,
  //     }
  // });
  // }
  return (
    <div className='relative h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[600px] 2xl:h-[700px]'>
        <Image src="https://links.papareact.com/0fm" 
        layout="fill" objectFit="cover"/>

        <div className='absolute top-1/2 w-full text-center'>
            <p className='text-sm sm:text-lg'>A one-stop shop for all your extracurriculars.</p>
            <button className='text-logo-red bg-white px-10 py-4 shadow-md rounded-full font-bold my-3 hover:shadow-2xl active:scale-90 transition duration-150'>Explore Classes</button>
        </div>
    </div>
  )
}

export default Banner