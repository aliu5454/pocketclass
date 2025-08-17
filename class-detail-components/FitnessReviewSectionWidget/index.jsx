import DynamicButtonSection from "../DynamicButtonSection";
import FitnessReviewSectionContainer from "../FitnessReviewSectionContainer";
import ReviewSectionWidget from "../ReviewSectionWidget";
import ClassLocationMap from "../../components/ClassPageLocation";

function FitnessReviewSectionWidget({
  classId,
  reviewCountsArray1,
  classTitle,
  classData,
  classCreatorData,
}) {
  return (
    <div className="w-full box-border mt-12">
      <div
        className="xl:hidden flex mb-12 bg-[white] box-border justify-start items-stretch flex-col w-full lg:max-w-[300px] rounded-xl md:rounded-2xl lg:rounded-3x xl:fixed xl:right-[2rem]"
        style={{ zIndex: 1 }}
      >
        {/* <DynamicButtonSection
          classId={classId}
          classData={classData}
          instructorId={classData?.classCreator}
        /> */}
      </div>
      {classData?.longitude && classData?.latitude && (
        <ClassLocationMap
          longitude={classData.longitude}
          latitude={classData.latitude}
          address={classData.Address}
        />
      )}
      <FitnessReviewSectionContainer
        classId={classId}
        reviewCountsArray1={reviewCountsArray1}
        classTitle={classTitle}
      />
      <ReviewSectionWidget classId={classId} />
    </div>
  );
}

export default FitnessReviewSectionWidget;
