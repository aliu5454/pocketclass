import Image from "next/image";
import React from "react";
import {
	BriefcaseIcon,
	CalendarIcon,
	CurrencyDollarIcon,
	StarIcon,
	UserCircleIcon,
} from "@heroicons/react/solid";
import Rating from "react-rating";
import { useState } from "react";
import {
	Timestamp,
	addDoc,
	collection,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	orderBy,
	query,
	where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper";
import { useRouter } from "next/router";
import { useAuthState } from "react-firebase-hooks/auth";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { toast } from "react-toastify";
import Booking from "../pages/booking";

const ClassHeading = ({
	type,
	id,
	name,
	images,
	description,
	pricing,
	about,
	experience,
	funfact,
	address,
	location,
	longitude,
	latitude,
	price,
	category,
	data,
}) => {
	const getLongitude = location?.longitude;
	const getLatitude = location?.latitude;
	const addresslink = `https://www.google.com/maps/search/?api=1&query=${getLatitude}%2C${getLongitude}`;
	const [recommend, setRecommend] = useState(0);
	const [quality, setQuality] = useState(0);
	const [safety, setSafety] = useState(0);
	const [loading, setLoading] = useState(false);
	const [reviews, setReviews] = useState([]);
	const [classCreatorData, setClassCreatorData] = useState();
	const [isInterested, setInterested] = useState(false);
	const [userIsInstructor, setUserIsInstructor] = useState(false);

	const [chatRooms, setChatRooms] = useState();
	const [loadingRooms, setLoadingRooms] = useState(false);

	const [user, authStateLoading, error] = useAuthState(auth);
	const isInstructor = user?.uid === data?.classCreator;

	const reviewerName = user?.displayName || user?.email.split("@")[0];
	const photo = user?.photoURL || " ";
	const key = `interested-${id}-${user?.email}`;

	let currentClassReview = reviews.filter((rev) => rev[0].classID === id);
	let avgReview = 0;

	currentClassReview.map((d) => {
		avgReview =
			avgReview + d[0].safetyRating + d[0].recommendRating + d[0].qualityRating;
	});

	avgReview = avgReview / (currentClassReview.length * 3);
	const router = useRouter();
	const handleFormSubmit = (e) => {
		e.preventDefault();
		if (recommend !== 0 || quality !== 0 || safety !== 0) {
			setLoading(true);
			const docRef = addDoc(collection(db, "Reviews"), {
				classID: id,
				name: reviewerName,
				userId: user?.uid,
				photo: photo,
				recommendRating: recommend,
				qualityRating: quality,
				safetyRating: safety,
				review: e.target.review.value,
			}).finally((f) => {
				setLoading(false);
				e.target.review.value = " ";
				setSafety(0);
				setQuality(0);
				setRecommend(0);
			});
		} else {
			alert("Please provide a review before submitting!");
		}
	};

	const getClassCreatorData = async (userId) => {
		const docRef = doc(db, "Users", userId);
		const data = await getDoc(docRef);
		setClassCreatorData(data.data());
	};

	// interested data
	useEffect(() => {
		if (localStorage.getItem(key)) {
			setInterested(true);
		}
	}, [key]);

	// reviews
	useEffect(() => {
		setLoading(true);
		return onSnapshot(collection(db, "Reviews"), (snapshot) => {
			setReviews(snapshot.docs.map((doc) => [{ ...doc.data(), id: doc.id }]));
			setLoading(false);
		});
	}, []);

	// get chat rooms
	const getChatRooms = async () => {
		try {
			// get chatrooms
			setLoadingRooms(true);
			const querySnapshot = await getDocs(
				query(
					collection(db, "chatrooms"),
					where("class", "==", id),
					orderBy("lastMessage", "desc")
				)
			);

			const cRooms = [];
			await Promise.all(
				querySnapshot.docs.map(async (room) => {
					if (room?.data?.().messages?.length > 0) {
						await new Promise(async (resolve, reject) => {
							// get username
							const docRef = doc(db, "Users", room?.data?.().student);
							const student = await getDoc(docRef);

							// push data
							if (!student.empty) {
								cRooms.push({
									sid: student?.id,
									studentName: `${
										student?.data?.()?.firstName ??
										"" + " " + student?.data?.()?.lastName ??
										""
									}`,
									profileImage: student?.data?.()?.profileImage ?? null,
								});
								resolve("found");
							}
							reject("not found");
						});
					}
				})
			);

			setChatRooms(cRooms);
			setLoadingRooms(false);
		} catch (error) {
			setLoadingRooms(false);
			toast.error("Chats loading error !", {
				toastId: "chatError3",
			});
			console.warn(error);
		}
	};

	// get initial chat rooms
	useEffect(() => {
		if (isInstructor && !!id) getChatRooms();
	}, [isInstructor, id, user]);

	// get chat rooms data on change
	useEffect(() => {
		const observeChatRooms = async () => {
			try {
				onSnapshot(
					query(collection(db, "chatrooms")),
					async (querySnapshot) => {
						const ch = querySnapshot
							.docChanges()
							.find((change) => change?.doc?.data()?.class === id);

						if (ch) {
							await getChatRooms();
						}
					}
				);
			} catch (error) {
				toast.error("Chats observing error !", {
					toastId: "chatError3",
				});
				console.warn(error);
			}
		};

		if (isInstructor && !!id) observeChatRooms();
	}, [isInstructor, id, user]);

	if (authStateLoading) {
		return (
			<section className="flex justify-center items-center min-h-[100vh]">
				<Image src="/Rolling-1s-200px.svg" width={"60px"} height={"60px"} />
			</section>
		);
	}

	if (!classCreatorData && data?.classCreator) {
		getClassCreatorData(data?.classCreator);
	}

	async function getUserByEmail(email) {
		const q = query(collection(db, "Users"), where("email", "==", email));
		const querySnapshot = await getDocs(q);
		if (!querySnapshot.empty) {
			return querySnapshot.docs[0];
		} else {
			return null;
		}
	}

	const handleEditButton = () => {
		router.push({
			pathname: `/updateClass/${id}`,
		});
	};

	const handleInterestButton = async (e) => {
		e.preventDefault();
		let emailBody;

		if (!user) {
			return router.push("/Login?redirect=" + router.asPath);
		}

		const email = user.email;

		const doc = await getUserByEmail(email);
		if (doc) {
			emailBody = {
				subject: `${email} Showed interest in ${name}`,
				text: `${email} showed interest in ${name}.`,
				html: `
                <div style="font-family: Arial, sans-serif; font-size: 16px; max-width: 600px; margin: 0 auto;">
                <p style="margin-bottom: 20px; text-align: center;">
                  Hello,
                </p>
                <p style="margin-bottom: 20px; text-align:center">
                <strong> ${email}</strong> just showed interest in <strong>${name}</strong>.
                </p>
                <table style="border-collapse: collapse; width: 100%; text-align: left;">
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ccc;">
                      <strong>Class Title:</strong> ${name}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ccc;">
                      <strong>Class Category:</strong> ${category}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ccc;">
                      <strong>User Email:</strong> ${email}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ccc;">
                      <strong>Name:</strong> ${
												doc.data()?.firstName + " " + doc.data()?.lastName
											}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ccc;">
                      <strong>Phone Number:</strong> ${doc.data()?.phoneNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #ccc;">
                      <strong>User Category:</strong> ${doc.data()?.category}
                    </td>
                  </tr>
                </table>
                <p style="margin-top: 20px; text-align: center;">
                  Thank you,
                  <br />
                  Pocket Class
                </p>
              </div>
                `,
			};
		} else {
			toast.error("Something went wrong! Please try again.", {
				toastId: "error1",
			});
		}

		fetch("/api/sendEmail", {
			method: "POST",
			headers: {
				Accept: "application/json, text/plain, */*",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(emailBody),
		}).then((res) => {
			if (res.status === 200) {
				localStorage.setItem(`interested-${id}-${email}`, true);
				setInterested(true);
				toast.success(
					"Thank you for showing interest! We will contact with you shortly!",
					{
						toastId: "success1",
					}
				);
			} else {
				toast.error("Something went wrong! Please try again.", {
					toastId: "error1",
				});
			}
		});
	};

	user &&
		getUserByEmail(user.email).then((res) => {
			setUserIsInstructor(res.data().isInstructor || false);
		});

	// Handle Chat Open
	const handleChatOpen = async (sid) => {
		const studentId = sid;
		const instructorId = classCreatorData?.userUid;
		const classId = id;
		const goToChat = (cid, chid) =>
			router.push({
				pathname: "/chat",
				query: {
					cid,
					chid,
				},
			});

		try {
			const chatRoomRef = collection(db, "chatrooms");
			const q = query(
				chatRoomRef,
				where("student", "==", studentId),
				where("instructor", "==", instructorId),
				where("class", "==", classId)
			);
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				goToChat(classId, querySnapshot?.docs[0]?.id);
				return;
			}

			toast.error("Chat not found !", {
				toastId: "chatError1",
			});
		} catch (error) {
			toast.error("Chat loading error !", {
				toastId: "chatError2",
			});
			console.warn(error);
		}

		return;
	};

	// Handle Chat Button
	const handleChatButton = async () => {
		const now = Timestamp?.now();
		const temMinutesAgo = new Date(now.toMillis() - 10 * 60 * 1000);

		const studentId = user?.uid;
		const instructorId = classCreatorData?.userUid;
		const classId = id;
		const newChatRoomData = {
			instructor: instructorId,
			student: studentId,
			class: classId,
			messages: [],
			createdAt: Timestamp?.now?.(),
			lastMessage: Timestamp?.fromDate?.(temMinutesAgo),
		};
		const goToChat = (cid, chid) =>
			router.push({
				pathname: "/chat",
				query: {
					cid,
					chid,
				},
			});

		// check if chatroom exists else create one
		try {
			const chatRoomRef = collection(db, "chatrooms");
			const q = query(
				chatRoomRef,
				where("student", "==", studentId),
				where("instructor", "==", instructorId),
				where("class", "==", classId)
			);
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				goToChat(classId, querySnapshot?.docs[0]?.id);
				return;
			}

			const newChatRoomRef = await addDoc(chatRoomRef, newChatRoomData);
			goToChat(classId, newChatRoomRef.id);
		} catch (error) {
			toast.error("Chat loading error !", {
				toastId: "chatError2",
			});
			console.warn(error);
		}

		return;
	};

	// Handle Booking
	const handleBooking = async () => {
		const classId = id;
		router.push({
			pathname: "/booking",
			query: {
				id: classId,
			},
		});
	};

	return (
		<div className="py-7 px-2">
			<h2 className="text-2xl font-extrabold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
				{name}
			</h2>

			<div className="classLinks flex justify-between items-center flex-wrap">
				<div className="icons my-3 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6 mt-1">
					<div className="mt-2 flex items-center text-sm text-gray-500">
						<BriefcaseIcon className="h-5 w-5 mr-1" fill="#AF816C" />
						{category} / {type}
					</div>

					<div className="mt-2 flex items-center text-sm text-gray-500">
						<CurrencyDollarIcon className="h-5 w-5 mr-1" fill="#58C18E" />
						{price}
					</div>
					<div className="mt-2 flex items-center text-sm text-gray-500">
						<CalendarIcon className="h-5 w-5 mr-1" fill="#E73F2B" />
						Available
					</div>
					{classCreatorData && (
						<div className="mt-2 flex items-center text-sm text-gray-500">
							<a
								href={`/profile/${data?.classCreator}`}
								className="hover:underline flex justify-center items-center"
							>
								<UserCircleIcon
									className="h-5 w-5 mr-1 inline-block"
									fill="#E73F2B"
								/>
								{classCreatorData.firstName + " " + classCreatorData.lastName}
							</a>
						</div>
					)}
				</div>

				{user && user?.uid === data?.classCreator && (
					<div className="editButton mb-5">
						<button
							onClick={() => handleEditButton()}
							type="submit"
							className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm"
						>
							Edit
						</button>
					</div>
				)}
			</div>

			<div className="topimageContainer flex flex-wrap w-full gap-3">
				<div className="leftSide lg:w-[70%] xl:w-[70%] xs:w-full sm:w-full">
					<div className="relative w-[100%] h-[450px] xl:max-w-[80vw] lg:max-w-[80vw] sm:max-w-full">
						<Swiper
							navigation={true}
							pagination={true}
							modules={[Navigation, Pagination]}
							className="mySwiper rounded-xl overflow-hidden"
						>
							{images &&
								images.map((img, index) => {
									if (
										typeof img !== "object" ||
										(typeof img === "object" && img.type.includes("image"))
									) {
										const url = img?.url || img;
										return (
											<SwiperSlide key={`${url} ${index}`}>
												<div className="relative h-[450px] w-full rounded-xl overflow-hidden">
													<div
														className="absolute top-0 left-0 h-full w-full -z-10 overflow-hidden bg-cover bg-center bg-no-repeat blur-sm brightness-70"
														style={{
															backgroundImage: `url(${url})`,
														}}
													/>
													<img
														className="object-contain h-full mx-auto"
														src={url}
														alt="images"
													/>
												</div>
											</SwiperSlide>
										);
									} else {
										return (
											<SwiperSlide key={`${img.url} ${index}`}>
												<div className="relative h-[450px] w-full rounded-xl overflow-hidden bg-black bg-opacity-90">
													<video
														className="object-contain h-full mx-auto"
														src={img.url}
														alt="video"
														loop={true}
														autoPlay={true}
														muted
													/>
												</div>
											</SwiperSlide>
										);
									}
								})}
						</Swiper>
					</div>

					<div className="about mb-3 mt-5">
						<h1 className="text-xl font-semibold text-logo-red">About</h1>
						<p className="text-md text-gray-700">{about}</p>
					</div>
					<div className="experience my-3">
						<h1 className="text-xl font-semibold text-logo-red">Experience</h1>
						<p className="text-md text-gray-700 whitespace-pre-line">{experience}</p>
					</div>
					<div className="description my-3">
						<h1 className="text-xl font-semibold text-logo-red">
							Class Description
						</h1>
						<p className="text-md text-gray-700">{description}</p>
					</div>
					<div className="pricing my-3">
						<h1 className="text-xl font-semibold text-logo-red">Pricing</h1>
						<p className="text-md text-gray-700">{pricing}</p>
					</div>
					<div className="funfact my-3">
						<h1 className="text-xl font-semibold text-logo-red">Fun Fact</h1>
						<p className="text-md text-gray-700">{funfact}</p>
					</div>
				</div>
				<div className="rightSide lg:w-[20%] xl:w-[20%] xs:w-full sm:w-full text-gray-700 text-md">
					<section className="">
						<div className="icon m-3 flex gap-2">
							<span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="#E73F2B"
									className="w-6 h-6"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
									/>
								</svg>
							</span>
							{/* <p>Lorem, ipsum.</p> */}
							<p className="hover:text-logo-red">
								<a target="_blank" href={addresslink}>
									{address}
								</a>
							</p>
						</div>

						{/* interested button */}
						{/* <div className="interestButton">
							{!user ? (
								<button
									onClick={(e) => handleInterestButton(e)}
									className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="inline w-5 h-5 mr-2"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
										/>
									</svg>
									I am Interested
								</button>
							) : user && !isInterested && !userIsInstructor ? (
								<button
									onClick={(e) => handleInterestButton(e)}
									className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="inline w-5 h-5 mr-2"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
										/>
									</svg>
									I am Interested
								</button>
							) : !authStateLoading && isInterested ? (
								<button
									disabled={true}
									className="disabled:opacity-50 w-[200px] active:duration-75 transition-all hover:scale-[1.01]  ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										className="inline w-5 h-5 mr-2"
									>
										<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
									</svg>
									You showed Interest
								</button>
							) : user && userIsInstructor && !isInterested ? (
								""
							) : (
								<section className="flex justify-center items-center">
									<Image
										src="/Rolling-1s-200px.svg"
										width={"30px"}
										height={"30px"}
									/>
								</section>
							)}
						</div> */}

						{/* chat/schedule button */}
						{!!user ? (
							isInstructor ? (
								<>
									<button
										onClick={(e) => handleBooking()}
										className="active:scale-105 w-full active:duration-75 transition-all hover:scale-[1.01] ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm mt-4 mb-4"
									>
										Class Booking Schedule
									</button>

									<div className="flex flex-col bg-gray-100 p-4 rounded-xl border shadow-sm">
										<h1 className="text-logo-red font-bold mb-4">
											Chats with students
										</h1>

										{/* chatrooms */}
										{!loadingRooms ? (
											chatRooms?.length > 0 ? (
												chatRooms?.map?.((cr, index) => (
													<div
														key={`${index}${cr?.sid}`}
														onClick={(e) => handleChatOpen(cr?.sid)}
														className="flex rounded-md items-center border-t p-4 mb-1 cursor-pointer bg-gray-200 hover:opacity-80 duration-150 ease-in-out"
													>
														<img
															src={cr?.profileImage ?? "/avatar.png"}
															alt="avatar_img"
															className="h-12 object-contain rounded-full bg-gray-100 p-1"
														/>
														<div className="ml-3">
															<h1 className="font-medium font text-gray-700">
																{cr?.studentName ?? "name not found"}
															</h1>
															<h1 className="text-xs text-gray-400">Student</h1>
														</div>
													</div>
												))
											) : (
												<h1 className="mx-auto py-6 px-2 text-gray-700 font-bold opacity-60">
													Chats Empty
												</h1>
											)
										) : (
											<div className="border-t border-logo-red h-6 w-6 mx-auto my-4 rounded-full animate-spin"></div>
										)}
									</div>
								</>
							) : (
								<div>
									<button
										onClick={(e) => handleChatButton(e)}
										className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01] ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm mt-4"
									>
										Chat with Instructor
									</button>

									<button
										onClick={(e) => handleBooking()}
										className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01] ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm mt-4"
									>
										Booking Schedule
									</button>
								</div>
							)
						) : (
							<div>
								<button
									onClick={(e) => {
										toast.warning("Login to use this feature !", {
											toastId: "loginError1",
										});
									}}
									className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01] ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm mt-4"
								>
									Chat with Instructor
								</button>

								<button
									onClick={(e) => {
										toast.warning("Login to use this feature !", {
											toastId: "loginError1",
										});
									}}
									className="active:scale-105 w-[200px] active:duration-75 transition-all hover:scale-[1.01] ease-in-out transform py-2 bg-logo-red rounded-xl text-white font-semibold text-sm mt-4"
								>
									Booking Schedule
								</button>
							</div>
						)}

						{/* <div className="icon m-3 flex gap-2">
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
                        </div> */}
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

			{/* Schedule */}
			{!isInstructor && !loading && !authStateLoading && (
				<div className="my-10">
					{!user ? (
						<>
							<p className="text-3xl font-extrabold mb-2">Booking Schedule</p>
							<p className="text-xl font-bold text-center pt-10">
								Please sign in to view schedule!
							</p>
						</>
					) : (
						<>
							<p className="text-3xl font-extrabold mb-2">Booking Schedule</p>
							<Booking component={true} />
						</>
					)}
				</div>
			)}
			<br />
			<br />
			<br />
			<hr />
			<br />

			{/* Ratings */}
			{currentClassReview.length !== 0 && (
				<div className="avgReview mt-3">
					<p className="text-3xl font-extrabold mt-5">Customer Reviews</p>
					<div className="container flex item-center gap-x-2 my-5">
						<p className="font-extrabold text-2xl">{`${Math.round(
							avgReview
						)}.0`}</p>
						<Rating
							className="block"
							initialRating={Math.round(avgReview)}
							readonly={true}
							half={false}
							emptySymbol={
								<span className="block ">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="w-6 h-6"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
										/>
									</svg>
								</span>
							}
							placeholderSymbol={
								<StarIcon className="text-logo-red  text-6xl inline-block" />
							}
							fullSymbol={
								<StarIcon className="text-logo-red  text-6xl inline-block" />
							}
						/>
						<p className="font-bold">
							Based on {currentClassReview.length} Customer Review
						</p>
					</div>
					<hr />
				</div>
			)}

			{!loading && !authStateLoading ? (
				reviews.filter((rev) => rev[0].classID === id)?.length !== 0 ? (
					reviews
						.filter((rev) => rev[0].classID === id)
						.map((review, index) => {
							return (
								<div key={index} className="reviewShow my-10 flex flex-col">
									<div className="img flex gap-6 items-center">
										{review[0]?.photo !== " " ? (
											<img
												className="inline-block h-12 w-12 rounded-full ring-2 ring-white"
												src={review[0]?.photo}
												alt="avatar1"
											/>
										) : (
											<img
												className="inline-block h-12 w-12 rounded-full ring-2 ring-white"
												src="./avataricon.png"
												alt="avatar"
											/>
										)}

										<p className="m-0 p-0 text-md text-gray-700">
											{review[0]?.name}
										</p>
									</div>
									<div className="name_ratings w-full">
										<div className="ratings w-full flex justify-between flex-wrap items-start my-3">
											<div className="recommend">
												<p className="text-xs text-gray-700">Would Recommend</p>
												<Rating
													className="block"
													initialRating={review?.[0].recommendRating}
													readonly={true}
													emptySymbol={
														<span className="block ">
															<svg
																xmlns="http://www.w3.org/2000/svg"
																fill="none"
																viewBox="0 0 24 24"
																strokeWidth={1.5}
																stroke="currentColor"
																className="w-6 h-6"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
																/>
															</svg>
														</span>
													}
													placeholderSymbol={
														<StarIcon className="text-logo-red  text-5xl inline-block" />
													}
													fullSymbol={
														<StarIcon className="text-logo-red  text-5xl inline-block" />
													}
												/>
											</div>
											<div className="recommend">
												<p className="text-xs text-gray-700">
													Instructor Quality
												</p>
												<Rating
													className="block"
													initialRating={review?.[0].qualityRating}
													readonly={true}
													emptySymbol={
														<span className="block ">
															<svg
																xmlns="http://www.w3.org/2000/svg"
																fill="none"
																viewBox="0 0 24 24"
																strokeWidth={1.5}
																stroke="currentColor"
																className="w-6 h-6"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
																/>
															</svg>
														</span>
													}
													placeholderSymbol={
														<StarIcon className="text-logo-red  text-5xl inline-block" />
													}
													fullSymbol={
														<StarIcon className="text-logo-red  text-5xl inline-block" />
													}
												/>
											</div>
											<div className="recommend">
												<p className="text-xs text-gray-700">Safety</p>
												<Rating
													className="block"
													initialRating={review?.[0].safetyRating}
													readonly={true}
													emptySymbol={
														<span className="block ">
															<svg
																xmlns="http://www.w3.org/2000/svg"
																fill="none"
																viewBox="0 0 24 24"
																strokeWidth={1.5}
																stroke="currentColor"
																className="w-6 h-6"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
																/>
															</svg>
														</span>
													}
													placeholderSymbol={
														<StarIcon className="text-logo-red  text-5xl inline-block" />
													}
													fullSymbol={
														<StarIcon className="text-logo-red  text-5xl inline-block" />
													}
												/>
											</div>
										</div>
									</div>
									<div className="review mb-5">
										<p className="text-md text-gray-700 italic">
											{review?.[0].review}
										</p>
									</div>
									<hr />
								</div>
							);
						})
				) : (
					<>
						<p className="text-2xl font-extrabold mt-5">Customer Reviews</p>
						<p className="text-center text-xl text-gray-700 my-20">
							No Reviews yet
						</p>
						<hr />
					</>
				)
			) : (
				<>
					<section className="flex justify-center items-center min-h-[100vh]">
						<Image src="/Rolling-1s-200px.svg" width={"60px"} height={"60px"} />
					</section>
				</>
			)}

			{user ? (
				<div className="reviewFormContainer my-3">
					<p className="text-2xl font-extrabold mb-6">Write a Review!</p>
					<form onSubmit={(e) => handleFormSubmit(e)}>
						{/* <div className='my-3'>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Name</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <input type="text" required name="name" id="name" className="block w-full rounded-md border-gray-300 pl-2 pr-2 focus:border-logo-red focus:ring-logo-red sm:text-sm" placeholder="Your Name" />

                        </div>
                    </div> */}

						<div className="ratings flex flex-wrap justify-between items-center lg:w-[70%] sm:w-[100%] xl:w-[70%] ">
							<div className="recommended flex flex-col justify-center ">
								<p className="px-0 mx-0 text-gray-700 text-sm">
									Would Recommend{" "}
								</p>
								<Rating
									className="block"
									initialRating={recommend}
									readonly={false}
									emptySymbol={
										<span className="block ">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="w-6 h-6"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
												/>
											</svg>
										</span>
									}
									placeholderSymbol={
										<StarIcon className="text-logo-red  text-5xl inline-block" />
									}
									fullSymbol={
										<StarIcon className="text-logo-red  text-5xl inline-block" />
									}
									onChange={(event) => {
										setRecommend(event);
									}}
								/>
							</div>
							<div className="quality flex flex-col justify-center ">
								<p className="px-0 mx-0 text-gray-700 text-sm">
									Instructor Quality
								</p>
								<Rating
									className="block"
									readonly={false}
									initialRating={quality}
									emptySymbol={
										<span className="block ">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="w-6 h-6"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
												/>
											</svg>
										</span>
									}
									placeholderSymbol={
										<StarIcon className="text-logo-red  text-5xl inline-block" />
									}
									fullSymbol={
										<StarIcon className="text-logo-red  text-5xl inline-block" />
									}
									onChange={(event) => {
										setQuality(event);
									}}
								/>
							</div>
							<div className="safety flex flex-col justify-center ">
								<p className="px-0 mx-0 text-gray-700 text-sm">Safety </p>
								<Rating
									className="block"
									readonly={false}
									initialRating={safety}
									emptySymbol={
										<span className="block ">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												strokeWidth={1.5}
												stroke="currentColor"
												className="w-6 h-6"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
												/>
											</svg>
										</span>
									}
									placeholderSymbol={
										<StarIcon className="text-logo-red  text-5xl inline-block" />
									}
									fullSymbol={
										<StarIcon className="text-logo-red  text-5xl inline-block" />
									}
									onChange={(event) => {
										setSafety(event);
									}}
								/>
							</div>
						</div>

						<div className="my-3">
							<label
								htmlFor="price"
								className="block text-sm font-medium text-gray-700"
							>
								Review
							</label>
							<div className="relative mt-1 rounded-md shadow-sm">
								<textarea
									rows={6}
									type="text"
									required
									name="review"
									id="review"
									className="block w-full rounded-md border-gray-300 pl-2 pr-2 focus:border-logo-red focus:ring-logo-red sm:text-sm"
									placeholder="Your Review"
								/>
							</div>
						</div>

						{!loading ? (
							<button
								type="submit"
								className="group relative flex w-full justify-center rounded-md border border-transparent bg-logo-red py-2 px-4 text-sm font-medium text-white hover:bg-logo-red focus:outline-none focus:ring-2 focus:ring-logo-red focus:ring-offset-2"
							>
								Post
							</button>
						) : (
							<button
								type="submit"
								className="group relative flex w-full justify-center rounded-md border border-transparent bg-slate-400 py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-logo-red focus:ring-offset-2 disabled:"
							>
								Posting
							</button>
						)}
					</form>
				</div>
			) : (
				<div className="reviewRequest">
					<p className="text-xl font-bold text-center pt-10">
						Please sign in to give reviews!
					</p>
				</div>
			)}
		</div>
	);
};

export default ClassHeading;
