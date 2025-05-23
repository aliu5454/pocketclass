import ReviewStatisticsSection from "../ReviewStatisticsSection";
import RatingComparisonWidget from "../RatingComparisonWidget";
import DisplayProfileWithReviews from "../DisplayProfileWithReviews";

function ReviewDisplaySection2({ classId, reviewCountsArray1 }) {
  return (
    <div className="w-[100.00%] box-border mt-[23.5px]">
      <div className="flex justify-start lg:items-start flex-col xl:flex-row" style={{gap: '7rem'}}>
        <ReviewStatisticsSection
          classId={classId}
          reviewCountsArray1={reviewCountsArray1}
        />
        <RatingComparisonWidget classId={classId} />
      </div>
      <DisplayProfileWithReviews classId={classId} />
    </div>
  );
}

export default ReviewDisplaySection2;
