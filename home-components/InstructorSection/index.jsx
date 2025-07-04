import { Skeleton } from "@mui/material";
import Link from "next/link";
import SuperInstructorCard from "../SuperInstructorCard";
import MusicianProfileCard1 from "../MusicianProfileCard1";
import { useRouter } from "next/router";

function InstructorSection({ classId, instructor, loading }) {
  const router = useRouter();
  if (loading) {
    return (
      <div className="shrink-0 bg-[white] box-border flex justify-start items-stretch flex-col grow basis-[0.00] rounded-2xl">
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
      </div>
    );
  }

  return (
    <Link href={`/classes/id=${classId}`} className="cursor-pointer">
      <div className="min-w-[305px] bg-[white] box-border flex flex-none justify-start items-stretch flex-col rounded-2xl cursor-pointer">
        <SuperInstructorCard
          instructorImg={instructor?.profileImage}
          superInstructor={instructor?.TopRated}
          classId={classId}
        />
        <MusicianProfileCard1 instructor={instructor} router={router} />
      </div>
    </Link>
  );
}

export default InstructorSection;
