import EnhancedImageGallery from "../EnhancedImageGallery";
import FitnessProfileSection from "../FitnessProfileSection";
import FitnessScheduleMindfulnessDisplay from "../FitnessScheduleMindfulnessDisplay";
import FitnessReviewSectionWidget from "../FitnessReviewSectionWidget";
import DynamicButtonSection from "../DynamicButtonSection";
import SvgIcon1 from "./icons/SvgIcon1";
import SvgIcon3 from "./icons/SvgIcon3";
import SvgIcon5 from "./icons/SvgIcon5";
import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { categories } from "../../utils/categories";
import BookingComponent from "../BookingComponent";

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [classCreatorData, setClassCreatorData] = useState(null);

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
  return (
    <div
      className="flex justify-start items-center flex-col grow-0 shrink-0 basis-auto mt-8 md:mt-14 section-spacing"
      style={{ marginTop: "5rem" }}
    >
      <div className="flex justify-between items-start flex-col lg:flex-row gap-2 w-full max-w-[1312px] grow-0 shrink-0 basis-auto box-border">
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
          <div className="grow-0 shrink-0 basis-auto">
            <p className="[font-family:'DM_Sans',sans-serif] text-3xl md:text-4xl lg:text-5xl font-bold lg:leading-[56px] text-[#261f22] m-0 p-0">
              {classData?.Name || ""}
            </p>
            <div className="flex justify-start items-center flex-row flex-wrap md:flex-nowrap gap-5 md:gap-8 mt-2 md:mt-4">
              <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                <SvgIcon1 className="w-5 h-5 text-[#261f22] flex grow-0 shrink-0 basis-auto" />
                <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#261f22] grow-0 shrink-0 basis-auto ml-[3px] m-0 p-0">
                  {avgReview.toFixed(1)}
                </p>
                <p className="[font-family:'DM_Sans',sans-serif] text-base font-normal text-[#261f22] grow-0 shrink-0 basis-auto ml-1.5 m-0 p-0">
                  ({currentClassReview?.length || 0} reviews)
                </p>
              </div>
              <div className="flex justify-start items-center flex-row flex-wrap md:flex-nowrap gap-[20px] md:gap-[35px] grow-0 shrink-0 basis-auto">
                <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                  <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
                    <img
                      src={
                        getCategoryIcons(
                          classData?.Category,
                          classData?.SubCategory
                        ).categoryIcon
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
                    ${classData?.Price || "0"} per hour
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-start items-center flex-row grow-0 shrink-0 basis-auto">
          {userId ? (
            isFavoriteLoading ? (
              <div className="flex items-center animate-pulse">
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-24 bg-gray-200 rounded ml-[7px]"></div>
              </div>
            ) : (
              <div
                onClick={toggleFavorite}
                className="cursor-pointer flex items-center"
              >
                {isFavorite ? (
                  <AiFillHeart
                    className={`w-6 h-6 flex grow-0 shrink-0 basis-auto text-red-500`}
                  />
                ) : (
                  <AiOutlineHeart
                    className={`w-6 h-6 flex grow-0 shrink-0 basis-auto`}
                  />
                )}
                <p className="[font-family:Inter,sans-serif] text-base font-semibold text-[#261f22] grow-0 shrink-0 basis-auto ml-[7px] m-0 p-0">
                  {isFavorite ? "Remove Favorite" : "Add to Favorite"}
                </p>
              </div>
            )
          ) : null}
        </div>
      </div>
      <div className="flex justify-start items-start flex-col-reverse lg:flex-row gap-7 lg:gap-10 w-full max-w-[1312px] grow-0 shrink-0 basis-auto box-border mt-9">
        <div className="grow-0 shrink basis-auto xl:max-w-[calc(100vw-500px)]">
          <EnhancedImageGallery images={classData?.Images || []} />
          <div className="flex justify-start items-start gap-2 flex-col md:flex-row w-[100.00%] box-border mt-8">
            {!classCreatorData?.profileImage ? (
              <div className="w-20 h-20 md:h-[122px] md:w-[124px] rounded-full bg-gray-200 animate-pulse" />
            ) : (
              <img
                src={classCreatorData.profileImage}
                className="w-20 h-20 md:h-[122px] md:w-[124px] max-w-[initial] object-cover rounded-full block box-border shrink-0"
              />
            )}

            <div className="grow-0 shrink basis-auto md:ml-[31.5px]">
              {!classCreatorData ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-48"></div>
                </div>
              ) : (
                <p className="[font-family:'DM_Sans',sans-serif] text-2xl font-bold text-[#261f22] m-0 p-0">
                  {`${classCreatorData.firstName} ${classCreatorData.lastName}`}
                </p>
              )}

              {!reviews.length ? (
                <div className="flex justify-start items-center flex-row animate-pulse mt-[0.5rem]">
                  <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                  <div className="w-12 h-4 bg-gray-200 rounded ml-[3px]"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded ml-1.5"></div>
                </div>
              ) : (
                <div className="flex justify-start items-center flex-row">
                  <SvgIcon5 className="w-5 h-5 text-[#261f22] flex grow-0 shrink-0 basis-auto" />
                  <p className="[font-family:'DM_Sans',sans-serif] text-base font-bold text-[#261f22] grow-0 shrink-0 basis-auto ml-[3px] m-0 p-0">
                    {avgReview.toFixed(1)}
                  </p>
                  <p className="[font-family:'DM_Sans',sans-serif] text-base font-normal text-[#261f22] grow-0 shrink-0 basis-auto ml-1.5 m-0 p-0">
                    ({currentClassReview.length} reviews)
                  </p>
                </div>
              )}

              {!classData ? (
                <div className="animate-pulse mt-[18px]">
                  <div className="h-20 bg-gray-200 rounded w-full"></div>
                </div>
              ) : (
                <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[#261f22] w-[90.00%] box-border mt-[18px] m-0 p-0 md:ml-[.4rem]">
                  {classCreatorData?.profileDescription}
                </p>
              )}
            </div>
          </div>
          <FitnessProfileSection
            classId={classId}
            instructorData={classCreatorData}
            classData={classData}
          />
          <BookingComponent
            classId={classId}
            instructorId={classCreatorData?.userUid}
            classData={classData}
          />
          <FitnessScheduleMindfulnessDisplay
            classData={classData}
            timeSlotOptions={timeSlotOptions}
            mindfulClassCardOptions={mindfulClassCardOptions}
            reviewCountsArray2={reviewCountsArray2}
            dynamicReviewCountsArray={dynamicReviewCountsArray}
            dynamicReviewCountsArray1={dynamicReviewCountsArray1}
            reviewCountsArray={reviewCountsArray}
            classId={classId}
          />
          <FitnessReviewSectionWidget
            classTitle={classData?.Name}
            classId={classId}
            reviewCountsArray1={reviewCountsArray1}
            classData={classData}
            classCreatorData={classCreatorData}
          />
        </div>
        <div
          className="xl:block hidden shadow-[1px_1px_7px_rgba(0,0,0,0.20)] bg-[white] box-border justify-start items-stretch flex-col w-full lg:max-w-[300px] pt-6 px-4 md:px-6 rounded-xl md:rounded-2xl lg:rounded-3x xl:fixed xl:right-[2rem]"
          style={{ zIndex: 1 }}
        >
          <DynamicButtonSection
            classId={classId}
            classData={classData}
            instructorId={classCreatorData?.userUid}
          />
        </div>
      </div>
    </div>
  );
}

export default FitnessClassDetailsSection;
