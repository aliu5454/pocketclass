'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, CreditCard, ShieldCheck, Palette } from 'lucide-react';

// Lightweight intersection-based reveal component to avoid framer-motion production issues
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    // Use requestAnimationFrame to defer until after hydration
    const node = ref.current;
    let observer;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              setTimeout(() => setVisible(true), delay);
              observer.disconnect();
            }
          });
        },
        { threshold: 0.15 }
      );
      observer.observe(node);
    } else {
      // Fallback – show immediately
      setVisible(true);
    }
    return () => observer && observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {children}
    </div>
  );
}

function ExtracurricularCard() {
  return (
    <div className="pt-6 pb-0 md:py-14 px-4 md:px-6 mx-3 md:mx-0 relative">
      {/* Gradient Background */}
      <div className="absolute inset-0 opacity-80" style={{
        background: 'radial-gradient(ellipse 80% 60% at 40% 40%, #fef7ed 0%, #fefbf3 30%, #ffffff 70%)'
      }}></div>
      <div className="absolute inset-0 opacity-70" style={{
        background: 'radial-gradient(ellipse 70% 50% at 70% 30%, #fef3e2 0%, #ffffff 60%), radial-gradient(ellipse 60% 40% at 20% 80%, #fef7ed 0%, #ffffff 65%)'
      }}></div>
      <div className="absolute inset-0 opacity-60" style={{
        background: 'radial-gradient(ellipse 90% 70% at 60% 70%, #fde68a 0%, #ffffff 50%)'
      }}></div>
      <div className="absolute inset-0 opacity-65" style={{
        background: 'radial-gradient(ellipse 65% 45% at 80% 60%, #fef4f4 0%, #ffffff 55%), radial-gradient(ellipse 50% 35% at 30% 20%, #fffbeb 0%, #ffffff 60%)'
      }}></div>
      <div className="absolute inset-0 opacity-50" style={{
        background: 'radial-gradient(ellipse 75% 55% at 10% 90%, #fdf2f8 0%, #ffffff 40%)'
      }}></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
  {/* Header */}
  <Reveal>
          <h1 className="text-5xl text-center font-bold text-gray-900 mb-3 md:mb-5 font-sans">
            But Why PocketClass ?
          </h1>
          <p className="text-sm text-center md:text-base text-gray-800 max-w-xl md:max-w-2xl mx-auto leading-relaxed font-sans">
            Explore the incredible advantages of enrolling in our courses and enhancing your<br className="hidden md:block" />
            skills for the ultimate career success.
          </p>
  </Reveal>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-center max-w-6xl mx-auto mt-8 md:mt-12">
          {/* Left Column */}
          <Reveal delay={50}>
            <div className="space-y-6 md:space-y-10 order-2 lg:order-1">
            {/* Real-Time Availability */}
            <Reveal delay={100}>
              <div className="bg-blue-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <Calendar className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Real-Time Availability
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                See live schedules and book instantly — your spot is secured in seconds.
              </p>
            </Reveal>

            {/* Transparent & Secure Payments */}
            <Reveal delay={200}>
              <div className="bg-green-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Transparent & Secure Payments
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Pay online via Stripe with built-in cancellation and refund protections.
              </p>
            </Reveal>
            </div>
          </Reveal>

          {/* Center Column - Profile Card */}
          <Reveal delay={150}>
            <div className="relative flex justify-center order-1 lg:order-2 mb-8 lg:mb-0">
            {/* Main Profile Card */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-7 shadow-2xl relative z-10 w-full max-w-sm md:w-84">
              {/* Profile Image */}
              <div className="mb-4 md:mb-5">
                <div className="w-full aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                  <img 
                    src="/assets/founder_testamonial.jpg" 
                    alt="Testimonial founder"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Problem Section */}
              <div className="mb-4 md:mb-5">
                <h4 className="font-semibold text-grey-900 mb-1 text-left font-sans text-sm">Problem:</h4>
                <p className="text-xs md:text-sm text-grey-800 leading-relaxed text-left font-sans">
                  In 2023, it took me weeks to find a golf instructor. It took even longer to finalize a time and I had to send $1000 to secure a 10-class package with no guarantee of refunds.
                </p>
              </div>

              {/* Solution Section */}
              <div className="mb-5 md:mb-7">
                <h4 className="font-semibold text-gray-900 mb-1 text-left font-sans text-sm">Solution:</h4>
                <p className="text-xs md:text-sm text-gray-800 leading-relaxed text-left font-sans">
                  After building PocketClass, I can now book a coach directly through the platform. The booking goes straight into their calendar, payments and refunds are secure, and there's no back-and-forth before every class.
                </p>
              </div>
              
              {/* Bottom with signature */}
              <div className="flex items-center justify-end">
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Co-Founder, Andrew</div>
                </div>
              </div>
            </div>
            </div>
          </Reveal>

          {/* Right Column */}
          <Reveal delay={250}>
            <div className="space-y-6 md:space-y-10 order-3">
            {/* Verified Instructors */}
            <Reveal delay={300}>
              <div className="bg-purple-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Verified Instructors
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Every instructor has verified credentials and a proven track record.
              </p>
            </Reveal>

            {/* Classes for Every Passion */}
            <Reveal delay={400}>
              <div className="bg-orange-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <Palette className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Classes for Every Passion
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Sports, music, and art — 29+ categories, all levels, and both in-person & virtual options.
              </p>
            </Reveal>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

export default ExtracurricularCard;
