"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/router";

// Custom Chevron Icons
const ChevronLeftIcon = ({ size = 24, className = "" }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ size = 24, className = "" }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function ClassCarousel({ classes }) {
  const scrollRef = useRef(null);
  const [showArrows, setShowArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const router = useRouter();

  const scroll = (direction) => {
    const container = scrollRef.current;
    const scrollAmount = 300;
    if (container) {
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const checkScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 5);
    setCanScrollRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 5
    );
  };

  useEffect(() => {
    checkScroll(); // initial check on mount and when classes update

    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    // delay to ensure layout update
    const timeout = setTimeout(checkScroll, 100);

    return () => {
      container.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timeout);
    };
  }, [classes.length]);

  if (!classes || classes.length === 0) return null;

  return (
    <div
      className="relative max-w-6xl mx-auto mt-10 px-4 group"
      onMouseEnter={() => setShowArrows(true)}
      onMouseLeave={() => setShowArrows(false)}
    >
      <h2 className="text-2xl font-bold mb-4">Available Classes</h2>

      {/* Left Chevron */}
      <button
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
        className={`absolute left-0 top-0 h-full z-10 flex items-center px-2 transition-opacity duration-300
          ${showArrows ? "opacity-100" : "opacity-0"}
          ${
            canScrollLeft
              ? "bg-gradient-to-r from-white/90 via-white/70 to-transparent cursor-pointer"
              : "opacity-30 cursor-default"
          }`}
        aria-label="Scroll left"
      >
        <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
      </button>

      {/* Scrollable Cards */}
      <div
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto scrollbar-hide scroll-smooth"
      >
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="flex-shrink-0 w-64 bg-white rounded-xl shadow-md border p-3 hover:shadow-lg transition flex flex-col justify-between"
          >
            <div>
              {/* Image */}
              <div className="w-full h-40 bg-gray-100 rounded-md overflow-hidden mb-3">
                {cls.Images?.[0] ? (
                  <img
                    src={cls.Images[0]}
                    alt={cls.Name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No image
                  </div>
                )}
              </div>

              <h3 className="text-base font-semibold text-gray-800 truncate">
                {cls.Name}
              </h3>

              <p className="text-sm text-gray-600 line-clamp-3 my-2">
                {cls.Description}
              </p>

              {cls.Price && (
                <p className="text-sm font-medium text-green-600">
                  {cls.Price} CAD
                </p>
              )}

              {cls.Category && (
                <p className="text-xs text-gray-500 mt-1">
                  Category: {cls.Category}
                </p>
              )}
            </div>

            {/* Book Now Button */}
            <button
              onClick={() => router.push(`/classes/id=${cls.id}`)}
              className="mt-4 w-full bg-black text-white py-2 rounded-md text-sm font-semibold hover:bg-gray-800 transition"
            >
              Book Now
            </button>
          </div>
        ))}
      </div>

      {/* Right Chevron */}
      <button
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
        className={`absolute right-0 top-0 h-full z-10 flex items-center px-2 transition-opacity duration-300
          ${showArrows ? "opacity-100" : "opacity-0"}
          ${
            canScrollRight
              ? "bg-gradient-to-l from-white/90 via-white/70 to-transparent cursor-pointer"
              : "opacity-30 cursor-default"
          }`}
        aria-label="Scroll right"
      >
        <ChevronRightIcon className="w-6 h-6 text-gray-700" />
      </button>
    </div>
  );
}
