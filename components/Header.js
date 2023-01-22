import React, { useState } from 'react'
import Image from 'next/image';
import { SearchIcon, GlobeAltIcon, MenuIcon, UserCircleIcon, UsersIcon } from '@heroicons/react/solid';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { DateRangePicker } from 'react-date-range';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from "/firebaseConfig"
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { memo } from 'react';
import { useEffect } from 'react';


function Header({ placeholder }) {
    const [searchInput, setSearchInput] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [noOfGuests, setNoOfGuests] = useState(1);
    const [category, setCategory] = useState('')
    const router = useRouter();

    const [user, loading, error] = useAuthState(auth);

    const selectionRange = {
        startDate: startDate,
        endDate: endDate,
        key: 'selection'
    }

    const handleSelect = (ranges) => {
        setStartDate(ranges.selection.startDate);
        setEndDate(ranges.selection.endDate);
    }

    const resetInput = () => {
        setSearchInput('');
    }

    const search = () => {
        if (searchInput != '') {
            const lowerCase = searchInput.toLowerCase();
            const firstLetterUpperCase = lowerCase.substring(0, 1).toUpperCase();
            const exceptFirstLetter = lowerCase.substring(1, lowerCase.length)
            const finalSearchInput = firstLetterUpperCase + exceptFirstLetter

            router.push({
                pathname: '/search',
                query: {
                    searchInput: finalSearchInput,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    noOfGuests,
                }
            });
            setSearchInput('');
        }
    }

    const checkCategory = async (user) => {

        try {
            const docSnap = await getDoc(doc(db, "Users", user.uid));

            if (docSnap.exists()) {

                setCategory(docSnap.data().category);
            }
        } catch (error) {
            console.log(error);
        }
    }

    if (user) {
        checkCategory(user)
    }


    // useEffect(() => {
    //     if (user) {
    //         checkCategory(user)
    //     }
    // }, [user])


    console.log("Component Mount");

    return (
        <header className='sticky top-0 z-50 grid grid-cols-3 bg-white shadow-md p-5 md:px-10'>
            {/* left */}
            <div onClick={() => router.push('/')}
                className='relative flex items-center h-10 cursor-pointer my-auto'>
                <Image
                    src="/pc_logo3.png"
                    layout='fill'
                    objectFit="contain"
                    objectPosition="left"
                />
            </div>

            {/* middle - search*/}
            <div className='flex items-center md:border-2 rounded-full py-2 md:shadow-sm'>
                <input value={searchInput} id="searchInputId"
                    onChange={(e) => setSearchInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && search()} type="text" placeholder={placeholder || "tennis, painting, violin..."} className='text-gray-600 placeholder-gray-400 text-sm flex-grow pl-5 bg-transparent border-transparent focus:border-transparent focus:ring-0' />
                <SearchIcon onClick={search} className='md:mx-2 hidden md:inline-flex h-8 bg-logo-red text-white rounded-full p-2 cursor-pointer hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150' />
            </div>

            {/* right */}
            <div className='flex items-center justify-end text-gray-500 space-x-4'>

                {/* https://gm81lvnyohz.typeform.com/to/IoLpsf9g */}

                {/* <GlobeAltIcon className='h-6 cursor-pointer' /> */}

                {
                    !loading || category !== "" ?
                        <>
                            {
                                category !== '' ?
                                    category !== 'instructor' ?
                                        < p className='text-sm hidden md:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 p-3 hover:scale-105 active:scale-90 transition duration-150'><a target='_blank' href='https://gm81lvnyohz.typeform.com/to/IoLpsf9g'>Request a Class</a></p>
                                        :
                                        <p onClick={() => router.push('/createClass')} className='text-sm hidden md:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 p-3 hover:scale-105 active:scale-90 transition duration-150'>Create Class</p>
                                    :
                                    user ? <Image src="/Rolling-1s-200px.svg" width={'30px'} height={"30px"} /> :
                                        < p className='text-sm hidden md:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 p-3 hover:scale-105 active:scale-90 transition duration-150'><a target='_blank' href='https://gm81lvnyohz.typeform.com/to/IoLpsf9g'>Request a Class</a></p>

                            }

                            {
                                user ?
                                    <div className='flex items-center space-x-2 border-2 p-2 rounded-full hover:bg-gray-100 cursor-pointer hover:scale-105 transition transform duration-200 ease-out active:scale-90 transition duration-150'
                                        onClick={() => router.push('/profile')}>
                                        <MenuIcon className='h-6 cursor-pointer' />
                                        {
                                            user?.photoURL ?
                                                <img src={user?.photoURL} referrerpolicy="no-referrer" className="rounded-full w-10 cursor-pointer" />
                                                :
                                                <UserCircleIcon className='h-6 cursor-pointer' />
                                        }
                                    </div>
                                    :
                                    <button onClick={() => router.push('/Login')} className='ml-2 font-medium text-sm text-white px-4 py-2 rounded-lg bg-red-500 hover:shadow-2xl active:scale-90 transition duration-150 hover:scale-105 transition transform duration-200 ease-out'>Sign In</button>
                            }

                        </>
                        :
                        <Image src="/Rolling-1s-200px.svg" width={'30px'} height={"30px"} />

                }

            </div>


            {
                searchInput && (
                    <div className='flex flex-col col-span-3 mx-auto mt-3'>
                        <DateRangePicker
                            ranges={[selectionRange]}
                            minDate={new Date()}
                            rangeColors={["#E73F2B"]}
                            onChange={handleSelect}
                        />
                        <div className='flex items-center border-b mb-4'>
                            <h2 className='text-2xl flex-grow font-semibold'>Number of Students</h2>
                            <UsersIcon className='h-5' />
                            <input value={noOfGuests}
                                onChange={(e) => setNoOfGuests(e.target.value)}
                                min={1}
                                type='number' className='w-12 pl-2 text-lg outline-none text-logo-red' />
                        </div>
                        <div className='flex'>
                            <button onClick={resetInput} className='flex-grow text-gray-500'>Cancel</button>
                            <button onClick={search} className='flex-grow text-logo-red'>Search</button>
                        </div>
                    </div>
                )
            }
        </header >
    );
}

export default memo(Header)