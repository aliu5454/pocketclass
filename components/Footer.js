import React from 'react'
import Link from 'next/link';

function Footer() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-y-10 px-32 py-14 bg-gray-100 text-gray-600' style={{ position: 'relative', zIndex: "100" }}>
        <div className='text-center space-y-4 text-xs text-gray-800'>
            <h5 className='font-bold'>ABOUT</h5>
            <p>How pocketclass works</p>
            <p className='hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150'><Link href="/community/aboutus">About Us</Link></p>
            <p>Join Our Team</p>
        </div>
        <div className='text-center space-y-4 text-xs text-gray-800'>
            <h5 className='font-bold'>COMMUNITY</h5>
            <p className='hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150'><Link href="/community/instructorguide">Instructor Guide</Link></p>
            <p className='hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150'><Link href="/community/studentguide">Student Guide</Link></p>
            <p className='hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150'><Link href="/community/termsandconditions">Terms and Conditions</Link></p>
        </div>
        <div className='text-center space-y-4 text-xs text-gray-800'>
            <h5 className='font-bold'>SUPPORT</h5>
            <p>Contact Us</p>
            <p>Help Center</p>
            <p className='hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150'><Link href="/community/cancellationpolicy">Cancellation Policy</Link></p>
        </div>
    </div>
  )
}

export default Footer