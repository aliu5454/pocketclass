import TopInstructorsSectionWithButton from "../TopInstructorsSectionWithButton";
import ExtracurricularInfoBlock from "../ExtracurricularInfoBlock";
import RecentlyViewedSection from "../recentlyViewed";
import RecommendedClassesSection from "../RecommendedClasses";

function InstructorInfoSection({ activeFilter }) {
  return (
    <div>
      <TopInstructorsSectionWithButton activeFilter={activeFilter} />
      <ExtracurricularInfoBlock />
      <RecentlyViewedSection activeFilter={activeFilter} />
      <RecommendedClassesSection activeFilter={activeFilter} />
    </div>
  );
}

export default InstructorInfoSection;
