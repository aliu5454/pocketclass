import { motion } from 'framer-motion';
import { Calendar, CreditCard, ShieldCheck, Palette } from 'lucide-react';

function ExtracurricularCard() {
  return (
    <div className="pt-6 pb-0 md:py-14 px-4 md:px-6 mx-3 md:mx-0">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-bold text-gray-900 mb-3 md:mb-5 font-sans">
            But Why PocketClass ?
          </h1>
          <p className="text-sm md:text-base text-gray-800 max-w-xl md:max-w-2xl mx-auto leading-relaxed font-sans">
            Explore the incredible advantages of enrolling in our courses and enhancing your<br className="hidden md:block" />
            skills for the ultimate career success.
          </p>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-center max-w-6xl mx-auto">
          {/* Left Column */}
          <motion.div 
            className="space-y-6 md:space-y-10 order-2 lg:order-1"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Real-Time Availability */}
            <motion.div 
              className="text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-blue-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <Calendar className="w-6 h-6 md:w-7 md:h-7 text-blue-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Real-Time Availability
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                See live schedules and book instantly — your spot is secured in seconds.
              </p>
            </motion.div>

            {/* Transparent & Secure Payments */}
            <motion.div 
              className="text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-green-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-green-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Transparent & Secure Payments
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Pay online via Stripe with built-in cancellation and refund protections.
              </p>
            </motion.div>
          </motion.div>

          {/* Center Column - Profile Card */}
          <motion.div 
            className="relative flex justify-center order-1 lg:order-2 mb-8 lg:mb-0"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Main Profile Card */}
            <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-7 shadow-2xl relative z-10 w-full max-w-sm md:w-84">
              {/* Profile Image */}
              <div className="mb-4 md:mb-5">
                <div className="w-full aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                  <img 
                    src="/founder_testamonial.jpg" 
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
                  After using PocketClass, I can now book a coach directly through the platform. The booking goes straight into their calendar, payments and refunds are secure, and there's no back-and-forth before every class.
                </p>
              </div>
              
              {/* Bottom with signature */}
              <div className="flex items-center justify-end">
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Co-Founder, Andrew</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div 
            className="space-y-6 md:space-y-10 order-3"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Verified Instructors */}
            <motion.div 
              className="text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-purple-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 md:w-7 md:h-7 text-purple-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Verified Instructors
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Every instructor has verified credentials and a proven track record.
              </p>
            </motion.div>

            {/* Classes for Every Passion */}
            <motion.div 
              className="text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-orange-50 p-3 md:p-3.5 rounded-xl shadow-md w-12 h-12 md:w-14 md:h-14 mb-3 md:mb-5 flex items-center justify-center">
                <Palette className="w-6 h-6 md:w-7 md:h-7 text-orange-600" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 md:mb-3 font-sans">
                Classes for Every Passion
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed font-sans">
                Sports, music, and art — 29+ categories, all levels, and both in-person & virtual options.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ExtracurricularCard;
