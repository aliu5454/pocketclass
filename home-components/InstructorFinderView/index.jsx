import Pink from "../Pink";
import SvgIcon1 from "./icons/SvgIcon1";
import SvgIcon2 from "./icons/SvgIcon2";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {useEffect, useState} from "react";

function InstructorFinderView() {
  const parentsTestimonials = [
    {
      parentName: 'Aaron',
      image: '/assets/DSCF2239.jpg',
      testimonial: '“PocketClass made finding a golf coach so easy! I booked a lesson in minutes and received expert coaching tailored to my level.”',
      aboutText: 'Golf Beginner'
    },
    {
      parentName: 'Kiki',
      image: '/assets/DJ_Testamonial2.JPG',
      testimonial: '“I had an absolute blast at the DJ clinic! I’m mixing my own tracks now and feeling more creative than ever. Highly recommend PocketClass to anyone looking to level up in their passion!”',
      aboutText: 'Aspiring DJ'
    },
    {
      parentName: 'Ivan',
      image: '/assets/Yoga_Testamonial.jpg',
      testimonial: '“PocketClass helped me find an amazing yoga session effortlessly! Highly recommend PocketClass for anyone looking to find quality classes!”',
      aboutText: 'Yoga Enthusiast'
    },
    {
      parentName: 'Lucy',
      image: '/assets/Tennis_Testamonial.jpg',
      testimonial: '“Coach Eugene was so helpful in getting me to the next level in Tennis. Thank you to PocketClass for helping me find a coach so easily!!”',
      aboutText: 'Intermediate Tennis Player'
    },
    {
      parentName: 'Ben',
      image: '/assets/Gym_Testamonial.jpg',
      testimonial: '“PocketClass made it easy for me to find fitness help wheneve and wherever I needed it!"',
      aboutText: 'Gym Bro'
    },
  ]

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex justify-start items-center flex-col grow-0 shrink-0 basis-auto">
      <div className="flex justify-start items-stretch flex-col gap-12 md:gap-16 w-full max-w-[1182px] box-border">
        <div className="flex justify-start items-center flex-col grow-0 shrink-0 basis-auto">
          <div className="flex justify-start items-stretch flex-col max-w-[720px] box-border">
            <p className="section-heading">
              Find the right instructor for you
            </p>
            <p className="[font-family:'DM_Sans',sans-serif] text-lg font-bold text-center text-[#261f22] grow-0 shrink-0 basis-auto mt-6 m-0 p-0">With over 30 instructors and 100+ learners</p>
          </div>
        </div>
        <div className="testimonial-swiper-wrap relative md:px-10 lg:px-24 pt-6 pb-20">
          <Swiper
              navigation={{
                prevEl: isMobile ? null : ".testimonial-swiper-button-prev",
                nextEl: isMobile ? null : ".testimonial-swiper-button-next",
              }}
              pagination={{
                el: ".swiper-pagination",
                type: "bullets",
                clickable: true,
                bulletClass: "custom-bullet",
                bulletActiveClass: "active-bullet",
              }}
              loop={true}
              slidesPerView={1}
              spaceBetween={40}
              modules={[Navigation, Pagination]}
              className="category-swiper testimonial-slider !pb-5"
          >
            {parentsTestimonials.map((item, index) => {
              return (
                  <SwiperSlide key={index}>
                    <div className="flex flex-col md:flex-row gap-5 md:gap-10 lg:gap-16">
                      <div className="w-full md:w-[411px] relative">
                        <Pink />
                        <div className="relative z-2 h-[318px] md:h-[405px] w-[95%] md:w-[350px] lg:w-[411px] rounded-3xl overflow-hidden mb-5 mr-5">
                          <img src={item.image} alt="Slider Image"
                                className="object-cover w-full h-full"/></div>
                      </div>
                      <div className="flex justify-center items-stretch flex-col grow-0 shrink basis-auto">
                        <p className="[font-family:'DM_Sans',sans-serif] text-2xl md:text-3xl lg:text-[32px] font-bold text-left lg:leading-10 text-[#261f22] m-0 p-0">
                          {item.testimonial}
                        </p>
                        <p className="[font-family:'DM_Sans',sans-serif] text-lg md:text-2xl font-bold text-[#261f22] mt-6 m-0 p-0">
                          {item.parentName}
                        </p>
                        <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-[#261f22] mt-2 m-0 p-0">
                          {item.aboutText}</p>
                      </div>
                    </div>
                  </SwiperSlide>
              )
            })}
          </Swiper>
          {!isMobile && (<SvgIcon1 className="testimonial-swiper-button-prev" />)}
          {!isMobile && (<SvgIcon2 className="testimonial-swiper-button-next" />)}

          <div className="swiper-pagination"></div>
        </div>

      </div>
    </div>
  );
}

export default InstructorFinderView;
