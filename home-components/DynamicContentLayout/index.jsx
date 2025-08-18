import { Button } from "@mui/base";
import ActivityDiscoverySection from "../ActivityDiscoverySection";
import StepConnect from "../StepConnect";
import ProgressTrackerWidget from "../ProgressTrackerWidget";
import Link from "next/link";
import { Reveal, RevealGroup } from "../Reveal";

function DynamicContentLayout() {
  // How PocketClass Works
  return (
    <div className="flex justify-center items-stretch flex-col w-[100.00%] box-border mt-10">
      <Reveal variant="fade-up" delay={100} y={32} className="w-[100.00%] box-border mt-4">
      <RevealGroup interval={200} className="space-y-0">
      <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-[30px] grow-0 shrink-0 basis-auto">
        <div className="max-w-[343px] grow shrink basis-[0.00] box-border text-center md:text-left">
          <img
            src="/assets/image_42111b0a.png"
            alt=""
            className="h-[104px] w-[104px] mx-auto md:ml-auto"
          />
          <ActivityDiscoverySection />
        </div>
        <div className="max-w-[343px] grow shrink basis-[0.00] box-border text-center md:text-left">
          <img
            src="/assets/image_c8a477f5.png"
            alt=""
            className="h-[104px] w-[104px] mx-auto md:ml-auto"
          />
          <StepConnect />
        </div>
        <div className="max-w-[343px] grow shrink basis-[0.00] box-border text-center md:text-left">
          <img
            src="/assets/image_abe63efd.png"
            alt=""
            className="h-[104px] w-[104px] mx-auto md:ml-auto"
          />
          <ProgressTrackerWidget />
        </div>
      </div>
      </RevealGroup>
      </Reveal>
      {/* Button Component starts here. We've generated code using MUI Base. See other options in "Component library" dropdown in Settings */}
      <Link href="/browse/All">
        <Button className="bg-[#261f22] [font-family:Inter,sans-serif] text-sm font-semibold text-[white] min-w-[220px] h-[45px] w-[220px] cursor-pointer block box-border self-center grow-0 shrink-0 basis-auto mt-10 rounded-[100px] border-[none]">
          Find Classes
        </Button>
      </Link>
    </div>
  );
}

export default DynamicContentLayout;
