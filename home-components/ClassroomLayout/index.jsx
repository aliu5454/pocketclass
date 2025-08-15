import ClassOverviewLayout from "../ClassOverviewLayout";
import InstructorFinderView from "../InstructorFinderView";
import ExtracurricularCard from "../ExtracurricularCard";
import TeachingPassionBanner from "../TeachingPassionBanner";


function ClassroomLayout() {
  return (
    <div className="flex justify-start items-stretch flex-col gap-[120px] md:gap-[100px]">
      <ClassOverviewLayout />
      <InstructorFinderView />
      <ExtracurricularCard />
      <TeachingPassionBanner />
    </div>
  );
}

export default ClassroomLayout;
