import Image from 'next/image';
import React from 'react';
import { BriefcaseIcon, CalendarIcon, CurrencyDollarIcon, MapIcon, StarIcon } from '@heroicons/react/solid';
import Rating from 'react-rating';
import { useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useEffect } from 'react';
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper";
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";




const ClassHeading = ({
    type,
    id,
    name,
    images,
    description,
    address,
    location,
    longitude,
    latitude,
    price,
    category,
    data,
    classID
}) => {
    //console.log(location?.longitude)
    const getLongitude = location?.longitude;
    const getLatitude = location?.latitude;
    const addresslink = `https://www.google.com/maps/search/?api=1&query=${getLatitude}%2C${getLongitude}`;
    const [recommend, setRecommend] = useState(0)
    const [quality, setQuality] = useState(0)
    const [safety, setSafety] = useState(0)
    const [loading, setLoading] = useState(false)
    const [reviews, setReviews] = useState([])

    const [user, authStateLoading, error] = useAuthState(auth);

    const reviewerName = user?.displayName || user?.email.split("@")[0]
    const photo = user?.photoURL || " "



    let currentClassReview = reviews.filter((rev) => rev[0].classID === id)
    let avgReview = 0;
    currentClassReview.map(d => {
        avgReview = avgReview + d[0].safetyRating + d[0].recommendRating + d[0].qualityRating
    })

    avgReview = avgReview / (currentClassReview.length * 3)
    const router = useRouter()
    const handleFormSubmit = (e) => {
        e.preventDefault()
        if (recommend !== 0 || quality !== 0 || safety !== 0) {
            setLoading(true)
            const docRef = addDoc(collection(db, "Reviews"), {
                classID: id,
                name: reviewerName,
                photo: photo,
                recommendRating: recommend,
                qualityRating: quality,
                safetyRating: safety,
                review: e.target.review.value
            })
                .finally((f) => {
                    setLoading(false)
                    e.target.review.value = " "
                    setSafety(0)
                    setQuality(0)
                    setRecommend(0)
                })

        } else {
            alert("Please provide a review before submitting!");
        }

    }

    const getData = async () => {
        const docRef = doc(db, "classes", id);
        const docSnap = await getDoc(docRef);
    }



    useEffect(() => {
        setLoading(true)
        return onSnapshot(collection(db, "Reviews"), (snapshot) => {
            setReviews(snapshot.docs.map((doc) => [{ ...doc.data(), "id": doc.id }]))
            setLoading(false)
        })
    }, [])

    console.log(user)

    return (
        <div className="py-7 px-2">
            <h2 className="text-2xl font-extrabold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">{name}</h2>

            <div className="icons my-3 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6 mt-1">
                <div class="mt-2 flex items-center text-sm text-gray-500">
                    <BriefcaseIcon className='h-5 w-5 mr-1' fill="#AF816C" />
                    {category} / {type}
                </div>
                {/* <div class="mt-2 flex items-center text-sm text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                        <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Full-time
                </div> */}
                <div class="mt-2 flex items-center text-sm text-gray-500">
                    <CurrencyDollarIcon className='h-5 w-5 mr-1' fill="#58C18E" />
                    {price}
                </div>
                <div class="mt-2 flex items-center text-sm text-gray-500">
                    <CalendarIcon className='h-5 w-5 mr-1' fill="#E73F2B" />
                    Available
                </div>
            </div>

            <div className="topimageContainer flex flex-wrap w-full ">
                <div className="leftSide lg:w-[70%] xl:w-[70%] xs:w-full sm:w-full">
                    <div className="relative w-[100%] h-[450px] max-w-[80vw]">

                        <Swiper navigation={true} pagination={true} modules={[Navigation, Pagination]} className="mySwiper">


                            {

                                images && images.map(img => {
                                    return (
                                        <SwiperSlide>
                                            <img className='object-cover rounded-xl h-[450px] w-full' src={img} alt="images" />
                                        </SwiperSlide>
                                    )
                                })
                            }

                        </Swiper>


                    </div>

                    <div className="description mt-5 mb-14">
                        <p className="text-md text-gray-700">{description}</p>
                    </div>
                </div>
                <div className="rightSide lg:w-[30%] xl:w-[30%] xs:w-full sm:w-full text-gray-700 text-md">
                    <section className={`ml-10`}>
                        <div className="icon m-3 flex gap-2">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#E73F2B" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                            </span>
                            {/* <p>Lorem, ipsum.</p> */}
                            <p className='hover:text-logo-red'><a target='_blank' href={addresslink}>{address}</a></p>
                        </div>
                        <div className="icon m-3 flex gap-2">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                                </svg>

                            </span>
                            <p>+1 xxx xxx (released after sign up)</p>
                        </div>
                        <div className="icon m-3 flex gap-2">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                                </svg>

                            </span>
                            <p>xxx@gmail.com (released after sign up)</p>
                        </div>
                        {/* <div className="icon m-3 flex gap-2">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                                </svg>

                            </span>
                            <p>Lorem, ipsum.</p>
                        </div>
                        <div className="icon m-3 flex gap-2">
                            <span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                                </svg>

                            </span>
                            <p>Lorem, ipsum.</p>
                        </div> */}

                    </section>
                </div>
            </div>

            {/* Ratings */}
            {/* <hr /> */}

            {
                currentClassReview.length !== 0 &&
                <div className="avgReview mt-3">
                    <p className="text-3xl font-extrabold mt-5">Customer Reviews</p>
                    <div className="container flex item-center gap-x-2 my-5">
                        <p className='font-extrabold text-2xl'>{`${Math.round(avgReview)}.0`}</p>
                        <Rating
                            className='block'
                            initialRating={Math.round(avgReview)}
                            readonly={true}
                            half={false}
                            emptySymbol={
                                <span className='block '>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                    </svg>
                                </span>
                            }
                            placeholderSymbol={<StarIcon className='text-logo-red  text-6xl inline-block' />}
                            fullSymbol={<StarIcon className='text-logo-red  text-6xl inline-block' />}
                        />
                        <p className='font-bold'>Based on {currentClassReview.length} Customer Review</p>
                    </div>
                    <hr />
                </div>
            }

            {
                !loading && !authStateLoading ?
                    reviews.filter((rev) => rev[0].classID === id)?.length !== 0 ?
                        reviews.filter((rev) => rev[0].classID === id).map((review) => {
                            return (
                                <div className="reviewShow my-10 flex flex-col">
                                    <div className="img flex gap-6 items-center">

                                        {
                                            review[0]?.photo !== " " ?
                                                <img class="inline-block h-12 w-12 rounded-full ring-2 ring-white"
                                                    src={review[0]?.photo} alt="avatar1" />
                                                :
                                                <img class="inline-block h-12 w-12 rounded-full ring-2 ring-white" src="./avataricon.png" alt="avatar" />
                                        }

                                        <p className='m-0 p-0 text-md text-gray-700'>{review[0]?.name}</p>
                                    </div>
                                    <div className="name_ratings w-full">
                                        <div className="ratings w-full flex justify-between flex-wrap items-start my-3">
                                            <div className="recommend">
                                                <p className='text-xs text-gray-700'>Would Recommend</p>
                                                <Rating
                                                    className='block'
                                                    initialRating={review?.[0].recommendRating}
                                                    readonly={true}
                                                    emptySymbol={
                                                        <span className='block '>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                            </svg>
                                                        </span>
                                                    }
                                                    placeholderSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                                    fullSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                                />
                                            </div>
                                            <div className="recommend">
                                                <p className='text-xs text-gray-700'>Instructor Quality</p>
                                                <Rating
                                                    className='block'
                                                    initialRating={review?.[0].qualityRating}
                                                    readonly={true}
                                                    emptySymbol={
                                                        <span className='block '>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                            </svg>
                                                        </span>
                                                    }
                                                    placeholderSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                                    fullSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                                />
                                            </div>
                                            <div className="recommend">
                                                <p className='text-xs text-gray-700'>Safety</p>
                                                <Rating
                                                    className='block'
                                                    initialRating={review?.[0].safetyRating}
                                                    readonly={true}
                                                    emptySymbol={
                                                        <span className='block '>
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                            </svg>
                                                        </span>
                                                    }
                                                    placeholderSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                                    fullSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="review mb-5">
                                        <p className='text-md text-gray-700 italic'>{review?.[0].review}</p>
                                    </div>
                                    <hr />
                                </div>
                            )
                        })
                        :
                        <>
                            <p className="text-2xl font-extrabold mt-5">Customer Reviews</p>
                            <p className='text-center text-xl text-gray-700 my-20'>No Reviews yet</p>
                            <hr />
                        </>

                    :
                    <>
                        <p className='text-center mt-20 text-2xl font-bold'>Loading..</p>
                    </>
            }


            {
                user ?
                    <div className='reviewFormContainer my-3'>
                        <p className='text-2xl font-extrabold mb-6'>Write a Review!</p>
                        <form onSubmit={(e) => handleFormSubmit(e)}>

                            {/* <div className='my-3'>
                        <label for="price" class="block text-sm font-medium text-gray-700">Name</label>
                        <div class="relative mt-1 rounded-md shadow-sm">
                            <input type="text" required name="name" id="name" class="block w-full rounded-md border-gray-300 pl-2 pr-2 focus:border-logo-red focus:ring-logo-red sm:text-sm" placeholder="Your Name" />

                        </div>
                    </div> */}

                            <div className="ratings flex flex-wrap justify-between items-center lg:w-[70%] sm:w-[100%] xl:w-[70%] ">
                                <div className="recommended flex flex-col justify-center ">
                                    <p className='px-0 mx-0 text-gray-700 text-sm'>Would Recommend </p>
                                    <Rating
                                        className='block'
                                        initialRating={recommend}
                                        readonly={false}
                                        emptySymbol={
                                            <span className='block '>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                </svg>
                                            </span>
                                        }
                                        placeholderSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                        fullSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                        onChange={(event) => {
                                            setRecommend(event);
                                        }}
                                    />
                                </div>
                                <div className="quality flex flex-col justify-center ">
                                    <p className='px-0 mx-0 text-gray-700 text-sm'>Instructor Quality</p>
                                    <Rating
                                        className='block'
                                        readonly={false}
                                        initialRating={quality}
                                        emptySymbol={
                                            <span className='block '>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                </svg>
                                            </span>
                                        }
                                        placeholderSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                        fullSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                        onChange={(event) => {
                                            setQuality(event);
                                        }}
                                    />
                                </div>
                                <div className="safety flex flex-col justify-center ">
                                    <p className='px-0 mx-0 text-gray-700 text-sm'>Safety </p>
                                    <Rating
                                        className='block'
                                        readonly={false}
                                        initialRating={safety}
                                        emptySymbol={
                                            <span className='block '>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                                                </svg>
                                            </span>
                                        }
                                        placeholderSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                        fullSymbol={<StarIcon className='text-logo-red  text-5xl inline-block' />}
                                        onChange={(event) => {
                                            setSafety(event);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className='my-3'>
                                <label for="price" class="block text-sm font-medium text-gray-700">Review</label>
                                <div class="relative mt-1 rounded-md shadow-sm">
                                    <textarea rows={6} type="text" required name="review" id="review" class="block w-full rounded-md border-gray-300 pl-2 pr-2 focus:border-logo-red focus:ring-logo-red sm:text-sm" placeholder="Your Review" />
                                </div>
                            </div>

                            {
                                !loading ?

                                    <button type="submit" class="group relative flex w-full justify-center rounded-md border border-transparent bg-logo-red py-2 px-4 text-sm font-medium text-white hover:bg-logo-red focus:outline-none focus:ring-2 focus:ring-logo-red focus:ring-offset-2">
                                        Post
                                    </button>

                                    :

                                    <button type="submit" class="group relative flex w-full justify-center rounded-md border border-transparent bg-slate-400 py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-logo-red focus:ring-offset-2 disabled:">
                                        Posting
                                    </button>

                            }
                        </form>
                    </div>
                    :
                    <div className="reviewRequest">
                        <p className="text-xl font-bold text-center pt-10">Please sign in to give reviews!</p>
                    </div>
            }
        </div>
    );
};

export default ClassHeading;
