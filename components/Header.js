import React from 'react'
import Image from 'next/image';
import { SearchIcon,GlobeAltIcon,MenuIcon,UserCircleIcon,UsersIcon } from '@heroicons/react/solid';

function Header() {
  return (
    <header className='sticky top-0 z-50 grid grid-cols-3 bg-white shadow-md p-5 md:px-10'>
        {/* left */}
        <div className='relative flex items-center h-10 cursor-pointer my-auto'>
            <Image 
                src="/pc_logo3.png"
                layout='fill'
                objectFit="contain" 
                objectPosition="left"
            />
        </div>

        {/* middle - search*/}
        <div className='flex items-center md:border-2 rounded-full py-2 md:shadow-sm'>
            <input type="text" placeholder="Find your hobby" className='text-gray-600 placeholder-gray-400 text-sm flex-grow pl-5 bg-transparent outline-none'/>
            <SearchIcon className='md:mx-2 hidden md:inline-flex h-8 bg-logo-red text-white rounded-full p-2 cursor-pointer'/>
        </div>

        {/* right */}
        <div className='flex items-center justify-end text-gray-500 space-x-4'>
            <p className='text-sm hidden md:inline cursor-pointer'>Be an Instructor</p>
            <GlobeAltIcon className='h-6 cursor-pointer'/>
            <div className='flex items-center space-x-2 border-2 p-2 rounded-full'>
                <MenuIcon className='h-6 cursor-pointer'/>
                <UserCircleIcon className='h-6 cursor-pointer'/>
            </div>
        </div>
    </header>
    
   
  );
}

export default Header