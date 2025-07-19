// Booking.js
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
import NewHeader from "../components/NewHeader";

const getUserName = (users, id) => {
	const us = users?.find?.((u) => u.id === id);
	return `${us?.firstName ?? ""} ${us?.lastName ?? ""}`;
};

export default function Dashboard() {
	const router = useRouter();
	// user & class
	const [user] = useAuthState(auth);
	const [userData, setUserData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const uid = user?.uid;

	// data
	const [users, setUsers] = useState(null);
	const [appointments, setAppointments] = useState(null);
	const [classes, setClasses] = useState(null);
	const [tab, setTab] = useState("users");

	const usersFinal = users?.map?.((u) => ({
		...u,
		name: getUserName(users, u.id),
		appointments: appointments?.filter?.((a) => a.owner === u.id)?.length,
	}));

	const classesFinal = classes?.map?.((c) => ({
		...c,
		instructorName: getUserName(users, c.classCreator),
		appointments: appointments?.filter?.((a) => a.class === c.id)?.length,
	}));

	const appointmentsFinal = appointments?.map?.((a) => ({
		...a,
		price: classes?.find?.((c) => c.id === a.class)?.Price,
		className: classes?.find?.((c) => c.id === a.class)?.Name,
		instructorName: getUserName(users, a.instructor),
		ownerName: getUserName(users, a.owner),
	}));

	// redirect to main page
	const goToMainPage = () => router.push("/");

	// check user type
	useEffect(() => {
		if (userData && !userData?.isAdmin) goToMainPage();
	}, [userData]);

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
				query(collection(db, "appointments"))
			);

			const apps = querySnapshot?.docs?.map?.((app) => ({
				...app?.data?.(),
				id: app?.id,
			}));
			setAppointments(apps || []);
		} catch (error) {
			toast.error("Appointments loading error !", {
				toastId: "appError3",
			});
			console.warn(error);
		}
	};

	// get users
	const getUsers = async () => {
		try {
			const querySnapshot = await getDocs(query(collection(db, "Users")));

			const apps = querySnapshot?.docs?.map?.((app) => ({
				...app?.data?.(),
				id: app?.id,
			}));
			setUsers(apps || []);
		} catch (error) {
			toast.error("Users loading error !", {
				toastId: "usError3",
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
				const uData = await getData(uid, "Users");
				setUserData(await uData);

				await getAppointments();
				await getUsers();
				await getClasses();

				setIsLoading(false);
			} catch (error) {
				setIsLoading(false);
				toast.error("Class Data loading error !", {
					toastId: "classError3",
				});
				console.warn(error);
			}
		};

		if (!!user) getAllData();
	}, [user]);

	// render table
	const renderTable = () => {
		if (tab === "users") {
			return (
				<table class="w-full border-collapse border overflow-x-auto shadow">
					<thead class="bg-logo-red bg-opacity-80 text-white">
						<tr>
							<th class="py-2 text-center max-w-[100px] border-r">User Id</th>
							<th class="py-2 text-center max-w-[150px] border-r">Name</th>
							<th class="py-2 text-center max-w-[150px] border-r">Email</th>
							<th class="py-2 text-center max-w-[150px] border-r">Phone</th>
							<th class="py-2 text-center max-w-[80px]">Appointments</th>
						</tr>
					</thead>
					<tbody>
						{usersFinal?.map?.((c, index) => (
							<tr
								key={index}
								className={`hover:bg-gray-200 text-gray-700 ${
									index % 2 == 0 ? " bg-gray-50" : " bg-gray-100"
								}`}
							>
								<td className="p-2 text-sm max-w-[100px] break-words border-r">
									{c?.id}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.name?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.email?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.phoneNumber?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm text-center max-w-[80px] break-words">
									{c?.appointments || " - "}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			);
		} else if (tab === "classes") {
			return (
				<table class="w-full border-collapse border overflow-x-auto shadow">
					<thead class="bg-logo-red bg-opacity-80 text-white">
						<tr>
							<th class="py-2 text-center max-w-[100px] border-r">Class Id</th>
							<th class="py-2 text-center max-w-[150px] border-r">Name</th>
							<th class="py-2 text-center max-w-[150px] border-r">
								Instructor Id
							</th>
							<th class="py-2 text-center max-w-[150px] border-r">
								Instructor Name
							</th>
							<th class="py-2 text-center max-w-[80px]">Appointments</th>
						</tr>
					</thead>
					<tbody>
						{classesFinal?.map?.((c, index) => (
							<tr
								key={index}
								className={`hover:bg-gray-200 text-gray-700 ${
									index % 2 == 0 ? " bg-gray-50" : " bg-gray-100"
								}`}
							>
								<td className="p-2 text-sm max-w-[100px] break-words border-r">
									{c?.id}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.Name?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.classCreator || " - - - "}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.instructorName?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm text-center max-w-[80px] break-words">
									{c?.appointments || " - "}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			);
		} else if (tab === "appointments") {
			return (
				<table class="w-full border-collapse border overflow-x-auto shadow">
					<thead class="bg-logo-red bg-opacity-80 text-white">
						<tr>
							<th class="py-2 text-center max-w-[100px] border-r">Id</th>
							<th class="py-2 text-center max-w-[100px] border-r">Owner</th>
							<th class="py-2 text-center max-w-[150px] border-r">
								Instructor
							</th>
							<th class="py-2 text-center max-w-[80px] border-r">Class</th>
							<th class="py-2 text-center max-w-[100px] border-r">Price</th>
							<th class="py-2 text-center max-w-[80px] border-r">Start</th>
							<th class="py-2 text-center max-w-[80px]">End</th>
						</tr>
					</thead>
					<tbody>
						{appointmentsFinal?.map?.((c, index) => (
							<tr
								key={index}
								className={`hover:bg-gray-200 text-gray-700 ${
									index % 2 == 0 ? " bg-gray-50" : " bg-gray-100"
								}`}
							>
								<td className="p-2 text-sm max-w-[100px] break-words border-r">
									{c?.id}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.ownerName?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.instructorName?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm max-w-[150px] break-words border-r">
									{c?.className?.trim?.() || " - - - "}
								</td>
								<td className="p-2 text-sm text-center max-w-[80px] break-words border-r">
									{c?.price?.trim?.() || " - "}
								</td>
								<td className="p-2 text-sm text-center max-w-[100px] break-words border-r">
									{moment?.unix?.(c?.start?.seconds)?.format("MMMM D, YYYY")}{" "}
									<br />{" "}
									{moment?.unix?.(c?.start?.seconds)?.format?.("hh:mm A")}
								</td>
								<td className="p-2 text-sm text-center max-w-[100px] break-words">
									{moment?.unix?.(c?.end?.seconds)?.format("MMMM D, YYYY")}{" "}
									<br /> {moment?.unix?.(c?.end?.seconds)?.format?.("hh:mm A")}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			);
		}
	};

	return isLoading || !classes || !users || !appointments || !userData ? (
		<section className="flex justify-center items-center min-h-[100vh]">
			<Image priority={true} src="/Rolling-1s-200px.svg" width={"60px"} height={"60px"} />
		</section>
	) : (
		<div className="mx-auto min-h-[100vh] flex flex-col">
			{/* head */}
			<Head>
				<title>Admin Dashboard</title>
				<meta name="description" content="Generated by create next app" />
				<link rel="icon" href="/pc_favicon.ico" />
			</Head>

			{/* header */}

			{/* application container */}
			<div className="bg-white flex-1 flex flex-col p-2 md:p-12">
				<h1 className="capitalize text-logo-red text-2xl md:text-4xl font-medium">
					Pocketclass Admin Dasboard
				</h1>

				<div className="mt-8 p-4 pt-4 md:p-10 md:pt-8 w-full min-h-fit flex-1 flex flex-col bg-white shadow-lg border rounded-3xl overflow-hidden">
					<p className="uppercase text-logo-red font-medium text-lg mb-3 mr-2">
						Pocketclass Stats
					</p>
					<div className="flex items-center justify-between flex-wrap text-gray-700 cursor-default">
						<p className="my-1 mx-2 flex-1 text-center bg-gray-100 p-4 rounded-md shadow hover:opacity-70">
							<strong>Total Classes:</strong> {classes?.length}
						</p>

						<p className="my-1 mx-2 flex-1 text-center  bg-gray-100 p-4 rounded-md shadow hover:opacity-70">
							<strong>Total Users:</strong> {users?.length}
						</p>

						<p className="my-1 mx-2 flex-1 text-center  bg-gray-100 p-4 rounded-md shadow hover:opacity-70">
							<strong>Total Instructors:</strong>{" "}
							{users?.filter((u) => u.isInstructor)?.length}
						</p>

						<p className="my-1 mx-2 flex-1 text-center  bg-gray-100 p-4 rounded-md shadow hover:opacity-70">
							<strong>Total Students:</strong>{" "}
							{users?.filter((u) => !u.isInstructor)?.length}
						</p>

						<p className="my-1 mx-2 flex-1 text-center  bg-gray-100 p-4 rounded-md shadow hover:opacity-70">
							<strong>Total Appointments:</strong> {appointments?.length}
						</p>
					</div>

					<p className="uppercase text-logo-red font-medium text-lg mt-5 mb-3 mr-2">
						Pocketclass Database
					</p>

					<div className="flex items-center flex-wrap">
						<button
							onClick={() => setTab("users")}
							className={`pb-1 m-2 md:ml-0 tracking-wide border-b-2 font-medium duration-150 ${
								tab === "users"
									? "text-logo-red border-logo-red"
									: " text-gray-700 border-gray-700"
							}`}
						>
							Users
						</button>

						<button
							onClick={() => setTab("classes")}
							className={`pb-1 m-2 tracking-wide border-b-2 font-medium duration-150 ${
								tab === "classes"
									? "text-logo-red border-logo-red"
									: " text-gray-700 border-gray-700"
							}`}
						>
							Classes
						</button>

						<button
							onClick={() => setTab("appointments")}
							className={`pb-1 m-2 tracking-wide border-b-2 font-medium duration-150 ${
								tab === "appointments"
									? "text-logo-red border-logo-red"
									: " text-gray-700 border-gray-700"
							}`}
						>
							Appointments
						</button>
					</div>

					<div className="mt-8 max-h-[600px] overflow-y-auto smallScrollbar">
						{renderTable()}
					</div>
				</div>
			</div>
		</div>
	);
}
