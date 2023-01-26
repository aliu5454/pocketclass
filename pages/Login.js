// import { useRouter } from "next/router";
// import React from "react";
// import Footer from "./Footer";
// import Header from "./Header";
// import LoginForm from "./LoginForm";

import * as React from 'react';
import Head from "next/head";
import { useRouter } from 'next/router';
import { useSendPasswordResetEmail, useSignInWithEmailAndPassword, useSignInWithGoogle, useSignOut } from 'react-firebase-hooks/auth';
import { auth } from "/firebaseConfig"
import { toast, ToastContainer } from 'react-toastify';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useState } from 'react';
import { useCallback } from 'react';
import { useEffect } from 'react';



function Login() {


    const router = useRouter()
    const [errorMessage, setErrorMessage] = useState('')
    const [email, setEmail] = useState()


    const [
        signInWithEmailAndPassword,
        user,
        loading,
        error,
    ] = useSignInWithEmailAndPassword(auth);


    const [signInWithGoogle, googleUser, googleLoading, googleError] = useSignInWithGoogle(auth);
    const [sendPasswordResetEmail, sending, resetPasswordError] = useSendPasswordResetEmail(auth);
    const [signOut, signOutLoading, signOutError] = useSignOut(auth);


    const handleGoogleSignIn = async (e) => {
        e.preventDefault()
        setErrorMessage('')

        const googleSignIn = await signInWithGoogle()

        if (googleSignIn?.user) {
            const docRef = doc(db, "Users", googleSignIn?.user?.uid);

            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                const signing_out = await signOut()
                if (signing_out) {
                    return setErrorMessage("Please Sign up first!")
                }
            } else {
                router.push('/')
            }
        }
    }

    const handelForgotPassword = () => {
        if (!email) {
            return toast.error("Please provide email in the email field!", {
                errorId: "error98"
            })
        }
        sendPasswordResetEmail(email);
        if (!resetPasswordError) {
            return toast.success(`A password reset email has been sent to ${email}`, {
                errorId: "success98"
            })
        }
        return toast.error("Something went wrong!", {
            errorId: "error998"
        })

    }

    // const checkUserCategory = async (user) => {

    //     const docRef = doc(db, "Users", user?.user?.uid);

    //     const docSnap = await getDoc(docRef);

    //     if (!docSnap.exists()) {
    //         signOut()
    //         setErrorMessage("Sign up first")
    //         return
    //     } else {
    //         router.push('/')
    //     }
    // }

    // const checkUserCategory = useCallback(async (user) => {
    //     const docRef = doc(db, "Users", user?.user?.uid);

    //     const docSnap = await getDoc(docRef);

    //     if (!docSnap.exists()) {
    //         signOut()
    //         setErrorMessage("Sign up first")
    //         return
    //     } else {
    //         router.push('/')
    //     }
    // }, [user])

    const handleLogin = (e) => {
        e.preventDefault()
        const email = e.target.email.value;
        const password = e.target.password.value
        if (email && password) {
            signInWithEmailAndPassword(email, password)
        }

    }

    useEffect(() => {
        if (error) {
            return setErrorMessage(error.message.split('Error')[1].split('/')[1].split(")")[0])
        }
    }, [error])


    if (signOutError) {
        console.log(signOutError);
    }

    if (user && !error) {
        router.push('/')
    }

    // if (googleUser) {
    //     console.log('inside googleUser && !googleError')
    //     console.log(googleUser)
    //     checkUserCategory(googleUser)
    // }

    // console.count("Login");
    return (
        <div className="flex w-full h-screen">
            <Head>
            <title>pocketclass:login</title>
            <meta name="pocketclass" content="All the extracurriculars in your fingertips!" />
            <link rel="icon" href="/pc_favicon.ico" />
            </Head>
            
            <div className="w-full flex items-center justify-center lg:w-1/2">
                <div className=' w-11/12 max-w-[700px] px-10 py-20 rounded-3xl bg-white border-2 border-gray-100'>
                    <h1 className='text-5xl font-semibold'>Welcome</h1>
                    <p className='font-medium text-lg text-gray-500 mt-4'>Please enter you details.</p>
                    <div className='mt-8'>
                        <form onSubmit={(e) => handleLogin(e)}>
                            <div className='flex flex-col'>
                                <label className='text-lg font-medium'>Email</label>
                                <input
                                    required
                                    name='email'
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red'
                                    placeholder="Enter your email" />
                            </div>
                            <div className='flex flex-col mt-4'>
                                <label className='text-lg font-medium'>Password</label>
                                <input
                                    required
                                    name='password'
                                    className='w-full border-2 border-gray-100 rounded-xl p-4 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red'
                                    placeholder="Enter your password"
                                    type={"password"}
                                />
                            </div>


                            {
                                errorMessage && <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-1 rounded relative mt-5" role="alert">
                                    <strong class="font-bold text-center block">{errorMessage.toLocaleUpperCase()}</strong>
                                </div>

                            }


                            <div className='mt-8 flex justify-between items-center'>
                                {/* <div>
                                    <input type="checkbox" id='remember' />
                                    <label className='ml-2 font-medium text-base' for="remember">Remember for 30 days</label>
                                </div> */}
                                <p onClick={() => handelForgotPassword()} className='font-medium text-base text-logo-red cursor-pointer active:scale-90 transition duration-150 hover:scale-105 transition transform duration-200 ease-out'>Forgot Password?</p>
                            </div>
                            <div className='mt-8 flex flex-col gap-y-4'>
                                {
                                    !loading ?
                                        <button
                                            type='submit'
                                            className='active:scale-[.98] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-4 bg-logo-red rounded-xl text-white font-bold text-lg'>Sign in</button>

                                        :

                                        <div class="flex items-center justify-center">
                                            <button type="button"
                                                class="inline-flex items-center justify-center py-4 text-sm font-semibold leading-6 text-white transition duration-150 w-full ease-in-out bg-logo-red rounded-xl shadow cursor-not-allowed hover:bg-violet-500"
                                                disabled="">
                                                <svg class="w-5 h-5 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
                                                    viewBox="0 0 24 24">
                                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                    <path class="opacity-75" fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                                    </path>
                                                </svg>
                                                Loading...
                                            </button>
                                        </div>
                                }
                                {
                                    !googleLoading || !(errorMessage === "" && !googleUser) ?
                                        <button
                                            onClick={(e) => handleGoogleSignIn(e)}
                                            className='flex items-center justify-center gap-2 active:scale-[.98] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-4  rounded-xl text-gray-700 font-semibold text-lg border-2 border-gray-100 '>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M5.26644 9.76453C6.19903 6.93863 8.85469 4.90909 12.0002 4.90909C13.6912 4.90909 15.2184 5.50909 16.4184 6.49091L19.9093 3C17.7821 1.14545 15.0548 0 12.0002 0C7.27031 0 3.19799 2.6983 1.24023 6.65002L5.26644 9.76453Z" fill="#EA4335" />
                                                <path d="M16.0406 18.0142C14.9508 18.718 13.5659 19.0926 11.9998 19.0926C8.86633 19.0926 6.21896 17.0785 5.27682 14.2695L1.2373 17.3366C3.19263 21.2953 7.26484 24.0017 11.9998 24.0017C14.9327 24.0017 17.7352 22.959 19.834 21.0012L16.0406 18.0142Z" fill="#34A853" />
                                                <path d="M19.8342 20.9978C22.0292 18.9503 23.4545 15.9019 23.4545 11.9982C23.4545 11.2891 23.3455 10.5255 23.1818 9.81641H12V14.4528H18.4364C18.1188 16.0119 17.2663 17.2194 16.0407 18.0108L19.8342 20.9978Z" fill="#4A90E2" />
                                                <path d="M5.27698 14.2663C5.03833 13.5547 4.90909 12.7922 4.90909 11.9984C4.90909 11.2167 5.03444 10.4652 5.2662 9.76294L1.23999 6.64844C0.436587 8.25884 0 10.0738 0 11.9984C0 13.918 0.444781 15.7286 1.23746 17.3334L5.27698 14.2663Z" fill="#FBBC05" />
                                            </svg>
                                            Sign in with Google
                                        </button>

                                        :

                                        <button type="button"
                                            class="inline-flex items-center justify-center py-4 text-sm font-semibold leading-6 transition duration-150 w-full ease-in-out border-2 border-gray-100 shadow cursor-not-allowed"
                                            disabled="">
                                            <svg class="w-5 h-5 mr-3 -ml-1  animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
                                                viewBox="0 0 24 24">
                                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                                <path class="opacity-75" fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                                </path>
                                            </svg>
                                            Loading...
                                        </button>

                                }
                            </div>
                            <div className='mt-8 flex justify-center items-center'>
                                <p className='font-medium text-base'>Don't have an account?</p>
                                <button
                                    onClick={() => router.push('/Register')}
                                    className='ml-2 font-medium text-base text-logo-red cursor-pointer active:scale-90 transition duration-150 hover:scale-105 transition transform duration-200 ease-out'>Sign up</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div className="hidden relative w-1/2 h-full lg:flex items-center justify-center bg-gray-200">
                <div className="w-60 h-60 rounded-full bg-gradient-to-tr from-logo-red to-pink-500 animate-bounce" />
                {/* animate-bounce  */}
                <div className="w-full h-1/2 absolute bottom-0 bg-white/10 backdrop-blur-lg" />
            </div>
            <ToastContainer
                position="top-center"
                autoClose={2000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
        </div>
    );
}

export default Login;