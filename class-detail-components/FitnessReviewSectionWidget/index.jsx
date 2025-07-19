import DynamicButtonSection from "../DynamicButtonSection";
import FitnessReviewSectionContainer from "../FitnessReviewSectionContainer";
import ReviewSectionWidget from "../ReviewSectionWidget";

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
        <DynamicButtonSection
          classId={classId}
          classData={classData}
          instructorId={classCreatorData?.userUid}
        />
      </div>
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
