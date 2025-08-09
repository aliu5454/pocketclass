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
    <div className="bg-[#fdebeb] box-border flex justify-start items-stretch flex-col w-full section-spacing py-8">
      <TopInstructorsSection
        displayCount={displayCount}
        activeFilter={activeFilter}
        onClassesLoad={(count) => setClassCount(count)}
      />

      <Button
        onClick={handleSeeMore}
        className="bg-transparent [font-family:Inter,sans-serif] self-center w-full md:w-44 text-center text-base font-semibold text-[#261f22] min-w-[176px] h-[47px] cursor-pointer box-border mt-12 rounded-full border-2 border-solid border-[#261f22]"
      >
        See More
      </Button>
    </div>
  );
}

export default TopInstructorsSectionWithButton;
