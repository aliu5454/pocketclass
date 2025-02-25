import ReviewCard from "../ReviewCard";

function PostReviewSection({ classId }) {
  return (
    <>
      <p className="[font-family:'DM_Sans',sans-serif] text-2xl font-bold text-[#261f22] m-0 p-0 max-md:text-center" id="review">
        Write a review
      </p>
      <div className="flex justify-start items-stretch flex-col w-[100.00%] box-border mt-10">
        <ReviewCard classId={classId}/>
      </div>
    </>
  );
}

export default PostReviewSection;
