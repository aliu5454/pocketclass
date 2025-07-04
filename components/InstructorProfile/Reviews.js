import { useEffect, useState, useRef } from "react";
import { Rate } from "antd";

function ProfileCard({ classId, reviewsToShown }) {
  const [reviews, setReviews] = useState(reviewsToShown || []);
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef(null);
  const [height, setHeight] = useState("auto");

  const reviewsToDisplay = showAll ? reviews : reviews.slice(0, 2);

  useEffect(() => {
    if (reviewsToShown) {
      setReviews(reviewsToShown);
    }
  }, [reviewsToShown]);

  useEffect(() => {
    if (!containerRef.current) return;
    const contentHeight = containerRef.current.scrollHeight;
    if (showAll) {
      setHeight(`${contentHeight}px`);
    } else {
      // height of 2 review cards = approx.
      const cards = containerRef.current.querySelectorAll(".review-card");
      const h = [...cards]
        .slice(0, 2)
        .reduce((sum, el) => sum + el.offsetHeight + 32, 0); // 32 for margin/padding
      setHeight(`${h}px`);
    }
  }, [showAll, reviews]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return "Just now";
    const now = new Date();
    const reviewDate = timestamp.toDate();
    const diff = now - reviewDate;
    const mins = Math.floor(diff / (1000 * 60));
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    if (weeks < 4) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  };

  const getReviewRating = (review) => {
    const { safetyRating, recommendRating, qualityRating } = review;
    return (safetyRating + recommendRating + qualityRating) / 3;
  };

  return (
    <div className="w-full transition-all">
      <div
        className="overflow-hidden transition-[max-height] duration-500 ease-in-out"
        style={{ maxHeight: height }}
      >
        <div ref={containerRef} className="space-y-8">
          {reviews.map((review, index) => (
            <div
              key={review.id}
              className="w-full p-4 border rounded-md shadow-sm bg-white review-card"
            >
              <div className="flex items-start gap-4">
                <img
                  src={review.photo || "/assets/image_7814b352.jpeg"}
                  alt={review.name}
                  className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-[#261f22] break-words">
                    {review.name}
                  </p>
                  <Rate
                    disabled
                    defaultValue={getReviewRating(review)}
                    allowHalf
                    style={{ fontSize: 15 }}
                  />
                  {review?.createdAt && (
                    <p className="text-sm text-[#a8a5a7] mt-2">
                      {getTimeAgo(review.createdAt)}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-[#261f22] text-base leading-6 whitespace-pre-wrap break-words overflow-hidden break-all">
                {review.review}
              </p>
            </div>
          ))}
        </div>
      </div>

      {reviews.length > 2 && (
        <p
          onClick={() => setShowAll(!showAll)}
          className="mt-6 text-base font-medium text-[#261f22] cursor-pointer hover:underline"
        >
          {showAll ? "- Show less reviews" : "+ Show more reviews"}
        </p>
      )}
    </div>
  );
}

export default ProfileCard;
