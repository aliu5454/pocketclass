import React from 'react'

function Footer() {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-y-10 px-32 py-14 bg-gray-100 text-gray-600'>
        <div className='text-center space-y-4 text-xs text-gray-800'>
            <h5 className='font-bold'>ABOUT</h5>
            <p>How pocketclass works</p>
            <p>Out Story</p>
            <p>Join Our Team</p>
        </div>
        <div className='text-center space-y-4 text-xs text-gray-800'>
            <h5 className='font-bold'>COMMUNITY</h5>
            <p>Instructor Guide</p>
            <p>Student Guide</p>
            <p>Terms and Conditions</p>
        </div>
        <div className='text-center space-y-4 text-xs text-gray-800'>
            <h5 className='font-bold'>SUPPORT</h5>
            <p>Contact Us</p>
            <p>Help Center</p>
            <p>Trust & Safety</p>
        </div>
    </div>
  )
}

export default Footer