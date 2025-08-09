import { useState, useEffect } from "react";
import { AiOutlineHeart, AiFillHeart } from "react-icons/ai";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@mui/base";
import { Skeleton } from "@mui/material";

function SuperInstructorCard({
  instructorImg = "",
  superInstructor = false,
  classId,
}) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user] = useAuthState(auth);
  const imageUrl =
    instructorImg ||
    "https://s3-alpha-sig.figma.com/img/0a4e/e6d8/04f1b8bc98ca9140f475bc83c632e5c6?Expires=1732492800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=SfAp96~SAW71bK5RsMaHR94JrlWn4y2lSq4S04HFSW07iiQJ5oUMcwNnELdYWkYjOfWBZ9bEFcvW950C-PhcgDmW~s12XGrEaUtIZd5gLo5L2-9lYO-YVQqha6XUZxwLVwPnEaySbyZW~BY89p2z-EfTAtMpbEf6FpO7fAX-RNIge2H4bgL9Kq4BBPPBU~E5Aj-G6bVSznIbwxtjiIfBWESPoedzrpVM1sD4t9m6uNbWWIbhc24ysqRbEvRYvhKbJ615L78etjqmNcwY5NO-YVC5CO~l71Fob43W2sQC4WojfZjGMslkcx6BNWY1kyl6UkJFRyCkh6tu8L2lE~Va~A__";

  useEffect(() => {
    checkFavoriteStatus();
  }, [classId, user]);

  const checkFavoriteStatus = async () => {
    if (!user || !classId) {
      setIsLoading(false);
      return;
    }

    try {
      const favoriteRef = doc(db, "favorites", `${user.uid}_${classId}`);
      const docSnap = await getDoc(favoriteRef);
      setIsFavorite(docSnap.exists());
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (event) => {
    event.stopPropagation();

    if (!user) return;

    const favoriteRef = doc(db, "favorites", `${user.uid}_${classId}`);

    try {
      if (isFavorite) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, {
          userId: user.uid,
          classId,
          createdAt: new Date(),
        });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };
  return (
    <div className="-z-0 relative h-full w-full overflow-hidden rounded-2xl">
      <div className="absolute top-0 left-0 -z-10 w-full h-full rounded-2xl overflow-hidden">
        {/* Background Image */}
        <img
          src={imageUrl}
          alt="Instructor Background"
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Blur and Brightness Overlay */}
        <div className="absolute inset-0 backdrop-blur-sm brightness-70"></div>

        {/* Foreground Image (Normal Size) */}
        <div className="absolute inset-0 flex justify-center items-center">
          <img
            src={imageUrl}
            alt="Instructor"
            loading="lazy"
            className="max-h-full max-w-full shadow-lg object-contain"
          />
        </div>
      </div>

      <div className="box-border flex justify-start h-full w-full items-stretch flex-row grow-0 shrink-0 basis-auto pt-4 pb-[172px] px-4 relative bg-center -z-1">
        <div className="box-border absolute flex justify-between items-center w-full left-0 px-2">
          <div className="w-[55.15%] grow-0 shrink-0 basis-auto box-border pb-3.5">
            {superInstructor && (
              <Button className="bg-[white] [font-family:'DM_Sans',sans-serif] text-sm font-bold text-[#261f22] min-w-[135px] h-[26px] w-[135px] cursor-pointer block box-border rounded-[100px] border-[none]">
                Super Instructor
              </Button>
            )}
          </div>
          <div className="box-border flex justify-center items-center flex-col w-10 h-10 rounded-[20px]">
            {isLoading ? (
              <Skeleton
                variant="circular"
                width={40}
                height={40}
                className="bg-gray-300"
              />
            ) : (
              user && (
                <div
                  onClick={toggleFavorite}
                  className="border backdrop-blur-[5.75px] bg-[rgba(81,76,78,0.50)] box-border flex justify-center items-center flex-col w-10 h-10 rounded-[20px] border-solid border-[white]"
                >
                  <button className="focus:outline-none">
                    {isFavorite ? (
                      <AiFillHeart className="w-5 h-5 text-red-500" />
                    ) : (
                      <AiOutlineHeart className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
export default SuperInstructorCard;
