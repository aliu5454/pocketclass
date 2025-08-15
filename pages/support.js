// Support.js
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Head from "next/head";
// library
import { toast } from "react-toastify";
// firebase
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebaseConfig";
import {
	collection,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	where,
} from "firebase/firestore";
// components
import Dropdown from "../components/Dropdown";
import moment from "moment";
import Footer from "../components/Footer";

export default function Support() {
	// user & class
	const [user] = useAuthState(auth);
	const [userData, setUserData] = useState(null);
	const [isSending, setIsSending] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isMessageSent, setIsMessageSent] = useState(false);
	const uid = user?.uid;
	const uName = `${userData?.firstName ?? ""} ${userData?.lastName ?? ""}`;

	// data
	const [bookings, setBookings] = useState([]);
	const [appointments, setAppointments] = useState([]);
	const [classes, setClasses] = useState([]);

	// application
	const [subject, setSubject] = useState("");
	const [description, setDescription] = useState("");
	const [appointment, setAppointment] = useState(null);
	const [email, setEmail] = useState("");
	const [openIndex, setOpenIndex] = useState(null);

	const options = [...bookings, ...appointments]?.map?.((a) => ({
		...a,
		label: classes?.find?.((c) => c.id === a.class)?.Name,
		isInstructor: a.instructor === uid,
	}));

	/**
	 * DATA FUNCTIONS
	 */
	// get data from db
	const getData = async (xid, xcol) => {
		const docRef = doc?.(db, xcol, xid);
		const data = await getDoc?.(docRef);
		return data?.data?.();
	};

	// get appointments
	const getAppointments = async () => {
		try {
			const querySnapshot = await getDocs(
				query(
					collection(db, "appointments"),
					where("owner", "==", uid),
					orderBy("end", "desc")
				)
			);

			const apps = querySnapshot?.docs?.map?.((app) => app?.data?.());
			setAppointments(apps || []);
		} catch (error) {
			toast.error("Appointments loading error !", {
				toastId: "appError3",
			});
			console.warn(error);
		}
	};

	// get bookings
	const getBookings = async () => {
		try {
			const querySnapshot = await getDocs(
				query(
					collection(db, "appointments"),
					where("instructor", "==", uid),
					orderBy("end", "desc")
				)
			);

			const apps = querySnapshot?.docs?.map?.((app) => app?.data?.());
			setBookings(apps || []);
		} catch (error) {
			toast.error("Bookings loading error !", {
				toastId: "bookError3",
			});
			console.warn(error);
		}
	};

	// get classes
	const getClasses = async () => {
		try {
			const querySnapshot = await getDocs(query(collection(db, "classes")));

			const apps = querySnapshot?.docs?.map?.((app) => ({
				...app?.data?.(),
				id: app?.id,
			}));
			setClasses(apps || []);
		} catch (error) {
			toast.error("Appointments loading error !", {
				toastId: "classError1",
			});
			console.warn(error);
		}
	};

	// get all data
	useEffect(() => {
		const getAllData = async () => {
			try {
				setIsLoading(true);
				if (user) {
				const uData = await getData(uid, "Users");
				setUserData(await uData);

				await getAppointments();
				await getBookings();
				await getClasses();
				}
				setIsLoading(false);
			} catch (error) {
				setIsLoading(false);
				if (user) {
				toast.error("Class Data loading error !", {
					toastId: "classError3",
				});
				}
				console.warn(error);
			}
		};

		getAllData();
	}, [user]);

	/**
	 * APPOINTMENTS FUNCTIONS
	 */
	// handle send
	const handleSend = async () => {
		try {
			// send email
			setIsSending(true);
			
			// Get email from form or user data
			const fromEmail = user ? userData?.email : email;
			
			console.log('Sending support request:', { fromEmail, subject, description, user: !!user });
			
			if (!fromEmail) {
				toast.error("Please provide your email address", {
					toastId: "emError1",
				});
				setIsSending(false);
				return;
			}

			const emailData = {
				from: fromEmail,
					subject: `Support: ${subject}`,
					html: `<!DOCTYPE html>
				<html lang="en">
					<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Support Request - PocketClass</title>
						<style>
						/* Reset and base styles */
						* {
							margin: 0;
							padding: 0;
							box-sizing: border-box;
						}
						
							body {
							font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
							line-height: 1.6;
							color: #333;
							background-color: #f8fafc;
							}
						
							.container {
								max-width: 600px;
								margin: 0 auto;
							background-color: #ffffff;
							border-radius: 12px;
							overflow: hidden;
							box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
						}
						
						.header {
							background: linear-gradient(135deg, #e63f2b 0%, #dc2626 100%);
							padding: 32px 24px;
							text-align: center;
							color: white;
						}
						
						.header h1 {
							font-size: 28px;
							font-weight: 700;
							margin-bottom: 8px;
						}
						
						.header p {
							font-size: 16px;
							opacity: 0.9;
						}
						
							.content {
							padding: 32px 24px;
						}
						
						.section {
							margin-bottom: 32px;
							padding: 24px;
							background-color: #f8fafc;
							border-radius: 8px;
							border-left: 4px solid #e63f2b;
						}
						
						.section h2 {
							font-size: 20px;
							font-weight: 600;
							color: #1f2937;
							margin-bottom: 16px;
							display: flex;
							align-items: center;
						}
						
						.section h2 svg {
							margin-right: 8px;
							color: #e63f2b;
						}
						
						.info-grid {
							display: grid;
							grid-template-columns: 1fr 1fr;
							gap: 16px;
							margin-top: 16px;
						}
						
						.info-item {
							background-color: white;
							padding: 16px;
							border-radius: 6px;
							border: 1px solid #e5e7eb;
						}
						
						.info-label {
							font-size: 12px;
							font-weight: 500;
							color: #6b7280;
							text-transform: uppercase;
							letter-spacing: 0.5px;
							margin-bottom: 4px;
						}
						
						.info-value {
							font-size: 14px;
							font-weight: 600;
							color: #1f2937;
						}
						
						.message-content {
							background-color: white;
								padding: 20px;
							border-radius: 8px;
							border: 1px solid #e5e7eb;
						}
						
						.message-subject {
							font-size: 18px;
							font-weight: 600;
							color: #1f2937;
							margin-bottom: 16px;
							padding-bottom: 12px;
							border-bottom: 2px solid #f3f4f6;
						}
						
						.message-description {
							font-size: 15px;
							line-height: 1.7;
							color: #374151;
							white-space: pre-wrap;
						}
						
						.footer {
							background-color: #f8fafc;
							padding: 24px;
							text-align: center;
							border-top: 1px solid #e5e7eb;
						}
						
						.footer p {
							font-size: 14px;
							color: #6b7280;
							margin-bottom: 8px;
						}
						
						.footer .highlight {
							color: #e63f2b;
							font-weight: 600;
						}
						
						@media (max-width: 600px) {
							.container {
								margin: 16px;
								border-radius: 8px;
							}
							
							.header {
								padding: 24px 16px;
							}
							
							.header h1 {
								font-size: 24px;
							}
							
							.content {
								padding: 24px 16px;
							}
							
							.section {
								padding: 20px;
							}
							
							.info-grid {
								grid-template-columns: 1fr;
							}
							}
						</style>
					</head>
					<body>
						<div class="container">
						<div class="header">
							<h1>🎯 Support Request</h1>
							<p>A new support request has been submitted</p>
						</div>
						
							<div class="content">
							<div class="section">
								<h2>
									<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" />
									</svg>
									Contact Information
								</h2>
								<div class="info-grid">
									<div class="info-item">
										<div class="info-label">Email Address</div>
										<div class="info-value">${fromEmail}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Submission Time</div>
										<div class="info-value">${new Date().toLocaleString('en-US', { 
											year: 'numeric', 
											month: 'long', 
											day: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
											timeZoneName: 'short'
										})}</div>
									</div>
								</div>
							</div>
							
							${user ? `
							<div class="section">
								<h2>
									<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
									</svg>
									User Information
								</h2>
								<div class="info-grid">
									<div class="info-item">
										<div class="info-label">User ID</div>
										<div class="info-value">${uid}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Full Name</div>
										<div class="info-value">${uName || "Not provided"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Email</div>
										<div class="info-value">${userData?.email || "Not provided"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Phone</div>
										<div class="info-value">${userData?.phoneNumber || "Not provided"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Category</div>
										<div class="info-value">${userData?.category || "Not provided"}</div>
									</div>
								</div>
							</div>
							
							${!!appointment ? `
							<div class="section">
								<h2>
									<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 000-2H6z" clip-rule="evenodd" />
									</svg>
									Class & Appointment Details
								</h2>
								<div class="info-grid">
									<div class="info-item">
										<div class="info-label">Class Name</div>
										<div class="info-value">${appointment?.label || "Not specified"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Class ID</div>
										<div class="info-value">${appointment?.class || "Not specified"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">Start Date</div>
										<div class="info-value">${moment?.unix?.(appointment?.start)?.format?.("MMM DD, YYYY [at] h:mm A") || "Not specified"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">End Date</div>
										<div class="info-value">${moment?.unix?.(appointment?.end)?.format?.("MMM DD, YYYY [at] h:mm A") || "Not specified"}</div>
									</div>
									<div class="info-item">
										<div class="info-label">User Role</div>
										<div class="info-value">${appointment?.isInstructor ? "Instructor" : "Student"}</div>
									</div>
								</div>
							</div>
							` : ''}
							` : ''}
							
							<div class="section">
								<h2>
									<svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
										<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.183l1.562-1.562C15.802 8.249 16 9.1 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.9.03l1.601-1.6a7.973 7.973 0 00-1.038-.038l1.58 1.58a6 6 0 01.668 2.754z" clip-rule="evenodd" />
									</svg>
									Support Request Details
								</h2>
								<div class="message-content">
									<div class="message-subject">${subject}</div>
									<div class="message-description">${description}</div>
								</div>
							</div>
						</div>
						
						<div class="footer">
							<p>This support request was submitted via the PocketClass support form</p>
							<p><span class="highlight">Priority:</span> Please respond within 24 hours</p>
							<p><span class="highlight">Ticket ID:</span> ${Date.now()}</p>
							</div>
						</div>
					</body>
				</html>`,
			};

			console.log('Email data being sent:', emailData);

			const res = await fetch("/api/sendEmail", {
				method: "POST",
				headers: {
					Accept: "application/json, text/plain, */*",
					"Content-Type": "application/json",
				},
				body: JSON.stringify(emailData),
			});

			console.log('Response status:', res.status);
			console.log('Response ok:', res.ok);

			if (res.ok) {
				const responseText = await res.text();
				console.log('Response text:', responseText);
				
				// Show success toast and state
				toast.success("Message sent successfully!", {
					toastId: "emSuccess",
				});
				
				// Show success state instead of just toast
				setIsMessageSent(true);
			setIsSending(false);
				
				// Clear form data
			setSubject("");
			setDescription("");
				setEmail("");
			setAppointment(null);
			} else {
				const errorText = await res.text();
				console.error('Error response:', errorText);
				
				toast.error("Failed to send email. Please try again.", {
					toastId: "emError",
				});
				setIsSending(false);
			}
		} catch (error) {
			console.error('Email sending error:', error);
			toast.error("Email sending error! Please try again.", {
				toastId: "emError3",
			});
			setIsSending(false);
		}
	};



	return isLoading ? (
		<section className="flex justify-center items-center min-h-[100vh] bg-gradient-to-b from-gray-50 via-white to-white">
			<div className="text-center">
				<Image 
					priority={true} 
					src="/Rolling-1s-200px.svg" 
					width={"60px"} 
					height={"60px"} 
					alt="Loading spinner"
				/>
				<p className="mt-4 text-gray-600 font-medium">Loading...</p>
			</div>
		</section>
	) : (
		<div className="min-h-screen bg-gradient-to-b from-gray-100 via-gray-50 to-white relative">
			{/* head */}
			<Head>
				<title>Support - PocketClass</title>
				<meta name="description" content="Get help and support for your PocketClass experience" />
				<link rel="icon" href="/pc_favicon.ico" />
			</Head>

			{/* Hero Section */}
			<section className="relative overflow-hidden py-6 sm:py-8">
				{/* subtle grid/shine background */}
				<div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_40%_at_10%_10%,rgba(230,63,43,0.08),transparent_60%),radial-gradient(40%_30%_at_90%_20%,rgba(59,130,246,0.08),transparent_60%)]" />
				
				{/* Organic gradient backgrounds */}
				<div className="absolute -top-20 -left-32 w-96 h-96 bg-gradient-to-br from-orange-200 via-orange-100 to-transparent opacity-40 rounded-full blur-3xl"></div>
				<div className="absolute -bottom-16 -right-24 w-80 h-80 bg-gradient-to-tl from-amber-200 via-orange-50 to-transparent opacity-30 rounded-full blur-2xl"></div>

				<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto">
						<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-3">
							We're here to <span className="text-logo-red">help</span>
				</h1>

						<p className="text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
							Get the support you need to make the most of your PocketClass experience. Our team is ready to assist you with any questions or issues.
						</p>
					</div>
				</div>
			</section>

			{/* Main Content Section - This will have the gradient background */}
			<div className="bg-gradient-to-b from-gray-100 via-gray-50 to-white min-h-screen">
				<section className="py-12 relative">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* User Info Card - Only show if user is logged in */}
					{user && userData && (
						<div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-3xl p-6 mb-4 border border-blue-100 shadow-lg">
							<div className="flex items-center space-x-4 mb-6">
								<div className="w-14 h-14 bg-gradient-to-br from-logo-red to-red-600 rounded-full flex items-center justify-center">
									<svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
								</div>
								<div>
									<h2 className="text-xl font-bold text-gray-900">Your Information</h2>
									<p className="text-gray-600">We'll use this to provide personalized support</p>
								</div>
							</div>
							
							<div className="grid md:grid-cols-3 gap-8">
								<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-200">
									<p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
									<p className="text-lg font-semibold text-gray-900">{uName || "Not provided"}</p>
								</div>
								<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-200">
									<p className="text-sm font-medium text-gray-500 mb-1">Email Address</p>
									<p className="text-lg font-semibold text-gray-900">{userData?.email || "Not provided"}</p>
								</div>
								<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-200">
									<p className="text-sm font-medium text-gray-500 mb-1">Phone Number</p>
									<p className="text-lg font-semibold text-gray-900">{userData?.phoneNumber || "Not provided"}</p>
								</div>
							</div>
						</div>
					)}

					{/* Support Form Card */}
					{!isMessageSent ? (
						<div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
							{/* Form Header */}
							<div className="bg-gradient-to-r from-logo-red to-red-600 px-6 py-5">
								<div className="flex items-center space-x-3">
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
									<h2 className="text-xl font-bold text-white">Send Us a Message</h2>
								</div>
								<p className="text-red-100 mt-1">We'll get back to you within 24 hours</p>
					</div>

							{/* Form Content */}
							<div className="p-6 bg-white/60 backdrop-blur-sm">
								<div className="space-y-5">
									{/* Email Field - Show for non-logged-in users */}
									{!user && (
										<div>
											<label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
												Your Email Address
											</label>
											<input
												type="email"
												name="email"
												id="email"
												placeholder="Enter your email address..."
												className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-logo-red focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white/80"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												required
											/>
										</div>
									)}

									{/* Subject Field */}
									<div>
										<label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
								Subject
							</label>
							<input
								type="text"
								name="subject"
								id="subject"
											placeholder="Brief description of your issue..."
											className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-logo-red focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 bg-white/80"
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
							/>
						</div>

									{/* Description Field */}
									<div>
										<label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
								Description
							</label>
							<textarea
											name="description"
											id="description"
											rows={5}
											className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-logo-red focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 resize-none bg-white/80"
											placeholder="Please provide detailed information about your issue..."
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
					</div>

									{/* Submit Button */}
									<div className="flex justify-end pt-3">
					<button
											className={`px-8 py-3 rounded-xl font-semibold text-white transition-all duration-200 transform hover:scale-105 ${
												subject.trim() === "" || description.trim() === "" || (!user && email.trim() === "") || isSending
													? "bg-gray-400 cursor-not-allowed"
													: "bg-gradient-to-r from-logo-red to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl"
											}`}
											disabled={subject.trim() === "" || description.trim() === "" || (!user && email.trim() === "") || isSending}
						onClick={handleSend}
					>
											{isSending ? (
												<div className="flex items-center space-x-2">
													<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
													</svg>
													Sending...
												</div>
											) : (
												<div className="flex items-center space-x-2">
													<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
													</svg>
													Send Message
												</div>
											)}
					</button>
				</div>
			</div>
							</div>
						</div>
					) : (
						/* Success Message */
						<div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-green-200 shadow-xl overflow-hidden">
							<div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5">
								<div className="flex items-center space-x-3">
									<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<h2 className="text-xl font-bold text-white">Message Sent Successfully!</h2>
								</div>
								<p className="text-green-100 mt-1">Thank you for contacting us</p>
							</div>

							<div className="p-8 text-center bg-white/60 backdrop-blur-sm">
								<div className="mb-6">
									<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
										<svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									</div>
									<h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
									<p className="text-gray-600 max-w-md mx-auto">
										Your support request has been sent successfully. We'll get back to you within 24 hours.
									</p>
								</div>

								<div className="space-y-3">
									<button
										onClick={() => setIsMessageSent(false)}
										className="bg-logo-red text-white px-8 py-3 rounded-xl font-semibold hover:bg-red-600 transition-all duration-200 transform hover:scale-105"
									>
										Send Another Message
									</button>
									<p className="text-sm text-gray-500">
										Or <a href="/" className="text-logo-red hover:underline">return to home</a>
									</p>
								</div>
							</div>
						</div>
					)}

					{/* FAQ Section */}
					<div className="mt-8">
						<div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200">
							<h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h3>
							<div className="space-y-3">
								{/* FAQ Item 1 */}
								<div className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
									<button
										className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
											openIndex === 0 ? 'bg-gray-50/80' : ''
										}`}
										onClick={() => setOpenIndex(openIndex === 0 ? null : 0)}
									>
										<h4 className="font-semibold text-gray-900 pr-4">How Do I Ask A Question?</h4>
										<div className="flex-shrink-0">
											{openIndex === 0 ? (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
												</svg>
											) : (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
												</svg>
											)}
										</div>
									</button>
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openIndex === 0 ? 'max-h-[500px]' : 'max-h-0'
										}`}
									>
										<div className="px-6 pb-4 text-gray-700 leading-relaxed">
											Have a question? We're here to help! Simply use the support form above to reach out to our team. 
											Our support team is available to assist you with any inquiries and will get back to you within 24 hours.
										</div>
									</div>
								</div>

								{/* FAQ Item 2 */}
								<div className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
									<button
										className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
											openIndex === 1 ? 'bg-gray-50/80' : ''
										}`}
										onClick={() => setOpenIndex(openIndex === 1 ? null : 1)}
									>
										<h4 className="font-semibold text-gray-900 pr-4">What Can I Expect During a Typical Lesson?</h4>
										<div className="flex-shrink-0">
											{openIndex === 1 ? (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
												</svg>
											) : (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
												</svg>
											)}
										</div>
									</button>
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openIndex === 1 ? 'max-h-[500px]' : 'max-h-0'
										}`}
									>
										<div className="px-6 pb-4 text-gray-700 leading-relaxed">
											Your instructor will personalize each lesson to match your skill level, guiding you through key techniques, 
											hands-on practice with real-time feedback, and strategic insights to enhance your overall learning experience.
										</div>
									</div>
								</div>

								{/* FAQ Item 3 */}
								<div className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
									<button
										className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
											openIndex === 2 ? 'bg-gray-50/80' : ''
										}`}
										onClick={() => setOpenIndex(openIndex === 2 ? null : 2)}
									>
										<h4 className="font-semibold text-gray-900 pr-4">How Many Lessons Should I Take?</h4>
										<div className="flex-shrink-0">
											{openIndex === 2 ? (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
												</svg>
											) : (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
												</svg>
											)}
										</div>
									</button>
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openIndex === 2 ? 'max-h-[500px]' : 'max-h-0'
										}`}
									>
										<div className="px-6 pb-4 text-gray-700 leading-relaxed">
											The number of lessons you need depends on your goals—start with a 3-lesson pack for a solid foundation 
											or choose a 10-lesson pack for steady progress and long-term improvement.
										</div>
									</div>
								</div>

								{/* FAQ Item 4 */}
								<div className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
									<button
										className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
											openIndex === 3 ? 'bg-gray-50/80' : ''
										}`}
										onClick={() => setOpenIndex(openIndex === 3 ? null : 3)}
									>
										<h4 className="font-semibold text-gray-900 pr-4">Can I Take Lessons with Friends or Family?</h4>
										<div className="flex-shrink-0">
											{openIndex === 3 ? (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
												</svg>
											) : (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
												</svg>
											)}
										</div>
									</button>
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openIndex === 3 ? 'max-h-[500px]' : 'max-h-0'
										}`}
									>
										<div className="px-6 pb-4 text-gray-700 leading-relaxed">
											Yes! Group lessons are a fun and cost-effective way to learn together. Instructors have specific time slots 
											and pricing for group lessons. You can directly view group timeslots in the instructor schedule, or contact 
											your instructor to request a larger group session for a specific time!
										</div>
									</div>
								</div>

								{/* FAQ Item 5 */}
								<div className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
									<button
										className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
											openIndex === 4 ? 'bg-gray-50/80' : ''
										}`}
										onClick={() => setOpenIndex(openIndex === 4 ? null : 4)}
									>
										<h4 className="font-semibold text-gray-900 pr-4">How Do I Book a Class?</h4>
										<div className="flex-shrink-0">
											{openIndex === 4 ? (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
												</svg>
											) : (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
												</svg>
											)}
										</div>
									</button>
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openIndex === 4 ? 'max-h-[500px]' : 'max-h-0'
										}`}
									>
										<div className="px-6 pb-4 text-gray-700 leading-relaxed">
											Browse our available classes, select your preferred instructor and time slot, and complete the booking process. 
											You'll receive confirmation and can manage your bookings through your account dashboard.
										</div>
									</div>
								</div>

								{/* FAQ Item 6 */}
								<div className="bg-white/80 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
									<button
										className={`w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors duration-200 ${
											openIndex === 5 ? 'bg-gray-50/80' : ''
										}`}
										onClick={() => setOpenIndex(openIndex === 5 ? null : 5)}
									>
										<h4 className="font-semibold text-gray-900 pr-4">What If I Need to Cancel or Reschedule?</h4>
										<div className="flex-shrink-0">
											{openIndex === 5 ? (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
												</svg>
											) : (
												<svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
												</svg>
											)}
										</div>
									</button>
									<div
										className={`overflow-hidden transition-all duration-300 ease-in-out ${
											openIndex === 5 ? 'max-h-[500px]' : 'max-h-0'
										}`}
									>
										<div className="px-6 pb-4 text-gray-700 leading-relaxed">
											We understand that plans can change. You can cancel or reschedule your class up to 24 hours before the scheduled time. 
											Please contact your instructor or our support team for assistance with changes.
										</div>
									</div>
								</div>
							</div>

							{/* Additional Resources */}
							<div className="mt-8 text-center">
								<p className="text-gray-600 mb-5">Need more help? Check out our additional resources</p>
								<div className="flex flex-col sm:flex-row gap-4 justify-center">
									<a 
										href="/community/instructorguide" 
										className="inline-flex items-center justify-center px-6 py-3 bg-white/80 text-gray-700 rounded-xl border border-gray-300 hover:border-logo-red hover:text-logo-red transition-all duration-200 font-medium"
									>
										<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
										</svg>
										Instructor Guide
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
			</div>

			{/* Footer */}
			<Footer />
		</div>
	);
}
