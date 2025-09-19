import Head from "next/head";
import * as React from "react";
import { auth } from "/firebaseConfig";
// import {auth} from 'firebase/auth';
import { useRouter } from "next/router";
import {
	useCreateUserWithEmailAndPassword,
	useSendEmailVerification,
	useSignInWithGoogle,
} from "react-firebase-hooks/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { toast, ToastContainer } from "react-toastify";

function Register() {
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [category, setCategory] = React.useState("student"); // Default to student
	const router = useRouter();

	const [createUserWithEmailAndPassword, user, signUpLoading, error] =
		useCreateUserWithEmailAndPassword(auth);

	const [signInWithGoogle, googleUser, googleLoading, googleError] =
		useSignInWithGoogle(auth);
	const [sendEmailVerification, sending, emailVerificationError] =
		useSendEmailVerification(auth);

	const handleGoogleSignIn = async () => {
		const user = await signInWithGoogle();

		const displayName = user?.user?.displayName || "";
		const nameParts = displayName.split(" ");
		const firstName = nameParts[0] || "";
		const lastName = nameParts.slice(1).join(" ") || "";

		const data = {
			userUid: user?.user?.uid,
			email: user?.user?.email,
			category: "student", // Default to student
			profileImage: user?.user?.photoURL,
			createdAt: serverTimestamp(),
			firstName: firstName,
			lastName: lastName,
			isInstructor: false, // New field to track instructor status
		};

		if (user) {
			const docRef = doc(db, "Users", user?.user?.uid);
			const docSnap = await getDoc(docRef);

			if (!docSnap.exists()) {
				await setDoc(doc(db, "Users", user?.user?.uid), data);
			}
		}
	};

	const onSignUpHandle = async (e) => {
		e.preventDefault();
		const email = e.target.email.value;
		const password = e.target.password.value;
		const confirmPassword = e.target.confirmPassword.value;
		const fullName = e.target.fullName.value;
		const phoneNumber = e.target.phoneNumber.value;
		const category = "student"; // Default to student

		// Check if passwords match
		if (password !== confirmPassword) {
			toast.error("Passwords do not match!", {
				toastId: "error_password_mismatch",
			});
			return;
		}

		// Split full name into first and last name for storage
		const nameParts = fullName.trim().split(" ");
		const firstName = nameParts[0] || "";
		const lastName = nameParts.slice(1).join(" ") || "";

		if (
			email != null &&
			password !== null &&
			fullName.trim() !== "" &&
			phoneNumber.trim() !== ""
		) {
			const signedUpUser = await createUserWithEmailAndPassword(
				email,
				password
			);

			const data = {
				userUid: signedUpUser?.user?.uid,
				firstName,
				lastName,
				phoneNumber,
				email,
				category: "student", // Default to student
				createdAt: serverTimestamp(),
				isInstructor: false, // New field to track instructor status
			};

			if (signedUpUser) {
				await setDoc(doc(db, "Users", signedUpUser?.user?.uid), data);
				const verificationSuccess = await sendEmailVerification();

				if (!verificationSuccess) {
					return toast.error("Something Went Wrong!", {
						toastId: "error98",
					});
				}

				toast.success(
					`Successfully Signed up. An verification email has been sent to ${data.email}`,
					{
						toastId: "success1",
					}
				);

				setTimeout(() => {
					router.push(`/Login?returnUrl=%2Fprofile%2F${signedUpUser?.user?.uid}`);
				}, 5000);
			}
		} else {
			toast.error("Please provide all information!", {
				toastId: "error2",
			});
		}
	};

	if (error) {
		toast.error(error.message.split("Error")[1], {
			toastId: "error1",
		});
	}

	if (googleUser && !googleError) {
		router.push('/');
		return
	}

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<Head>
				<title>pocketclass:register</title>
				<meta
					name="pocketclass"
					content="Register for an account at pocketclass!"
				/>
				<link rel="icon" href="/pc_favicon.ico" />
			</Head>

			<div className="sm:mx-auto sm:w-full sm:max-w-md">
				<h2 className=" text-center text-3xl font-semibold text-gray-900">
					Join Pocketclass
				</h2>
				<p className="mt-2 text-center text-sm text-gray-600">
					Create your account to get started
				</p>
			</div>

			<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div className="bg-white py-8 px-6 shadow-sm rounded-lg sm:px-10 border border-gray-200">

				<div className="space-y-6">
					<form onSubmit={(e) => onSignUpHandle(e)} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700">Full Name</label>
							<input
								required
								name="fullName"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
								placeholder="Enter your full name"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700">Email</label>
							<input
								required
								name="email"
								type="email"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
								placeholder="Enter your email"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700">Phone Number</label>
							<input
								required
								name="phoneNumber"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
								placeholder="Enter your phone number"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700">Password</label>
							<input
								required
								name="password"
								type="password"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
								placeholder="Create a password"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700">Confirm Password</label>
							<input
								required
								name="confirmPassword"
								type="password"
								className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
								placeholder="Confirm your password"
							/>
						</div>


						<div>
							{!signUpLoading && !sending ? (
								<button
									type="submit"
									className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-logo-red hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
								>
									Create account
								</button>
							) : (
								<button
									type="button"
									className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black opacity-50 cursor-not-allowed"
									disabled
								>
									<svg
										className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Loading...
								</button>
							)}
						</div>
					</form>
					{!googleLoading ? (
						<button
							onClick={() => handleGoogleSignIn()}
							className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors duration-200"
						>
							<svg
								className="w-5 h-5 mr-2"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M5.26644 9.76453C6.19903 6.93863 8.85469 4.90909 12.0002 4.90909C13.6912 4.90909 15.2184 5.50909 16.4184 6.49091L19.9093 3C17.7821 1.14545 15.0548 0 12.0002 0C7.27031 0 3.19799 2.6983 1.24023 6.65002L5.26644 9.76453Z"
									fill="#EA4335"
								/>
								<path
									d="M16.0406 18.0142C14.9508 18.718 13.5659 19.0926 11.9998 19.0926C8.86633 19.0926 6.21896 17.0785 5.27682 14.2695L1.2373 17.3366C3.19263 21.2953 7.26484 24.0017 11.9998 24.0017C14.9327 24.0017 17.7352 22.959 19.834 21.0012L16.0406 18.0142Z"
									fill="#34A853"
								/>
								<path
									d="M19.8342 20.9978C22.0292 18.9503 23.4545 15.9019 23.4545 11.9982C23.4545 11.2891 23.3455 10.5255 23.1818 9.81641H12V14.4528H18.4364C18.1188 16.0119 17.2663 17.2194 16.0407 18.0108L19.8342 20.9978Z"
									fill="#4A90E2"
								/>
								<path
									d="M5.27698 14.2663C5.03833 13.5547 4.90909 12.7922 4.90909 11.9984C4.90909 11.2167 5.03444 10.4652 5.2662 9.76294L1.23999 6.64844C0.436587 8.25884 0 10.0738 0 11.9984C0 13.918 0.444781 15.7286 1.23746 17.3334L5.27698 14.2663Z"
									fill="#FBBC05"
								/>
							</svg>
							Continue with Google
						</button>
					) : (
						<button
							type="button"
							className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 opacity-50 cursor-not-allowed"
							disabled
						>
							<svg
								className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Loading...
						</button>
					)}
					
					<div className="mt-6 text-center">
						<p className="text-sm text-gray-600">
							Already have an account?{' '}
							<button
								onClick={() => router.push("/Login")}
								className="font-medium text-logo-red hover:text-gray-800 focus:outline-none focus:underline transition-colors duration-200"
							>
								Sign in
							</button>
						</p>
					</div>
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
