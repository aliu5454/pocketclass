import { Button } from "@mui/base";

import Link from "next/link";

function TeachingPassionBanner() {
    return (
        <section className="relative w-screen left-1/2 -translate-x-1/2 py-16 sm:py-20 lg:py-24 overflow-x-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_48%_at_50%_50%,rgba(251,146,60,0.24)_0%,rgba(251,146,60,0.14)_18%,rgba(251,146,60,0.08)_34%,rgba(251,146,60,0.05)_50%,rgba(251,146,60,0.03)_66%,rgba(251,146,60,0.015)_78%,rgba(251,146,60,0)_92%)]" />

                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0)_25%,rgba(255,255,255,0)_75%,rgba(255,255,255,0.9)_100%)]" />
            </div>

            <div className="relative max-w-4xl mx-auto text-center px-5 sm:px-8">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
                    Your students are waiting - start teaching on{" "}
                    <span className="text-logo-red">PocketClass</span> today
                </h2>

                <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600 max-w-2xl mx-auto">
                    Join thousands of instructors who've already transformed
                    their teaching business
                </p>

                <Link href="/instructor-onboarding">
                    <button className="bg-logo-red text-white px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold hover:bg-orange-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation">
                        Sign Up Free
                    </button>
                </Link>

                <p className="mt-3 sm:mt-4 text-gray-500 text-xs sm:text-sm">
                    No setup fees • Cancel anytime • Start earning immediately
                </p>
            </div>
        </section>
    );
}

export default TeachingPassionBanner;
