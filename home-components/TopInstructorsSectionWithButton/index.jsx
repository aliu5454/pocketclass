import { useState } from "react";
import { Button } from "@mui/base";
import TopInstructorsSection from "../TopInstructorsSection";

function TopInstructorsSectionWithButton({ activeFilter }) {
  const [displayCount, setDisplayCount] = useState(4); // Start with 1 row (4 classes)
  const [classCount, setClassCount] = useState(0);

  function handleSeeMore() {
    setDisplayCount((prev) => prev + 8); // Add 2 more rows (8 classes)
  }

  return (
    <section className="relative left-1/2 -translate-x-1/2 w-screen px-4 md:px-6 lg:px-8 py-8 overflow-x-hidden">
      {/* Full-bleed gradient layers */}
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_0%_50%,rgba(251,146,60,0.15),rgba(249,115,22,0.1)_40%,rgba(59,130,246,0.05)_70%,transparent_85%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_100%_50%,rgba(251,146,60,0.15),rgba(249,115,22,0.1)_40%,rgba(236,72,153,0.05)_70%,transparent_85%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_0%_50%,rgba(234,88,12,0.08),rgba(20,184,166,0.04)_50%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_100%_at_100%_50%,rgba(255,159,67,0.06),rgba(147,51,234,0.03)_60%,transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-50/20 via-transparent to-pink-50/20" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(255,251,251,0.85)_0%,rgba(255,251,251,0.6)_12%,rgba(255,251,251,0.3)_28%,rgba(255,251,251,0)_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_10%_50%,rgba(59,130,246,0.02),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_90%_50%,rgba(147,51,234,0.02),transparent_35%)]" />
      </div>

      {/* Centered content wrapper */}
      <div className="relative z-10 section-spacing max-w-[1600px] mx-auto flex flex-col items-stretch">
        <TopInstructorsSection
          displayCount={displayCount}
          activeFilter={activeFilter}
          onClassesLoad={(count) => setClassCount(count)}
        />
        <Button
          onClick={handleSeeMore}
          className="relative z-10 bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 [font-family:Inter,sans-serif] self-center w-full md:w-44 text-center text-base font-semibold text-[#261f22] min-w-[176px] h-[47px] cursor-pointer box-border mt-12 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          See More
        </Button>
      </div>
    </section>
  );
}

export default TopInstructorsSectionWithButton;
