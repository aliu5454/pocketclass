import ExtracurricularBanner from "../ExtracurricularBanner";

function ExtracurricularInfoBlock() {
  return (
    // Full-bleed section: backgrounds span viewport, inner content centered and constrained
    <section className="relative left-1/2 -translate-x-1/2 w-screen flex flex-col items-center overflow-x-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Radial gradient glow full width */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_48%_at_50%_50%,rgba(251,146,60,0.24)_0%,rgba(251,146,60,0.14)_18%,rgba(251,146,60,0.08)_34%,rgba(251,146,60,0.05)_50%,rgba(251,146,60,0.03)_66%,rgba(251,146,60,0.015)_78%,rgba(251,146,60,0)_92%)]" />
        {/* Slanted pattern overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-normal">
          <img src="/assets/slanted-bg.png" alt="Decorative slanted background" className="object-cover w-full h-full" />
        </div>
      </div>

      {/* Foreground content container */}
      <div className="section-spacing relative z-10 flex flex-col items-center max-w-[748px] box-border pt-[88px] pb-[88px] md:pb-[141px]">
        <ExtracurricularBanner />
        <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-center leading-6 text-[#261f22] w-full max-w-[484px] mt-6">
          Life is busy, and finding the right extracurricular activities can be a challenge. PocketClass makes it simple. We connect you with local, qualified instructors offering lessons in sports,
          arts, and music—all on one easy-to-use platform.
        </p>
      </div>
    </section>
  );
}

export default ExtracurricularInfoBlock;
