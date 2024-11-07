// Booking.js
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Head from "next/head";
// library
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
	BriefcaseIcon,
	CalendarIcon,
	CurrencyDollarIcon,
} from "@heroicons/react/solid";
import { toast } from "react-toastify";
// firebase
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebaseConfig";
import {
	collection,
	doc,
	getDoc,
	getDocs,
	onSnapshot,
	orderBy,
	query,
	where,
} from "firebase/firestore";
// components
import Header from "../components/Header";
import AddBooking from "../components/AddBooking";
import Details from "../components/BookingDetails";
// utils
import {
	getDateOnly,
	isAfter30Days,
	isBeforeNow,
	isBeforeToday,
} from "../utils/date";
import AddAvailability from "../components/AddAvailability";
import {
	alreadyHasAvailability,
	getDateList,
	getFlatList,
} from "../utils/slots";
const localizer = momentLocalizer(moment);

/* COLORS */
const red = "rgb(245, 0, 0, 0.05)";
const darkGreen = "rgb(0, 190, 0, 0.8)";
const green = "rgb(0, 190, 0, 0.5)";
const darkGray = "rgb(210, 210, 210)";
const gray = "rgb(230, 230, 230, 0.4)";

export default function Booking({ component = false }) {
	const router = useRouter();
	// user & class
	const { id: classId } = router.query;
	const [user] = useAuthState(auth);
	const [userData, setUserData] = useState(null);
	const [classData, setClassData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const uid = user?.uid;
	const uName = `${userData?.firstName ?? ""} ${userData?.lastName ?? ""}`;

	// if user is instructor
	const isInstructor = user?.uid === classData?.classCreator;
	const [showAvailability, setShowAvailability] = useState(false);

	// if user is not instructor
	const [showList, setShowList] = useState(true);

	// appointment
	const [availability, setAvailability] = useState([]);
	const [appointments, setAppointments] = useState([]);

	// dialogs
	const [showAddForm, setShowAddForm] = useState(false);
	const [slotDate, setSlotDate] = useState(null);
	const [initialStart, setInitialStart] = useState(null);
	const [initialEnd, setInitialEnd] = useState(null);
	const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
	const [appointmentDetails, setAppointmentDetails] = useState(null);

	/**
	 * UTILITY FUNCTIONS
	 */

	// redirect to main page
	const goToMainPage = () => router.push("/");

	// get data from db
	const getData = async (xid, xcol) => {
		const docRef = doc?.(db, xcol, xid);
		const data = await getDoc?.(docRef);
		return data?.data?.();
	};

	// check id
	useEffect(() => {
		if ((router.isReady && !classId) || (router.isReady && !user))
			goToMainPage();
	}, [classId, router.isReady, user]);

	// close modals
	const handleCloseModal = () => {
		setInitialStart(null);
		setInitialEnd(null);
		setShowAppointmentDetails(false);
		setShowAddForm(false);
	};

	// appointment styles
	const eventStyleGetter = (event) => {
		return {
			style: {
				backgroundColor: isBeforeNow(event.end) ? darkGray : darkGreen,
				color: isBeforeNow(event.end) ? "black" : "white",
				display: isInstructor || event.owner === uid ? "block" : "none",
				textAlign: "center",
				padding: window.innerWidth > 768 ? "4px" : "1px 4px",
				cursor: !!event?.availability ? "default" : "pointer",
				borderRadius: "1000px",
				fontSize: "13px",
			},
		};
	};

	const dayPropGetter = (date) => {
		return {
			style: {
				backgroundColor: isBeforeToday(date)
					? gray
					: !isInstructor &&
					  alreadyHasAvailability(availability, date) &&
					  green,
			},
		};
	};

	/**
	 * DATA FUNCTIONS
	 */

	// get appointments
	const getAppointments = async () => {
		try {
			const querySnapshot = await getDocs(
				query(collection(db, "appointments"), where("class", "==", classId))
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

	// get availability
	const getAvailability = async () => {
		try {
			const querySnapshot = await getDocs(
				query(collection(db, "schedule"), where("class", "==", classId))
			);

			const apps = querySnapshot?.docs?.map?.((app) => app?.data?.());
			setAvailability(apps || []);
		} catch (error) {
			toast.error("Availability loading error !", {
				toastId: "avlError3",
			});
			console.warn(error);
		}
	};

	// get availability data on change
	useEffect(() => {
		const observeAvailability = async () => {
			try {
				onSnapshot(query(collection(db, "schedule")), async (querySnapshot) => {
					const ch = querySnapshot
						.docChanges()
						.find((change) => change?.doc?.data()?.class === classId);

					if (ch) {
						await getAvailability();
					}
				});
			} catch (error) {
				toast.error("Appointments observing error !", {
					toastId: "appError3",
				});
				console.warn(error);
			}
		};

		if (isInstructor && !!classId) observeAvailability();
	}, [isInstructor, classId]);

	// get appointments data on change
	useEffect(() => {
		const observeAppointments = async () => {
			try {
				onSnapshot(
					query(collection(db, "appointments")),
					async (querySnapshot) => {
						const ch = querySnapshot
							.docChanges()
							.find((change) => change?.doc?.data()?.class === classId);

						if (ch) {
							await getAppointments();
						}
					}
				);
			} catch (error) {
				toast.error("Appointment observing error !", {
					toastId: "appError4",
				});
				console.warn(error);
			}
		};

		if (!!classId) observeAppointments();
	}, [classId]);

	// get all data
	useEffect(() => {
		const getAllData = async () => {
			try {
				setIsLoading(true);
				const cData = await getData(classId, "classes");
				const uData = await getData(uid, "Users");
				setClassData(await cData);
				setUserData(await uData);

				await getAppointments();
				await getAvailability();

				setIsLoading(false);
			} catch (error) {
				setIsLoading(false);
				toast.error("Class Data loading error !", {
					toastId: "classError3",
				});
				console.warn(error);
			}
		};

		if (!!classId && !!user) getAllData();
	}, [classId, user]);

	/**
	 * APPOINTMENTS FUNCTIONS
	 */

	// slot click
	const handleSlotClick = (slot, isDirect = false) => {
		const slotDate = getDateOnly(slot.start);
		if (
			isBeforeNow(slotDate) ||
			(isInstructor && !showAvailability) ||
			(isInstructor &&
				showAvailability &&
				alreadyHasAvailability(availability, slotDate))
		)
			return;
		if (!!isDirect) {
			setInitialStart(slot.start);
			setInitialEnd(slot.end);
		}

		setSlotDate(slotDate);
		setShowAddForm(true);
	};

	// appointment details
	const handleAppointmentClick = (appointment) => {
		if (
			(!isInstructor && appointment.owner !== uid) ||
			!!appointment?.availability
		)
			return;
		setAppointmentDetails(appointment);
		setShowAppointmentDetails(true);
	};

	return isLoading || !classData || !userData || !classId || !user ? (
		<section className="flex justify-center items-center min-h-[100vh]">
			<Image src="/Rolling-1s-200px.svg" width={"60px"} height={"60px"} />
		</section>
	) : component &&
	  getFlatList(availability).filter((a) => !isBeforeNow(getDateOnly(a.start)))
			.length === 0 ? (
		<>
			<p className="text-center text-xl text-gray-700 my-20">
				No upcomming availability provided by instructor. Chat with instructor to request availability!
			</p>
		</>
	) : (
		<div className={`flex flex-col mx-auto ${!component && "min-h-screen"}`}>
			{!component && (
				<>
					{/* head */}
					<Head>
						<title>Booking</title>
						<meta name="description" content="Generated by create next app" />
						<link rel="icon" href="/pc_favicon.ico" />
					</Head>

					{/* header */}
					<Header />
				</>
			)}
			{/* booking container */}
			<div
				className={`bg-white flex-1 flex flex-col ${
					!component
						? " p-2 md:p-12"
						: " max-h-screen overflow-y-auto smallScrollbar"
				}`}
			>
				{!component && (
					<>
						<h1 className="capitalize text-logo-red text-2xl md:text-4xl font-medium pb-1">
							{classData?.Name}
						</h1>

						<div className="icons my-3 flex flex-row flex-wrap mb-10">
							<div className="mt-2 mr-4 flex items-center text-sm text-gray-500">
								<BriefcaseIcon className="h-5 w-5 mr-1" fill="#AF816C" />
								{classData?.Category} / {classData?.Type}
							</div>

							<div className="mt-2 mr-4 flex items-center text-sm text-gray-500">
								<CurrencyDollarIcon className="h-5 w-5 mr-1" fill="#58C18E" />
								{classData?.Price}
							</div>
							<div className="mt-2 w-full md:w-fit flex items-center text-sm text-gray-500">
								<CalendarIcon className="h-5 w-5 mr-1" fill="#E73F2B" />
								Available
							</div>
						</div>
					</>
				)}
				<div
					className={`p-4 pt-4 md:p-10 md:pt-8 w-full min-h-fit flex-1 flex flex-col ${
						!component &&
						" bg-white shadow-lg border rounded-3xl overflow-hidden"
					}`}
				>
					{/* availability */}
					{!component && !!user && !!isInstructor && (
						<div className="flex mb-10 rounded-full border border-logo-red w-fit shadow-md">
							<button
								className={`w-[140px] md:w-[200px] py-1 rounded-l-full font-medium duration-300 ease-in-out ${
									!showAvailability
										? " bg-logo-red text-white"
										: " bg-slate-100 text-gray-700"
								}`}
								onClick={() => setShowAvailability(false)}
							>
								Bookings
							</button>

							<button
								className={`w-[140px] md:w-[200px] py-1 rounded-r-full font-medium duration-300 ease-in-out ${
									showAvailability
										? " bg-logo-red text-white"
										: " bg-slate-100 text-gray-700"
								}`}
								onClick={() => setShowAvailability(true)}
							>
								Your Availability
							</button>
						</div>
					)}

					{/* availability display */}
					{!component && !!user && !isInstructor && (
						<div className="flex mb-10 rounded-full border border-logo-red w-fit shadow-md">
							<button
								className={`w-[140px] md:w-[200px] py-1 rounded-l-full font-medium duration-300 ease-in-out ${
									showList
										? " bg-logo-red text-white"
										: " bg-slate-100 text-gray-700"
								}`}
								onClick={() => setShowList(true)}
							>
								List
							</button>

							<button
								className={`w-[140px] md:w-[200px] py-1 rounded-r-full font-medium duration-300 ease-in-out ${
									!showList
										? " bg-logo-red text-white"
										: " bg-slate-100 text-gray-700"
								}`}
								onClick={() => setShowList(false)}
							>
								Calendar
							</button>
						</div>
					)}

					{(!!user && !isInstructor && !!showList) || component ? (
						getFlatList(availability)
							?.sort((a, b) => new Date(a.start) - new Date(b.start))
							?.map?.((a, i) => {
								const slotDate = getDateOnly(a.start);
								const isDisabled =
									isBeforeNow(slotDate) ||
									(isInstructor && !showAvailability) ||
									(isInstructor &&
										showAvailability &&
										alreadyHasAvailability(availability, slotDate));

								return (
									!isDisabled && (
										<div
											key={`${a.start} ${i}`}
											className={`flex flex-col md:flex-row md:items-center p-3  border-b ${
												i === 0 && "border-t"
											}`}
										>
											<div>
												<p className="text-logo-red text-xs font-medium">
													Available
												</p>
												<p className="font-medium">
													{new Date(a.start).toLocaleDateString()}
												</p>
											</div>

											<div className="flex items-center md:ml-40">
												<p className="text-sm font-medium text-gray-600">
													{new Date(a.start).toLocaleTimeString()}
												</p>
												<p className="mx-1">-</p>
												<p className="text-sm font-medium text-gray-600">
													{new Date(a.end).toLocaleTimeString()}
												</p>
											</div>

											<button
												className="ml-auto py-1 px-4 bg-transparent border border-logo-red text-logo-red rounded-full font-medium text-sm hover:opacity-30 ease-in-out duration-300 disabled:opacity-30 disabled:grayscale-[90%] mt-4 sm:mt-0"
												onClick={() => {
													!!user
														? handleSlotClick(a, true)
														: toast.warning("Login to use this feature !", {
																toastId: "loginError1",
														  });
												}}
											>
												Open
											</button>
										</div>
									)
								);
							})
					) : (
						<Calendar
							className="min-h-[750px] md:min-h-[600px] flex-1 w-full"
							localizer={localizer}
							events={
								!isInstructor
									? getDateList(appointments)?.filter?.((a) => a?.owner === uid)
									: showAvailability
									? getFlatList(availability)
									: getDateList(appointments)
							}
							startAccessor="start"
							endAccessor="end"
							selectable={true}
							onSelectSlot={handleSlotClick}
							onSelectEvent={handleAppointmentClick}
							eventPropGetter={eventStyleGetter}
							dayPropGetter={dayPropGetter}
							longPressThreshold={100}
						/>
					)}
				</div>

				{showAddForm &&
					(isInstructor ? (
						<AddAvailability
							slotDate={slotDate}
							closeModal={handleCloseModal}
							classId={classId}
							uEmail={userData?.email}
						/>
					) : (
						<>
						<AddBooking
							slotDate={slotDate}
							availability={availability}
							appointments={appointments}
							closeModal={handleCloseModal}
							uName={uName}
							uEmail={userData?.email}
							uid={uid}
							classId={classId}
							className={classData?.Name}
							insId={classData?.classCreator}
							price={classData?.Price}
							initialStart={initialStart}
							initialEnd={initialEnd}

							groupType={classData?.groupType}
							classStudents={classData?.classStudents}
							remainingSeats={classData?.remainingSeats}
							bookingslotInfo={classData?.bookings}						
						/>
						</>
					))}

				{showAppointmentDetails && (
					<Details
						appointmentDetails={appointmentDetails}
						closeModal={handleCloseModal}
						isInstructor={isInstructor}
					/>
				)}
			</div>
		</div>
	);
}