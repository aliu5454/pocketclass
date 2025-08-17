import EnhancedImageGallery from "../EnhancedImageGallery";
import Gallery from "../Gallery";
import FitnessProfileSection from "../FitnessProfileSection";
import FitnessScheduleMindfulnessDisplay from "../FitnessScheduleMindfulnessDisplay";
import FitnessReviewSectionWidget from "../FitnessReviewSectionWidget";
import DynamicButtonSection from "../DynamicButtonSection";
import SvgIcon1 from "./icons/SvgIcon1";
import SvgIcon3 from "./icons/SvgIcon3";
import SvgIcon5 from "./icons/SvgIcon5";
import { useState, useEffect, useRef } from "react";
import { db } from "../../firebaseConfig";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";
import { AiFillHeart, AiOutlineHeart, AiOutlineMan } from "react-icons/ai";
import { UserIcon } from "@heroicons/react/solid";
import { categories } from "../../utils/categories";
import BookingComponent from "../BookingComponent";
import FAQAccordion from "../FAQAccordion";
import Link from "next/link";
import { useRouter } from "next/router";
import RecommendedClassesSection from "../../home-components/RecommendedClasses";

function FitnessClassDetailsSection({
  timeSlotOptions,
  reviewCountsArray1,
  mindfulClassCardOptions,
  reviewCountsArray2,
  dynamicReviewCountsArray,
  dynamicReviewCountsArray1,
  reviewCountsArray,
  classId,
  userId,
}) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [classCreatorData, setClassCreatorData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const instructorRef = useRef(null);
  const bookingRef = useRef(null);
  const reviewsRef = useRef(null);
  const faqRef = useRef(null);
  const [isTablet, setIsTablet] = useState(false);
  const [activeSection, setActiveSection] = useState("instructor");

  useEffect(() => {
    const createObserver = (ref, sectionName, threshold = 0.3) => {
      if (!ref.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(sectionName);
            }
          });
        },
        {
          root: null,
          rootMargin: "0px",
          threshold,
        }
      );

      ref.current.setAttribute("data-section", sectionName);
      observer.observe(ref.current);
      return observer;
    };

    const observers = [];

    if (instructorRef.current) {
      observers.push(createObserver(instructorRef, "instructor", 0.3));
    }

    if (bookingRef.current) {
      observers.push(createObserver(bookingRef, "booking", 0.3));
    }

    if (reviewsRef.current) {
      observers.push(createObserver(reviewsRef, "reviews", 0.2)); // 👈 lower threshold for reviews
    }

    if (faqRef.current) {
      observers.push(createObserver(faqRef, "faq", 0.3));
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 500);
      setIsTablet(width <= 1024);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  useEffect(() => {
    const getClassCreatorData = async () => {
      if (classData?.classCreator) {
        const docRef = doc(db, "Users", classData.classCreator);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setClassCreatorData(docSnap.data());
        }
      }
    };

    getClassCreatorData();
  }, [classData]);
  useEffect(() => {
    return onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => [{ ...doc.data(), id: doc.id }]));
    });
  }, []);

  useEffect(() => {
    const fetchClassData = async () => {
      if (classId) {
        const classRef = doc(db, "classes", classId);
        const docSnap = await getDoc(classRef);
        if (docSnap.exists()) {
          setClassData(docSnap.data());
        }
      }
    };

    fetchClassData();
  }, [classId]);

  useEffect(() => {
    if (userId && classId) {
      checkIfFavorite();
    }
  }, [userId, classId]);

  let currentClassReview = reviews.filter((rev) => rev[0].classID === classId);
  let avgReview = 0;

  currentClassReview.forEach((review) => {
    const ratings = review[0];
    avgReview +=
      (ratings.safetyRating + ratings.recommendRating + ratings.qualityRating) /
      3;
  });

  avgReview =
    currentClassReview.length > 0 ? avgReview / currentClassReview.length : 0;

  const checkIfFavorite = async () => {
    setIsFavoriteLoading(true);
    const favoriteRef = doc(db, "favorites", `${userId}_${classId}`);
    const docSnap = await getDoc(favoriteRef);
    setIsFavorite(docSnap.exists());
    setIsFavoriteLoading(false);
  };

  const toggleFavorite = async () => {
    if (!userId) {
      return;
    }

    setIsFavoriteLoading(true);
    const favoriteRef = doc(db, "favorites", `${userId}_${classId}`);

    if (isFavorite) {
      await deleteDoc(favoriteRef);
    } else {
      await setDoc(favoriteRef, {
        userId,
        classId,
        createdAt: new Date(),
      });
    }

    setIsFavorite(!isFavorite);
    setIsFavoriteLoading(false);
  };

  const getCategoryIcons = (category, subcategory) => {
    const categoryData = categories.find((cat) => cat.name === category);
    const subcategoryData = categoryData?.subCategories.find(
      (sub) => sub.name === subcategory
    );

    return {
      categoryIcon: categoryData?.imagePath || "",
      subcategoryIcon: subcategoryData?.imagePath || "",
    };
  };

  const scrollToRef = (ref, offset = 250) => {
    if (ref.current) {
      const elementTop = ref.current.getBoundingClientRect().top;
      const offsetPosition = elementTop + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex justify-start items-center flex-col grow-0 shrink-0 basis-auto mt-10 md:mt-14 section-spacing">
      {isMobile && classData && (
        <div className="fixed top-0 z-30 bg-white border-b border-gray-200 w-full h-[190px] flex flex-col justify-end px-4">
          <div className="flex gap-6 justify-start overflow-x-auto pb-3 max-w-full">
            {[
              {
                label: "Instructor",
                ref: instructorRef,
                key: "instructor",
                offset: 150,
              },
              {
                label: "Booking",
                ref: bookingRef,
                key: "booking",
                offset: 250,
              },
              {
                label: "Reviews",
                ref: reviewsRef,
                key: "reviews",
                offset: -700,
              },
              { label: "FAQ", ref: faqRef, key: "faq", offset: 250 },
            ].map(({ label, ref, key, offset }) => (
              <button
                key={key}
                onClick={() => scrollToRef(ref, offset)}
                className={`text-sm font-medium text-[#261f22] whitespace-nowrap relative pb-1 transition-all duration-300 ${activeSection === key
                    ? "border-b-2 border-black"
                    : "border-b-2 border-transparent"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex mt-2 justify-between items-start flex-col lg:flex-row gap-2 w-full max-w-[1312px] grow-0 shrink-0 basis-auto box-border">
        {!classData ? (
          <div className="grow-0 shrink-0 basis-auto animate-pulse">
            {/* Title skeleton */}
            <div className="h-14 bg-gray-200 rounded-lg w-3/4 md:mb-4"></div>

            <div className="flex items-center flex-row flex-wrap md:flex-nowrap gap-5 md:gap-8 mt-4">
              {/* Rating skeleton */}
              <div className="flex items-center">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="w-12 h-4 bg-gray-200 rounded ml-2"></div>
              </div>

              {/* Category skeleton */}
              <div className="flex items-center flex-row flex-wrap md:flex-nowrap gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
                <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                <div className="w-20 h-4 bg-gray-200 rounded"></div>
              </div>

              {/* Price skeleton */}
              <div className="flex items-center">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="w-24 h-4 bg-gray-200 rounded ml-2"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grow-0 shrink-0 basis-auto w-full max-w-[1312px]">
            <p className="[font-family:'DM_Sans',sans-serif] text-3xl md:text-4xl lg:text-5xl font-bold lg:leading-[56px] text-[#261f22] m-0 pt-7 md:p-0">
              {classData?.Name}
            </p>
            <div className="flex justify-between items-center flex-row flex-wrap md:flex-nowrap gap-5 md:gap-8 mt-2 md:mt-4">
              <div className="flex justify-start items-center flex-row flex-wrap md:flex-nowrap gap-[20px] md:gap-[35px] grow-0 shrink-0 basis-auto max-w-[100vw]">
                <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                  <SvgIcon1 className="w-5 h-5 text-[#261f22] flex grow-0 shrink-0 basis-auto" />
                  <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#261f22] grow-0 shrink-0 basis-auto ml-[3px] m-0 p-0">
                    {avgReview.toFixed(1)}
                  </p>
                  <p className="[font-family:'DM_Sans',sans-serif] text-base font-normal text-[#261f22] grow-0 shrink-0 basis-auto ml-1.5 m-0 p-0">
                    ({currentClassReview?.length || 0} reviews)
                  </p>
                </div>
                <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                  <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                    <img
                      src={
                        getCategoryIcons(
                          classData?.Category,
                          classData?.SubCategory || classData?.Type
                        ).subcategoryIcon
                      }
                      className="w-4 h-4 flex grow-0 shrink-0 basis-auto object-contain"
                      alt={classData?.Category || "category"}
                    />{" "}
                    <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#7d797a] grow-0 shrink-0 basis-auto ml-[7px] m-0 p-0">
                      {classData?.Category || "N/A"}
                    </p>
                  </div>
                  <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto ml-[3px]">
                    <img
                      src="/assets/image_7a2617f3.png"
                      alt=""
                      className="h-1 max-w-[initial] w-1 block box-border"
                    />
                    <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#7d797a] grow-0 shrink-0 basis-auto ml-[3px] m-0 p-0">
                      {classData?.SubCategory || classData?.Type || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                  <SvgIcon3 className="w-5 h-5 text-[#7d797a] flex grow-0 shrink-0 basis-auto" />
                  <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#7d797a] grow-0 shrink-0 basis-auto ml-[7px] m-0 p-0">
                    ${classData?.groupPrice === classData?.Price
                      ? (classData?.Price || "0")
                      : (classData?.groupPrice + "-" + classData?.Price || "0")} per hour
                  </p>
                </div>
                <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                  {/* Boces to show if class in Online or In Person */}
                  <p
                    className={`[font-family:'DM_Sans',sans-serif] border border-[#7d797a] flex flex-row items-center justify-center ${classData?.Mode === "Online"
                        ? "text-green-500"
                        : "text-[#7d797a]"
                      } px-3 rounded-lg text-sm text-[#7d797a] grow-0 py-[2px] shrink-0 basis-auto ml-[7px] m-0 p-0`}
                  >
                    {/* Man Icon for In_Person and a Dot for Online */}
                    <span
                      className={`mr-2 ${classData?.Mode === "Online" ? "" : "hidden"
                        }`}
                    >
                      <img
                        className="w-4 h-4 flex grow-0 shrink-0 basis-auto object-contain"
                        src="/assets/GreenDot.svg"
                        alt="Green Dot"
                      />
                    </span>
                    <span
                      className={`mr-2 ${classData?.Mode === "Online" ? "hidden" : ""
                        }`}
                    >
                      <UserIcon className="w-4 h-4 flex grow-0 shrink-0 basis-auto" />
                    </span>
                    {classData?.Mode === "Online" ? "Online" : "In-Person"}
                  </p>
                  {/* Box to show if first class is free */}
                  {classData?.firstFree && (
                    <p className="[font-family:'DM_Sans',sans-serif] border border-green-400 flex flex-row items-center justify-center px-3 rounded-lg text-sm text-green-500 grow-0 py-[2px] shrink-0 basis-auto ml-[7px] m-0 p-0">
                      First Class Free
                    </p>
                  )}
                  {/* Heart icon for mobile - positioned right beside price and badges */}
                  <div className="md:hidden ml-3">
                    <div
                      onClick={toggleFavorite}
                      className="cursor-pointer flex w-8 h-8 rounded-full border border-gray-300 items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      {isFavorite ? (
                        <AiFillHeart className="w-5 h-5 text-red-500" />
                      ) : (
                        <AiOutlineHeart className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Heart icon and edit button for desktop */}
              <div className="hidden md:flex gap-4 items-center">
                <div
                  onClick={toggleFavorite}
                  className="cursor-pointer flex w-10 h-10 rounded-full border border-gray-300 items-center justify-center"
                >
                  {isFavorite ? (
                    <AiFillHeart className="w-6 h-6 text-red-500" />
                  ) : (
                    <AiOutlineHeart className="w-6 h-6" />
                  )}
                </div>
                {classCreatorData?.userUid === userId && (
                  <Link href={`/updateClass/${classId}`}>
                    <button className="text-base font-semibold text-red-600 border border-red-600 px-4 py-1 rounded hover:bg-red-600 hover:text-white transition">
                      Edit
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-10 w-full max-w-[1312px]">
        {isMobile ? (
          <EnhancedImageGallery images={classData?.Images || []} />
        ) : (
          <Gallery coverImages={classData?.Images || []} />
        )}
      </div>
      
          {/* Mobile DynamicButtonSection - shown between gallery and instructor */}
          {isMobile && (
            <div className="w-full px-4 -mx-4">
              <DynamicButtonSection
                classId={classId}
                classData={classData}
                instructorId={classData?.classCreator}
                below={true}
              />
            </div>
          )}
      
      <div ref={instructorRef}></div>
      <div className="flex flex-col-reverse lg:flex-row gap-20 lg:gap-10 w-full max-w-[1312px] grow-0 shrink-0 basis-auto box-border mt-2 md:mt-9">
        <div className="grow-0 shrink basis-auto xl:max-w-[calc(100vw)]">
          <div
            onClick={() => {
              router.push(
                `/instructor?class=${classId}&creator=${classCreatorData.userUid}`
              );
            }}
            className="cursor-pointer w-[100.00%] box-border mt-8"
            >
            {/* Instructor image, name and reviews section */}
            <div className="flex justify-start items-start gap-2 flex-row">
              {!classCreatorData?.profileImage ? (
                <div className="w-20 h-20 md:h-[122px] md:w-[124px] rounded-full bg-gray-200 animate-pulse" />
              ) : (
                <img
                  src={classCreatorData.profileImage}
                  className="cursor-pointer w-20 h-20 md:h-[122px] md:w-[124px] max-w-[initial] object-cover rounded-full block box-border shrink-0"
                />
              )}

              <div className="grow-0 shrink basis-auto ml-3 md:ml-[31.5px] flex-1">
                {!classCreatorData ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48"></div>
                  </div>
                ) : (
                  <p className="[font-family:'DM_Sans',sans-serif] text-xl md:text-2xl font-bold text-[#261f22] m-0 p-0 cursor-pointer">
                    {`${classCreatorData.firstName} ${classCreatorData.lastName}`}
                  </p>
                )}

                {!reviews.length ? (
                  <div className="flex justify-start items-center flex-row animate-pulse mt-2 md:mt-[0.5rem]">
                    <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                    <div className="w-12 h-4 bg-gray-200 rounded ml-[3px]"></div>
                    <div className="w-20 h-4 bg-gray-200 rounded ml-1.5"></div>
                  </div>
                ) : (
                  <div className="flex justify-start items-center flex-row mt-1 md:mt-0">
                    <SvgIcon5 className="w-5 h-5 text-[#261f22] flex grow-0 shrink-0 basis-auto" />
                    <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#261f22] grow-0 shrink-0 basis-auto ml-[3px] m-0 p-0">
                      {avgReview.toFixed(1)}
                    </p>
                    <p className="[font-family:'DM_Sans',sans-serif] text-base font-normal text-[#261f22] grow-0 shrink-0 basis-auto ml-1.5 m-0 p-0">
                      ({currentClassReview.length} reviews)
                    </p>
                  </div>
                )}

                {/* Description for desktop only */}
                {!classData ? (
                  <div className="animate-pulse mt-3 md:mt-[18px] hidden md:block">
                    <div className="h-20 bg-gray-200 rounded w-full"></div>
                  </div>
                ) : (
                  <p className="[font-family:'DM_Sans',sans-serif] whitespace-pre-wrap text-base font-medium text-left leading-6 text-[#261f22] w-[90.00%] box-border mt-[18px] m-0 p-0 ml-[.4rem] hidden md:block">
                    {classCreatorData?.profileDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Description for mobile only - appears below the entire instructor section */}
            {!classData ? (
              <div className="animate-pulse mt-4 md:hidden">
                <div className="h-20 bg-gray-200 rounded w-full"></div>
              </div>
            ) : (
              <p className="[font-family:'DM_Sans',sans-serif] whitespace-pre-wrap text-base font-medium text-left leading-6 text-[#261f22] w-full box-border mt-4 m-0 p-0 md:hidden">
                {classCreatorData?.profileDescription}
              </p>
            )}
          </div>
          <div>
            <FitnessProfileSection
              classId={classId}
              instructorData={classCreatorData}
              classData={classData}
            />
          </div>
          <div ref={bookingRef}>
            <BookingComponent
              classId={classId}
              instructorId={classCreatorData?.userUid}
              classData={classData}
              classPackages={classData?.Packages}
            />
          </div>
          {/* <FitnessScheduleMindfulnessDisplay
            classData={classData}
            timeSlotOptions={timeSlotOptions}
            mindfulClassCardOptions={mindfulClassCardOptions}
            reviewCountsArray2={reviewCountsArray2}
            dynamicReviewCountsArray={dynamicReviewCountsArray}
            dynamicReviewCountsArray1={dynamicReviewCountsArray1}
            reviewCountsArray={reviewCountsArray}
            classId={classId}
          /> */}
          <div ref={reviewsRef}>
            <FitnessReviewSectionWidget
              classTitle={classData?.Name}
              classId={classId}
              reviewCountsArray1={reviewCountsArray1}
              classData={classData}
              classCreatorData={classCreatorData}
            />
          </div>
        </div>
        <div className="hidden xl:block w-full max-w-[320px]">
          <DynamicButtonSection
            classId={classId}
            classData={classData}
            instructorId={classData?.classCreator}
          />
        </div>
      </div>
      <div className="mt-10 w-full max-w-[1312px]">
        <RecommendedClassesSection
          classId={classId}
          currentClassData={classData}
        />
        <div ref={faqRef}>
          <FAQAccordion
            instructorId={classCreatorData?.userUid}
            classId={classId}
          />
        </div>
      </div>
    </div>
  );
}

export default FitnessClassDetailsSection;
