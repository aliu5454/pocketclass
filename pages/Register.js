import * as React from 'react';
import { auth } from "/firebaseConfig"
// import {auth} from 'firebase/auth';
import { useRouter } from 'next/router';
import { useCreateUserWithEmailAndPassword, useSignInWithGoogle } from 'react-firebase-hooks/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { toast, ToastContainer } from 'react-toastify';

function Register() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [category, setCategory] = React.useState('');
    const router = useRouter()


    const [
        createUserWithEmailAndPassword,
        user,
        signUpLoading,
        error,
    ] = useCreateUserWithEmailAndPassword(auth);

    const [signInWithGoogle, googleUser, googleLoading, googleError] = useSignInWithGoogle(auth);

    const handleGoogleSignIn = async () => {
        if (category !== "") {

            const user = await signInWithGoogle()

            const data = {
                userUid: user?.user?.uid,
                email: user?.user?.email,
                category: category
            }

            if (user) {
                const docRef = doc(db, "Users", user?.user?.uid);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    await setDoc(doc(db, "Users", user?.user?.uid), data)
                }

            }

        } else {
            toast.error("Please select a category!", {
                toastId: "error3"
            })
        }
    }


    const onSignUpHandle = async (e) => {
        e.preventDefault()
        const email = e.target.email.value;
        const password = e.target.password.value
        const category = e.target.category.value


        if (email != null && password !== null && category !== "") {
            const signedUpUser = await createUserWithEmailAndPassword(email, password)

            const data = {
                userUid: signedUpUser?.user?.uid,
                email: email,
                category: category
            }

            if (signedUpUser) {
                await setDoc(doc(db, "Users", signedUpUser?.user?.uid), data)
                toast.success("Successfully Signed up. PLease login!", {
                    toastId: "success1"
                })
            }

        } else {
            toast.error("Please provide all information!", {
                toastId: "error2"
            })
        }


    }

    if (error) {
        toast.error(error.message.split('Error')[1], {
            toastId: "error1"
        })

    }

    if (googleUser && !googleError) {

        router.push('/')
    }

    console.count("Registration");

    return (
        <div className='px-10 py-20 rounded-3xl flex flex-col justify-center items-center h-[100vh]'>

            <div className="registrationContainer w-[50%] ">
                <h1 className='text-5xl font-semibold'>Sign Up</h1>
                <p className='font-medium text-medium text-gray-500 mt-4'>Please enter your details.</p>

                <div className='mt-8'>
                    <form onSubmit={(e) => onSignUpHandle(e)}>
                        <div className='flex flex-col'>
                            <label className='text-medium font-medium'>Email</label>
                            <input
                                required
                                name="email"
                                className='w-full border-2 text-sm border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red'
                                placeholder="Enter your email" />
                        </div>

                        <div className='flex flex-col mt-4'>
                            <label className='text-medium font-medium'>Password</label>
                            <input
                                required
                                name="password"
                                className='w-full border-2 text-sm border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red'
                                placeholder="Enter your password"
                                type={"password"}
                            />
                        </div>

                        <p className='text-medium font-medium mt-5'>Please select whether you are a Student or an Instructor</p>
                        <div className='flex  items-center'>
                            <div className="flex items-center pt-5">
                                <input
                                    type="radio"
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="form-check-input mr-5"
                                    value={'student'}
                                    name="category"
                                />
                                <span className='text-base mr-5'>Student</span>
                            </div>
                            <div className="flex items-center pt-5">
                                <input
                                    type="radio"
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="form-check-input mr-5"
                                    value={'instructor'}
                                    name="category"
                                />
                                <span className='text-base'>Instructor</span>
                            </div>
                        </div>

                        <div className='mt-8 flex flex-col gap-y-4'>

                            {!signUpLoading ?
                                <button
                                    type="submit"
                                    className='active:scale-105 active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-4 bg-logo-red rounded-xl text-white font-bold text-lg'>
                                    Sign up
                                </button>
                                :
                                <div class="flex items-center justify-center">
                                    <button type="button"
                                        class="inline-flex items-center justify-center py-4 text-sm font-semibold leading-6 text-white transition duration-150 w-full ease-in-out bg-logo-red rounded-xl shadow cursor-not-allowed hover:bg-red-400"
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
                        </div>
                    </form>
                    {
                        !googleLoading ?
                            <button
                                onClick={() => handleGoogleSignIn()}
                                className='flex items-center justify-center gap-2 w-full mt-3 active:scale-[.98] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-4  rounded-xl text-gray-700 font-semibold text-lg border-2 border-gray-100 '>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.26644 9.76453C6.19903 6.93863 8.85469 4.90909 12.0002 4.90909C13.6912 4.90909 15.2184 5.50909 16.4184 6.49091L19.9093 3C17.7821 1.14545 15.0548 0 12.0002 0C7.27031 0 3.19799 2.6983 1.24023 6.65002L5.26644 9.76453Z" fill="#EA4335" />
                                    <path d="M16.0406 18.0142C14.9508 18.718 13.5659 19.0926 11.9998 19.0926C8.86633 19.0926 6.21896 17.0785 5.27682 14.2695L1.2373 17.3366C3.19263 21.2953 7.26484 24.0017 11.9998 24.0017C14.9327 24.0017 17.7352 22.959 19.834 21.0012L16.0406 18.0142Z" fill="#34A853" />
                                    <path d="M19.8342 20.9978C22.0292 18.9503 23.4545 15.9019 23.4545 11.9982C23.4545 11.2891 23.3455 10.5255 23.1818 9.81641H12V14.4528H18.4364C18.1188 16.0119 17.2663 17.2194 16.0407 18.0108L19.8342 20.9978Z" fill="#4A90E2" />
                                    <path d="M5.27698 14.2663C5.03833 13.5547 4.90909 12.7922 4.90909 11.9984C4.90909 11.2167 5.03444 10.4652 5.2662 9.76294L1.23999 6.64844C0.436587 8.25884 0 10.0738 0 11.9984C0 13.918 0.444781 15.7286 1.23746 17.3334L5.27698 14.2663Z" fill="#FBBC05" />
                                </svg>
                                Sign up with Google
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
                    <div className='mt-8 flex justify-center items-center'>
                        <p className='font-medium text-base'>Already have an account?</p>
                        <button
                            onClick={() => router.push('/Login')}
                            className='ml-2 font-medium text-base text-logo-red'>Sign In</button>
                    </div>
                </div>
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

export default Register;