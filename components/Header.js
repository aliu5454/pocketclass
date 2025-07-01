import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  SearchIcon,
  GlobeAltIcon,
  MenuIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/solid";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DateRangePicker } from "react-date-range";
import { useRouter } from "next/router";
import { useAuthState, useSignOut } from "react-firebase-hooks/auth";
import { auth } from "/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import Link from "next/link";
import Notifications from "./Notifications";

function Header({ placeholder }) {
  const [searchInput, setSearchInput] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [noOfGuests, setNoOfGuests] = useState(1);
  const [category, setCategory] = useState("");
  const [showDropDown, setDropDown] = useState(false);
  const router = useRouter();

  const toggleDropDown = () => {
    setDropDown(!showDropDown);
  };

  const [user, loading, error] = useAuthState(auth);
  const [signOut, signOutLoading, signOutError] = useSignOut(auth);
  const [userData, setUserData] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [classes, setClasses] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [stripeIntegration, setStripeIntegration] = useState(true);
  const [classCreated, setClassCreated] = useState(true);
  const [scheduleCreated, setScheduleCreated] = useState(true);

  useEffect(() => {
    if (
      userData &&
      userData.firstName &&
      userData.lastName &&
      userData.email &&
      userData.gender &&
      userData.dob &&
      userData.phoneNumber &&
      userData.profileImage &&
      userData.profileDescription
    ) {
      setProfileCompleted(true);
    }

    if (userData && userData.stripeAccountId) {
      setStripeIntegration(true);
    }
  }, [userData]);

  useEffect(() => {console.log(userData)},[userData])
  useEffect(() => {
    if (classes && classes.length > 0) {
      setClassCreated(true);
    }
  }, [classes]);

  useEffect(() => {
    if (schedule) {
      setScheduleCreated(true);
    }
  }, [schedule]);

  useEffect(() => {
    const getData = async () => {
      const docRef = doc?.(db, "Users", user?.uid);
      const data = await getDoc?.(docRef);
      setUserData(data?.data?.());
      if (
        window.location.pathname === "/" &&
        data?.data()?.category === "instructor" &&
        !data?.data()?.stripeAccountId
      ) {
        toast.error("Please setup stripe to start earning");
      }
    };

    user && getData();
  }, [user]);

  useEffect(() => {
    const getData = async () => {
      const userId = user?.uid;
      const docRef = doc(db, "Schedule", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchedule(data);
      }
      const classesQuery = query(
        collection(db, "classes"),
        where("classCreator", "==", user.uid)
      );

      const docSnap2 = await getDocs(classesQuery);

      if (docSnap2.docs.length > 0) {
        const data = docSnap2.docs.map((doc) => doc.data());
        setClasses(data);
      }
    };

    if (userData && userData.category === "instructor") {
      getData();
    }
  }, [userData]);

  const selectionRange = {
    startDate: startDate,
    endDate: endDate,
    key: "selection",
  };

  const handleSelect = (ranges) => {
    setStartDate(ranges.selection.startDate);
    setEndDate(ranges.selection.endDate);
  };

  const resetInput = () => {
    setSearchInput("");
  };

  const search = () => {
    if (searchInput != "") {
      const lowerCase = searchInput.toLowerCase();
      const firstLetterUpperCase = lowerCase.substring(0, 1).toUpperCase();
      const exceptFirstLetter = lowerCase.substring(1, lowerCase.length);
      const finalSearchInput = firstLetterUpperCase + exceptFirstLetter;

      router.push({
        pathname: "/search",
        query: {
          searchInput: finalSearchInput,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          noOfGuests,
        },
      });
      setSearchInput("");
    }
  };

  const checkCategory = async (user) => {
    try {
      const docSnap = await getDoc(doc(db, "Users", user.uid));

      if (docSnap.exists()) {
        setCategory(docSnap.data().category);
      }
    } catch (error) {
      console.warn(error);
    }
  };

  if (user) {
    checkCategory(user);
  }

  return (
    <>
      {user &&
        userData &&
        userData.category === "instructor" &&
        (!stripeIntegration ||
          !classCreated ||
          !scheduleCreated ||
          !profileCompleted) && (
          <div className=" bg-gray-50">
            <div className="flex items-center text-logo-red px-2 justify-center text-base text-center lg:text-xl mt-3 mb-4 font-semibold">
            Please complete these steps to publish your class!
            </div>
            <div className="flex flex-col lg:flex-row px-4 bg-gray-50 gap-3 mt-2 mb-6 z-40">
              <div
                onClick={() => {
                  router.push("/profile/" + user.uid);
                }}
                className={`flex-grow  border-l-4 lg:border-t-4 lg:border-l-0  py-3 bg-gray-50 [font-family:Inter,sans-serif] cursor-pointer lg:rounded-b-md px-2 ${
                  profileCompleted ? "border-logo-red" : "border-gray-500"
                }`}
              >
                <div
                  style={{ fontWeight: "400" }}
                  className="text-logo-red text-sm"
                >
                  Step 1
                </div>
                <div
                  style={{ fontWeight: "500" }}
                  className="text-black text-base"
                >
                  Complete your Profile
                </div>
              </div>
              <div
                onClick={() => {
                  router.push("/createClass");
                }}
                className={`flex-grow  border-l-4 lg:border-t-4 lg:border-l-0  py-3 bg-gray-50 [font-family:Inter,sans-serif] cursor-pointer lg:rounded-b-md px-2 ${
                  classCreated ? "border-logo-red" : "border-gray-500"
                }`}
              >
                <div
                  style={{ fontWeight: "400" }}
                  className="text-logo-red text-sm"
                >
                  Step 2
                </div>
                <div
                  style={{ fontWeight: "500" }}
                  className="text-black text-base"
                >
                  Create a class
                </div>
              </div>
              <div
                onClick={() => {
                  router.push("/schedule");
                }}
                className={`flex-grow  border-l-4 lg:border-t-4 lg:border-l-0  py-3 bg-gray-50 [font-family:Inter,sans-serif] cursor-pointer lg:rounded-b-md px-2 ${
                  scheduleCreated ? "border-logo-red" : "border-gray-500"
                }`}
              >
                <div
                  style={{ fontWeight: "400" }}
                  className="text-logo-red text-sm"
                >
                  Step 3
                </div>
                <div
                  style={{ fontWeight: "500" }}
                  className="text-black text-base"
                >
                  Create Schedule
                </div>
              </div>
              <div
                onClick={() => {
                  router.push("/addStripe");
                }}
                className={`flex-grow  border-l-4 lg:border-t-4 lg:border-l-0  py-3 bg-gray-50 [font-family:Inter,sans-serif] cursor-pointer lg:rounded-b-md px-2 ${
                  stripeIntegration ? "border-logo-red" : "border-gray-500"
                }`}
              >
                <div
                  style={{ fontWeight: "400" }}
                  className="text-logo-red text-sm"
                >
                  Step 4
                </div>
                <div
                  style={{ fontWeight: "500" }}
                  className="text-black text-base"
                >
                  Connect Stripe
                </div>
              </div>
            </div>
          </div>
        )}
      <header className="sticky top-0 z-50 grid grid-cols-12 bg-white shadow-sm p-5 md:px-10">
        {/* left */}
        <div
          onClick={() => router.push("/")}
          className="relative flex items-center h-10 cursor-pointer my-auto col-span-3"
        >
          <Image
            priority={true}
            src="/pc_logo3.png"
            layout="fill"
            objectFit="contain"
            objectPosition="left"
          />
          <span className="absolute -top-2 left-0 bg-logo-red text-white px-1.5 py-0.5 text-[7px] font-bold transform rounded-full">
            BETA
          </span>
        </div>

        {/* middle - search*/}
        <div className="searchContainer col-span-5 md:col-span-6 flex justify-center items-center">
          <div className="flex items-center md:border-2 rounded-full py-2 md:shadow-sm sm:w-[100%] md:w-[100%] lg:w-[50%] xl:w-[50%]">
            <input
              value={searchInput}
              id="searchInputId"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && search()}
              type="text"
              placeholder={placeholder || "tennis, painting, violin..."}
              className=" text-gray-600 placeholder-gray-400 max-w-[100%] text-sm flex-grow bg-transparent border-transparent focus:border-transparent focus:ring-0"
            />
            <SearchIcon
              onClick={search}
              className="hidden md:inline-flex h-8 bg-logo-red text-white rounded-full p-2 mr-2 cursor-pointer hover:scale-105 transition transform duration-200 ease-out active:scale-90 "
            />
          </div>
        </div>

        {/* right */}
        <div className="flex items-center justify-end text-gray-500 space-x-4 col-span-4 md:col-span-3">
          {/* https://gm81lvnyohz.typeform.com/to/IoLpsf9g */}

          {/* <GlobeAltIcon className='h-6 cursor-pointer' /> */}

          {!loading || category !== "" ? (
            <>
              {category !== "" && user ? (
                category === "student" || category==="Student" ? (
                  <p className="text-sm hidden lg:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 p-3 hover:scale-105 active:scale-90 transition duration-150">
                    <a
                      target="_blank"
                      href="https://gm81lvnyohz.typeform.com/to/IoLpsf9g"
                    >
                      {category}
                      Request a Class
                    </a>
                  </p>
                ) : (
                  <p
                    onClick={() => router.push("/createClass")}
                    className="text-sm hidden lg:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 p-3 hover:scale-105 active:scale-90 transition duration-150"
                  >
                    Create Class
                  </p>
                )
              ) : user ? (
                <Image
                  priority={true}
                  src="/Rolling-1s-200px.svg"
                  width={"30px"}
                  height={"30px"}
                />
              ) : (
                <p className="text-sm hidden md:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 p-3 hover:scale-105 active:scale-90 transition duration-150">
                  <a
                    target="_blank"
                    href="https://gm81lvnyohz.typeform.com/to/IoLpsf9g"
                  >
                    Request a Class
                  </a>
                </p>
              )}

              {/* Notifications */}
              {loading ? (
                <Image
                  priority={true}
                  src="/Rolling-1s-200px.svg"
                  width={"30px"}
                  height={"30px"}
                />
              ) : (
                user && <Notifications user={user} />
              )}

              {
                // onClick={() => router.push('/profile')}
                user ? (
                  <div
                    className=" relative flex items-center space-x-2 border-2 p-2 rounded-full hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleDropDown()}
                  >
                    <MenuIcon className="h-6 cursor-pointer" />
                    {user?.photoURL ? (
                      <Image
                        priority={true}
                        src={user?.photoURL}
                        referrerpolicy="no-referrer"
                        className="rounded-full w-10 cursor-pointer"
                        width={"40px"}
                        height={"48px"}
                      />
                    ) : (
                      <UserCircleIcon className="h-6 cursor-pointer" />
                    )}

                    <div
                      className={`dropDown bg-[white] absolute top-[130%] right-3 rounded-md shadow-2xl	h-[auto] w-[200px] p-5 ${
                        showDropDown ? "block" : "hidden"
                      }`}
                    >
                      <ul>
                        <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                          <Link href={`/profile/${user.uid}`}>Profile</Link>
                        </li>
                        <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                          <a href={`/myClass/${user.uid}`}>My Classes</a>
                        </li>

                        {category !== "" &&
                        user &&
                        category !== "instructor" ? (
                          <li>
                            <p className="lg:hidden xl:hidden sm:inline-block md:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 hover:scale-105 active:scale-90 transition duration-150">
                              <a
                                target="_blank"
                                href="https://gm81lvnyohz.typeform.com/to/IoLpsf9g"
                              >
                                Request a Class
                              </a>
                            </p>
                          </li>
                        ) : (
                          <li>
                            <p
                              onClick={() => router.push("/createClass")}
                              className="
                                                            lg:hidden xl:hidden sm:inline-block  md:inline cursor-pointer hover:bg-gray-100 rounded-full space-x-2 hover:scale-105 active:scale-90 transition duration-150"
                            >
                              Create Class
                            </p>
                          </li>
                        )}
                        {category !== "" &&
                          user &&
                          category === "instructor" && (
                            <>
                              <li>
                                <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                  <a href="/schedule">Manage Schedule</a>
                                </p>
                              </li>
                              <li>
                                <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                  <a href="/withdraw">My Wallet</a>
                                </p>
                              </li>
                            </>
                          )}
                        {category !== "" && user && userData?.isAdmin && (
                          <li>
                            <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                              <a href="/vouchers">Vouchers</a>
                            </p>
                          </li>
                        )}
                        <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                          <a href={`/support`}>Support</a>
                        </li>

                        {userData && !!userData?.isAdmin && (
                          <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <a href={`/dashboard`}>Dashboard</a>
                          </li>
                        )}

                        <hr className="opacity-[1] my-2" />
                        <li
                          onClick={() => signOut()}
                          className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90"
                        >
                          <p>Logout</p>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      router.push({
                        pathname: "/Login",
                        query: { returnUrl: router.asPath },
                      })
                    }
                    className="font-medium text-sm text-white lg:px-4 md:px-[20px] xl:px-4 sm:px-2 py-2 rounded-lg bg-red-500 hover:shadow-2xl active:scale-90 hover:scale-105 transition transform duration-200 ease-out"
                  >
                    Sign In
                  </button>
                )
              }
            </>
          ) : (
            <Image
              priority={true}
              src="/Rolling-1s-200px.svg"
              width={"30px"}
              height={"30px"}
            />
          )}
        </div>

        {searchInput && (
          <div className="lg:flex xl:flex md:flex w-[90vw] justify-center items-center flex-col col-span-3 mx-auto mt-3 sm:hidden">
            <DateRangePicker
              ranges={[selectionRange]}
              minDate={new Date()}
              rangeColors={["#E73F2B"]}
              onChange={handleSelect}
            />
            <div className="flex items-center justify-between w-[30%] border-b mb-4">
              <h2 className="text-2xl flex-grow font-semibold">
                Number of Students
              </h2>
              <UsersIcon className="h-5" />
              <input
                value={noOfGuests}
                onChange={(e) => setNoOfGuests(e.target.value)}
                min={1}
                type="number"
                className="w-12 pl-2 text-lg outline-none text-logo-red"
              />
            </div>
            <div className="flex justify-between w-[50%]">
              <button onClick={resetInput} className="flex-grow text-gray-500">
                Cancel
              </button>
              <button onClick={search} className="flex-grow text-logo-red">
                Search
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}

export default Header;
