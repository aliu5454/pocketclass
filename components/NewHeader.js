import React, { useState, useEffect, useRef } from "react";
import { Button } from "@mui/base";
import Link from "next/link";
import { useAuthState, useSignOut } from "react-firebase-hooks/auth";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { MenuIcon, UserCircleIcon } from "@heroicons/react/solid";
import Image from "next/image";
import Notifications from "./Notifications";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import TeacherSearch from "./TeacherSearch";
import { categories as categoryData } from "../utils/categories";
import dynamic from "next/dynamic";
import MusicSelector from "../home-components/MusicSelector";

const Player = dynamic(
  () => import("@lottiefiles/react-lottie-player").then((mod) => mod.Player),
  { ssr: false }
);

const NewHeader = ({ activeCategory, handleCategorySelection }) => {
  const [user, loading] = useAuthState(auth);
  const playerRefs = useRef([]);
  const [signOut] = useSignOut(auth);
  const [userData, setUserData] = useState(null);
  const [showDropDown, setDropDown] = useState(false);
  const [category, setCategory] = useState("");
  const router = useRouter();
  const [schedule, setSchedule] = useState(null);
  const [classes, setClasses] = useState(null);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [stripeIntegration, setStripeIntegration] = useState(true);
  const [classCreated, setClassCreated] = useState(true);
  const [scheduleCreated, setScheduleCreated] = useState(true);

  const videoRefs = useRef([]);
  const [currentView, setCurrentView] = useState("student"); // New state for view switching

  // Load saved view preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("userView");
      if (savedView && userData?.isInstructor) {
        setCurrentView(savedView);
      }
    }
  }, [userData]);

  // Save view preference to localStorage
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (typeof window !== "undefined") {
      localStorage.setItem("userView", view);
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('localStorageChange', { 
        detail: { key: 'userView', value: view } 
      }));

      if (view === "instructor") {
        router.push('/profile/' + user.uid);
      }
      if (view === "student") {
        router.push("/");
      }
    }
  };

  const [activeKey, setActiveKey] = useState("sport");
  const navbarRef = useRef(null);


  const isHome = router.pathname === "/";

  // State for menu shrinking and responsive behavior
  const [isMenuShrunk, setIsMenuShrunk] = useState(false);
  const [hideIcons, setHideIcons] = useState(false);
  const [isMenuSmall, setMenuSmall] = useState(!isHome);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Set initial screen width
      setScreenWidth(window.innerWidth);

      // Optional: Add resize listener
      const handleResize = () => setScreenWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);

      // Cleanup on unmount
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Set navbar height as CSS custom property
  useEffect(() => {
    const updateNavbarHeight = () => {
      if (navbarRef.current) {
        const height = navbarRef.current.offsetHeight;
        document.documentElement.style.setProperty(
          "--navbar-height",
          `${height}px`
        );
      }
    };

    updateNavbarHeight();
    window.addEventListener("resize", updateNavbarHeight);

    return () => window.removeEventListener("resize", updateNavbarHeight);
  }, [isMenuShrunk, isMenuSmall, isHome]);

  const handleCategoryClick = (category, index) => {
    setActiveKey(category);

    if (handleCategorySelection) {
      handleCategorySelection(category);
    }

    const player = playerRefs.current[index];
    const playerMob = playerRefs.current[index + 3];
    if (player) player.stop();
    if (playerMob) playerMob.stop();
    if (player) player.play();
    if (playerMob) playerMob.play();
  };

  useEffect(() => {
    const cachedImage = localStorage.getItem("profileImage");
    if (cachedImage) {
      setUserData((prev) => ({ ...prev, profileImage: cachedImage }));
    }
  }, []);

  useEffect(() => {
    const getData = async () => {
      const userId = user?.uid;
      const docRef = doc(db, "Schedule", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSchedule(data);

        if (data) {
          setScheduleCreated(true);
        } else {
          setScheduleCreated(false);
        }
      }
      const classesQuery = query(
        collection(db, "classes"),
        where("classCreator", "==", user.uid)
      );

      const docSnap2 = await getDocs(classesQuery);

      if (docSnap2.docs.length > 0) {
        const data = docSnap2.docs.map((doc) => doc.data());
        setClasses(data);

        if (data && data.length > 0) {
          setClassCreated(true);
        } else {
          setClassCreated(false);
        }
      } else {
        setClassCreated(false);
      }
    };

    if (userData && userData.isInstructor) {
      getData();
    }
  }, [userData]);

  const toggleDropDown = () => {
    setDropDown(!showDropDown);
  };

  useEffect(() => {
    const getData = async () => {
      const docRef = doc(db, "Users", user?.uid);
      const data = await getDoc(docRef);
      const docData = data.data();

      const updatedData = {
        ...docData,
        profileImage: docData?.profileImage || user?.photoURL,
      };

      const imageUrl = docData?.profileImage || user?.photoURL;

      if (imageUrl) {
        localStorage.setItem("profileImage", imageUrl);
      }
      setUserData(data?.data());
      setCategory(data?.data()?.category);

      // Set current view based on user's instructor status
      if (data?.data()?.isInstructor) {
        setCurrentView("instructor");
        // Dipatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('localStorageChange', { 
          detail: { key: 'userView', value: 'instructor' } 
        }));
      } else {
        setCurrentView("student");
        // Dipatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('localStorageChange', { 
          detail: { key: 'userView', value: 'student' } 
        }));
      }

      if (
        data?.data() &&
        data?.data().firstName &&
        data?.data().lastName &&
        data?.data().email &&
        data?.data().gender &&
        data?.data().dob &&
        data?.data().phoneNumber &&
        data?.data().profileImage &&
        data?.data().profileDescription
      ) {
        setProfileCompleted(true);
      } else {
        setProfileCompleted(false);
      }

      setUserData(updatedData);
      setCategory(updatedData?.category);

      // Check for profile completeness
      const isComplete =
        docData?.firstName &&
        docData?.lastName &&
        docData?.email &&
        docData?.gender &&
        docData?.dob &&
        docData?.phoneNumber &&
        (docData?.profileImage || user?.photoURL) &&
        docData?.profileDescription;

      setProfileCompleted(!!isComplete);

      // Stripe setup check
      if (
        data?.data()?.isInstructor &&
        !data?.data()?.payment_enabled
      ) {
        toast.error("Please setup stripe to start earning");
        setStripeIntegration(false);
      } else {
        setStripeIntegration(true);
      }
    };

    if (user?.uid) getData();
  }, [user]);

  // Scroll effects
  useEffect(() => {
    const handleScroll = () => {
      if (!isHome) return;

      const scrollY = window.scrollY;

      // Desktop scroll effects
      if (window.innerWidth >= 768) {
        if (scrollY > 5 && !isSearchExpanded) {
          setIsMenuShrunk(true);
        } else if (scrollY <= 5 && !isSearchExpanded) {
          setIsMenuShrunk(false);
        }
      }

      // Mobile scroll effects
      if (scrollY > 25) {
        setHideIcons(true);
      } else if (scrollY <= 25) {
        setHideIcons(false);
      }
    };

    if (isHome) {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSearchExpanded, isHome]);

  // Reset states on route change
  useEffect(() => {
    setIsMenuShrunk(false);
    setMenuSmall(!isHome);
    setHideIcons(false);
  }, [isHome]);

  return (
    <>
      {user &&
        userData &&
        userData.isInstructor &&
        currentView === "instructor" &&
        (!stripeIntegration ||
          !classCreated ||
          !scheduleCreated ||
          !profileCompleted) && (
          <div className=" bg-gray-50 py-[2px]">
            <div className="flex items-center text-logo-red px-2 justify-center text-base text-center lg:text-xl mt-3 mb-4 font-semibold">
              Please complete these steps to publish your class!
            </div>
            <div className="flex flex-col lg:flex-row px-4 bg-gray-50 gap-3 mt-2 mb-2 z-40">
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

      <div
        className={`flex flex-col md:gap-1 bg-white pb-4 md:pb-[2rem] sticky top-0 w-full dm2:z-50 z-[900] transition-all duration-500 ${
          isMenuShrunk
            ? "h-[90px] dm2:h-[100px]"
            : `${isMenuSmall ? "h-auto dm2:h-[100px]" : "h-auto"}`
        }`}
        ref={navbarRef}
      >
        {/*NavBar Top Part*/}
        <div
          className={`${
            isHome ? "z-[9000]" : "dm2:z-50 z-[9000]"
          } relative top-0 max-md:pt-4 max-md:pb-3 py-6 box-border flex justify-between items-center flex-row gap-2 w-[100.00%] section-spacing`}
        >
          <div className="flex items-center justify-start flex-[1]">
            <Link className="left-section cursor-pointer" href="/">
              <img
                src="/assets/image_5c0480a2.png"
                className="cursor-pointer h-12 object-contain w-[117px] md:w-36 lg:w-44 box-border block border-[none]"
                alt="Logo"
              />
            </Link>
          </div>

          {/* Category Buttons - Centered */}
          <div className="hidden md:flex justify-center items-center absolute left-1/2 transform -translate-x-1/2">
            <div
              className={`${isMenuShrunk || isMenuSmall ? "opacity-0" : ""}`}
            >
              <div className="flex space-x-2.5 items-center">
                {categoryData.map((category, index) => (
                  <div key={category.name}>
                    <button
                      onClick={() =>
                        handleCategoryClick(category.name.toLowerCase(), index)
                      }
                      className="flex max-w-[75px] max-h-[75px] flex-col items-center justify-center relative cursor-pointer bg-transparent border-none p-2"
                    >
                      <Player
                        lottieRef={(el) => (playerRefs.current[index + 3] = el)}
                        autoplay
                        loop={false}
                        src={category.jsonPath}
                        className="h-[42px] mb-1 transition-transform duration-200 hover:scale-125"
                      />
                      <span
                        className={`text-xs font-medium transition-colors ${
                          activeKey === category.name.toLowerCase()
                            ? "text-black"
                            : "text-gray-500"
                        }`}
                      >
                        {category.name}
                      </span>
                      {activeKey === category.name.toLowerCase() && (
                        <div className="absolute bottom-[-2px] w-[110%] h-0.5 bg-black rounded-full"></div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center flex-row gap-4 flex-[1]">
            {!loading ? (
              user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden dm1:block">
                    {user ? (
                      !userData?.isInstructor || currentView === "student" ? (
                        <div />
                      ) : (
                        <div />
                      )
                    ) : (
                      <Image
                        priority={true}
                        src="/Rolling-1s-200px.svg"
                        width={"30px"}
                        height={"30px"}
                        alt="Loading"
                      />
                    )}
                  </div>

                  {user && <Notifications user={user} />}

                  {/* View Toggle for Instructors */}
                  {userData?.isInstructor && (
                    // Go t instructor view and go to student view buttons
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outlined"
                        className={`${currentView === "student"
                          ? "hidden"
                          : "hidden md:block"
                        } text-sm bg-gray-100 px-3 py-2 hover:bg-gray-200 rounded-full`}
                        onClick={() => handleViewChange("student")}
                      >
                        Go to Student View
                      </Button>
                      <Button
                        variant="outlined"
                        className={`${currentView === "instructor"
                          ? "hidden"
                          : "hidden md:block"
                        }  text-sm bg-gray-100 px-3 py-2 hover:bg-gray-200 rounded-full`}
                        onClick={() => handleViewChange("instructor")}
                      >
                        Go to Instructor View
                      </Button>
                    </div>
                  )}

                  {/* Become an Instructor Button */}
                  {!userData?.isInstructor && (
                    <Link href="/instructor-onboarding">
                      <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors mr-4">
                        Become an Instructor
                      </button>
                    </Link>
                  )}

                  <div
                    className={`relative flex gap-2 items-center space-x-2 border-2 p-1 md:p-2 rounded-full hover:bg-gray-100 cursor-pointer ${
                      isHome ? "z-[990]" : "dm2:z-50 z-[900]"
                    }`}
                    onClick={toggleDropDown}
                  >
                    <MenuIcon className="h-6 cursor-pointer ml-1" />
                    {userData?.profileImage ? (
                      <img
                        src={userData?.profileImage}
                        className="rounded-full cursor-pointer shrink-0 w-10 h-10 md:w-12 md:h-12"
                        alt="User"
                      />
                    ) : (
                      <UserCircleIcon className="rounded-full cursor-pointer shrink-0 w-10 h-10 md:w-12 md:h-12" />
                    )}

                    {showDropDown && (
                      <div
                        className={`dropDown bg-white absolute top-[130%] right-3 rounded-md shadow-2xl h-auto w-[300px] p-5 ${
                          isHome ? "z-[990]" : "dm2:z-50 z-[900]"
                        }`}
                      >
                        <ul>
                          {/* View toggle */}
                          {userData?.isInstructor && (
                            <div className="flex justify-between">
                              <div className="flex items-center">
                                <button
                                  onClick={() => handleViewChange("student")}
                                  className={`${currentView === "student"
                                    ? "hidden"
                                    : "block md:hidden"
                                  }  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90`}
                                >
                                  Go to Student View
                                </button>
                                <button
                                  onClick={() => handleViewChange("instructor")}
                                  className={`${currentView === "instructor"
                                    ? "hidden"
                                    : "block md:hidden"
                                  }  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90`}
                                >
                                  Go to Instructor View
                                </button>
                              </div>
                              </div>
                          )}

                          {/* Request/Create Class at top */}
                          {(!userData?.isInstructor ||
                            currentView === "student") &&
                          userData ? (
                            <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                              <a
                                target="_blank"
                                href="https://gm81lvnyohz.typeform.com/to/IoLpsf9g"
                              >
                                Request a Class
                              </a>
                            </li>
                          ) : (
                            <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                              <a href="/createClass">Create Class</a>
                            </li>
                          )}
                          <hr className="my-2" />

                          <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href={`/profile/${user.uid}`}>Profile</Link>
                          </li>
                          <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href={`/mybooking?id=${user.uid}`}>
                              My Booking
                            </Link>
                          </li>
                          <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href={`/chat`}>My Messages</Link>
                          </li>

                          {/* Student View Items */}
                          {(!userData?.isInstructor ||
                            currentView === "student") && (
                            <>
                              <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                <Link href={`/wallet`}>Wallet</Link>
                              </li>
                            </>
                          )}
                          {/* Instructor View Items */}
                          {userData?.isInstructor &&
                            currentView === "instructor" && (
                            <>
                              <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                <Link href={`/myClass/${user.uid}`}>
                                  My Classes
                                </Link>
                              </li>
                              <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                <Link href={`/automations`}>
                                  Automation
                                </Link>
                              </li>
                              <li>
                                <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                  <Link href={`/myStudents/${user.uid}`}>
                                    My Clients
                                  </Link>
                                </p>
                              </li>
                              <li>
                                <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                  <Link href={`/classbookings?id=${user.uid}`}>
                                    Class Bookings
                                  </Link>
                                </p>
                                </li>
                                <li>
                                  <p className="my-2 block dm1:hidden  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                    <Link href={`/createClass`}>
                                      Create Class
                                    </Link>
                                  </p>
                                </li>
                                <li>
                                  <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                    <Link href="/schedule">
                                      Manage Schedule
                                    </Link>
                                  </p>
                                </li>
                                <li>
                                  <p className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                                    <Link href="/withdraw">My Wallet</Link>
                                  </p>
                                </li>
                              </>
                            )}

                          {/* Become an Instructor option for non-instructors */}
                          {!userData?.isInstructor && (
                            <li className="my-2">
                              <Link href="/instructor-onboarding">
                                <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors duration-200">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-gray-900 text-sm">
                                      Become an Instructor
                                    </div>
                                    <div className="text-xs text-gray-500 leading-tight">
                                      It's easy to start teaching and earn extra
                                      income.
                                    </div>
                                  </div>
                                  <div className="flex h-full items-center justify-center w-12 bg-gray-100 rounded-lg shrink-0">
                                    <img
                                      src="/assets/Teacher.png"
                                      alt="Teacher"
                                      className="w-10 h-10"
                                    />
                                  </div>
                                </div>
                              </Link>
                            </li>
                          )}
                          {userData?.isAdmin && (
                            <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                              <Link href="/vouchers">Vouchers</Link>
                            </li>
                          )}
                          <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href="/support">Support</Link>
                          </li>
                          {userData?.isAdmin && (
                            <li className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                              <Link href="/dashboard">Dashboard</Link>
                            </li>
                          )}
                          <hr className="my-2" />
                          <li
                            className="my-2  hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90 cursor-pointer"
                            onClick={() => {
                              signOut();
                              localStorage.removeItem("profileImage");
                            }}
                          >
                            Logout
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Become an Instructor Button for logged-out users */}
                  <Link href="/instructor-onboarding">
                    <button className="hidden md:block  bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors mr-4">
                      Become an Instructor
                    </button>
                  </Link>

                  {/* Menu for non-logged-in users */}
                  <div
                    className={`relative flex gap-2 items-center space-x-2 border-2 p-1 md:p-2 rounded-full hover:bg-gray-100 cursor-pointer ${
                      isHome ? "z-[990]" : "dm2:z-50 z-[900]"
                    }`}
                    onClick={toggleDropDown}
                  >
                    <MenuIcon className="h-6 cursor-pointer" />

                    {showDropDown && (
                      <div
                        className={`dropDown bg-white absolute top-[130%] right-3 rounded-md shadow-2xl h-auto w-[300px] p-5 ${
                          isHome ? "z-[990]" : "dm2:z-50 z-[900]"
                        }`}
                      >
                        <ul>
                          <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link
                              href={{
                                pathname: "/Login",
                                query: { returnUrl: router.asPath },
                              }}
                            >
                              Login or Signup
                            </Link>
                          </li>
                          <hr className="my-2" />
                          <li className="my-2">
                            <Link href="/instructor-onboarding">
                              <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors duration-200">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 text-sm">
                                    Become an Instructor
                                  </div>
                                  <div className="text-xs text-gray-500 leading-tight">
                                    It's easy to start teaching and earn extra
                                    income.
                                  </div>
                                </div>
                                <div className="flex h-full items-center justify-center w-12 bg-gray-100 rounded-lg shrink-0">
                                  <img
                                    src="/assets/Teacher.png"
                                    alt="Teacher"
                                    className="w-10 h-10"
                                  />
                                </div>
                              </div>
                            </Link>
                          </li>
                          <hr className="my-2" />
                          <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href="/support">Support</Link>
                          </li>
                          <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href="/terms">Terms & Conditions</Link>
                          </li>
                          <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href="/privacy">Privacy Policy</Link>
                          </li>
                          <li className="my-2 hover:text-logo-red hover:scale-105 transition transform duration-200 ease-out active:scale-90">
                            <Link href="/about">About Us</Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )
            ) : (
              <Image
                src="/Rolling-1s-200px.svg"
                width={30}
                height={30}
                alt="Loading"
              />
            )}
          </div>
        </div>
        {/* Mobile Category Buttons - Only shown on homepage */}
        {isHome && (
          <div
            className={`ease-in-out overflow-hidden w-full justify-center md:hidden flex ${
              hideIcons
                ? "mb-0 max-h-0 opacity-0"
                : "mb-3 max-h-[200px] opacity-100"
            }`}
          >
            <div className="flex space-x-2.5 items-center">
              {categoryData.map((category, index) => (
                <div key={category.name}>
                  <button
                    onClick={() =>
                      handleCategoryClick(category.name.toLowerCase(), index)
                    }
                    className="flex max-w-[75px] max-h-[75px] flex-col items-center justify-center relative cursor-pointer bg-transparent border-none p-2"
                  >
                    <Player
                      lottieRef={(el) => (playerRefs.current[index] = el)}
                      autoplay
                      loop={false}
                      src={category.jsonPath}
                      className="h-[42px] mb-1 transition-transform duration-200 hover:scale-125"
                    />
                    <span
                      className={`text-xs font-medium transition-colors ${
                        activeKey === category.name.toLowerCase()
                          ? "text-black"
                          : "text-gray-500"
                      }`}
                    >
                      {category.name}
                    </span>
                    {activeKey === category.name.toLowerCase() && (
                      <div className="absolute bottom-[-2px] w-[110%] h-0.5 bg-black rounded-full"></div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/*NavBar Search Part*/}
        <div
          className={`${
            isMenuShrunk || (isMenuSmall && screenWidth > 800)
              ? "flex items-center justify-center h-full absolute inset-0"
              : "relative"
          }`}
        >
          <TeacherSearch
            isShrunk={isMenuShrunk}
            isMenuSmall={isMenuSmall}
            expandMenu={() => setIsMenuShrunk(false)}
            user={user}
          />
        </div>
      </div>
      {isHome && <MusicSelector selectedCategory={activeKey} />}
    </>
  );
};

export default NewHeader;
