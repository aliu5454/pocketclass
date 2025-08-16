import TopInstructorsSectionWithButton from "../TopInstructorsSectionWithButton";
import ExtracurricularInfoBlock from "../ExtracurricularInfoBlock";
import RecentlyViewedSection from "../recentlyViewed";
import RecommendedClassesSection from "../RecommendedClasses";
import CarousselSlider from "../../components/CarousselSlider";

function InstructorInfoSection({ activeFilter }) {
  return (
    <div>
      <TopInstructorsSectionWithButton activeFilter={activeFilter} />
      <ExtracurricularInfoBlock />
      <CarousselSlider/>
      <RecentlyViewedSection activeFilter={activeFilter} />
      <RecommendedClassesSection activeFilter={activeFilter} />
    </div>
  );
}

export default InstructorInfoSection;
