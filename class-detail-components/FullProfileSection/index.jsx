import ExperienceSection from "../FineArtDegreeSection";
import PricingSection from "../PricingSection";

function FullProfileSection({ instructorData, classData }) {
  return (
    <div className="w-[100.00%] box-border ">
      <ExperienceSection classData={classData} instructorData={instructorData} />
      <PricingSection classData={classData} />
    </div>
  );
}

export default FullProfileSection;
