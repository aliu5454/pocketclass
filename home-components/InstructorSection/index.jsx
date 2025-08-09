import { Skeleton } from "@mui/material";
import Link from "next/link";
import SuperInstructorCard from "../SuperInstructorCard";
import MusicianProfileCard1 from "../MusicianProfileCard1";
import { useRouter } from "next/router";
import SvgIcon2 from "../MusicianCard/icons/SvgIcon2";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { motion, AnimatePresence } from "framer-motion"; // ← added

function InstructorSection({ classId, instructor, loading, reviews }) {
  const router = useRouter();
  const rating = instructor?.averageRating;
  const classReviews = reviews?.filter((r) => r.classID === classId) || [];
  const reviewCount = classReviews.length;
  const [classData, setClassData] = useState(null);

  useEffect(() => {
    if (!classId) return;
    const controller = new AbortController();

    (async () => {
      try {
        const classSnap = await getDoc(doc(db, "classes", classId));
        classSnap.exists() && setClassData(classSnap.data());
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching class data:", error);
        }
      }
    })();

    return () => controller.abort();
  }, [classId]);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="shrink-0 bg-[white] box-border flex justify-start items-stretch flex-col grow basis-[0.00] rounded-2xl"
        >
          <div className="pt-4 pb-[172px] px-4">
            <Skeleton
              variant="rectangular"
              width="100%"
              height={200}
              animation="wave"
              sx={{ borderRadius: "16px" }}
            />
          </div>
          <div className="px-[15px] py-4">
            <Skeleton variant="text" width="70%" height={30} animation="wave" />
            <Skeleton variant="text" width="50%" height={20} animation="wave" />
            <div className="mt-4">
              <Skeleton
                variant="rectangular"
                width={220}
                height={45}
                animation="wave"
                sx={{ borderRadius: "100px" }}
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href={`/classes/id=${classId}`}
            className="box-border cursor-pointer h-full w-full"
          >
            <div className="w-full h-full bg-white box-border flex flex-col justify-between rounded-2xl pb-2">
              {/* Top Section */}
              <div className="flex-grow mb-2">
                <div className="box-border">
                  <SuperInstructorCard
                    instructorImg={instructor?.profileImage}
                    superInstructor={instructor?.TopRated}
                    classId={classId}
                  />
                </div>
                <MusicianProfileCard1 instructor={instructor} router={router} />
              </div>

              {/* First class free */}
              {classData?.firstFree && (
                <p className="border border-green-400 flex flex-row items-center justify-center px-3 rounded-lg text-sm text-green-500 grow-0 py-[2px] shrink-0 basis-auto mx-[8px] w-max m-0 p-0">
                  First Class Free
                </p>
              )}

              {/* Bottom Section */}
              <div className="flex items-center cursor-default gap-2 justify-between px-[15px] mt-auto w-full">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <SvgIcon2 className="w-5 h-5 text-[#261f22]" />
                  <p className="text-base font-bold text-[#261f22]">
                    {rating?.toFixed(1)}
                    <span className="text-sm ml-1 text-[#7d797a] font-normal">
                      ({reviewCount})
                    </span>
                  </p>
                </div>
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(
                      `/instructor?class=${classId}&creator=${instructor.classCreator}`
                    );
                  }}
                  className="transition duration-300 ease-in-out flex items-center flex-shrink min-w-0"
                >
                  <div className="cursor-pointer flex items-center gap-1 px-1 py-1 text-[#7d797a] hover:text-[#000] hover:bg-gray-200 rounded-xl overflow-hidden">
                    <p className="text-base font-bold truncate ">
                      By{" "}
                      {(() => {
                        const name =
                          instructor?.instructorName || "Instructor";
                        const [first] = name.trim().split(/\s+/);
                        return first;
                      })()}
                    </p>
                    {instructor?.instructorImage ? (
                      <img
                        src={instructor.instructorImage}
                        loading="lazy"
                        alt="Instructor"
                        className="w-[30px] h-[30px] rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-[30px] h-[30px] rounded-full flex-shrink-0 text-[#888]"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InstructorSection;
