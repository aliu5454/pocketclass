function ExtracurricularCard() {
  return (
    <div className="pt-6 pb-0 md:py-14 px-4 md:px-6 mx-3 md:mx-0">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-3 md:mb-5 font-sans">
            But Why PocketClass ?
          </h1>
          <p className="text-sm md:text-base text-gray-800 max-w-xl md:max-w-2xl mx-auto leading-relaxed font-sans">
            Explore the incredible advantages of enrolling in our courses and enhancing your<br className="hidden md:block" />
            skills for the ultimate career success.
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-center max-w-6xl mx-auto">
          {/* Left Column */}
          <div className="space-y-6 md:space-y-10 order-2 lg:order-1">
            {/* Real-Time Availability */}
            <div className="text-left">
              <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Real-Time Availability
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                See live schedules and book instantly — your spot is secured in seconds.
              </p>
            </div>

            {/* Transparent & Secure Payments */}
            <div className="text-left">
              <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Transparent & Secure Payments
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Pay online via Stripe with built-in cancellation and refund protections.
              </p>
            </div>
          </div>

          {/* Center Column - Profile Card */}
          <div className="relative flex justify-center order-1 lg:order-2 mb-8 lg:mb-0">
            {/* Very light orange asymmetric gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-100/60 via-orange-50/30 to-orange-200/40 rounded-3xl transform rotate-3 scale-110 -z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-orange-100/50 via-orange-75/20 to-orange-50/30 rounded-2xl transform -rotate-2 scale-105 -z-10"></div>
            
            {/* Main Profile Card */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-7 shadow-2xl relative z-10 w-full max-w-sm md:w-84">
              {/* Profile Image */}
              <div className="mb-4 md:mb-5">
                <div className="w-full aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=face" 
                    alt="Instructor with crossed arms in modern workspace"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Problem Section */}
              <div className="mb-4 md:mb-5">
                <h4 className="font-semibold text-grey-900 mb-1 text-left font-sans text-sm">Problem:</h4>
                <p className="text-xs md:text-sm text-grey-800 leading-relaxed text-left font-sans">
                  In 2023, it took me weeks to find a tennis instructor. It took even longer to finalize a time and I had to send $300 to secure a 10-class package with no guarantee of refunds.
                </p>
              </div>

              {/* Solution Section */}
              <div className="mb-5 md:mb-7">
                <h4 className="font-semibold text-gray-900 mb-1 text-left font-sans text-sm">Solution:</h4>
                <p className="text-xs md:text-sm text-gray-800 leading-relaxed text-left font-sans">
                  After using PocketClass, I can now book Coach Eugene directly through the platform. The booking goes straight into his calendar, payments and refunds are secure, and there's no back-and-forth before every class.
                </p>
              </div>
              
              {/* Bottom with dots and signature */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <div className="w-5 h-2 md:w-7 md:h-2.5 bg-logo-red/80 rounded-full"></div>
                  <div className="w-4 h-2 md:w-5 md:h-2.5 bg-logo-red/60 rounded-full"></div>
                  <div className="w-3 h-2 md:w-3.5 md:h-2.5 bg-logo-red/40 rounded-full"></div>
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-logo-red/20 rounded-full"></div>
                </div>
                <div className="text-sm md:text-base text-gray-700 font-signature" style={{transform: 'rotate(-5deg)'}}>
                  Signature
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 md:space-y-10 order-3">
            {/* Verified Instructors */}
            <div className="text-left">
              <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Verified Instructors
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Every instructor has verified credentials and a proven track record.
              </p>
            </div>

            {/* Classes for Every Passion */}
            <div className="text-left">
              <div className="bg-white p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Classes for Every Passion
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Sports, music, and art — 29+ categories, all levels, and both in-person & virtual options.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExtracurricularCard;
