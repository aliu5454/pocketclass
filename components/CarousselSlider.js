import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/autoplay";

import SwiperCore, { Autoplay } from "swiper";

SwiperCore.use([Autoplay]);

const images = [
    "./assets/Partnerships/DMZ.png",
    "./assets/Partnerships/Estrelar.jpeg",
    "./assets/Partnerships/iCube.png",
    "./assets/Partnerships/Speedy_Golf.jpg",
    "./assets/Partnerships/TMU.jpg",
    "./assets/Partnerships/uoft.jpg",
    "./assets/Partnerships/HockeyPylon.png",
    "./assets/Partnerships/UNITYLogo.jpg",
    "./assets/Partnerships/munchwell.png"
];

const CarousselSlider = () => {
  return (
    <div className="">
      <h1 className="[font-family:'DM_Sans',sans-serif] text-[32px] md:text-[40px] font-bold text-center leading-[40px] md:leading-[48px] text-[#261f22] max-w-[642px] mx-auto box-border m-0 p-0 mb-10">Our Partners</h1>
      <Swiper
        spaceBetween={20} 
        slidesPerView={"auto"} 
        loop="true"
        autoplay={{
          delay: 0, 
          disableOnInteraction: false, 
        }}
        speed={3000} x
        freeMode={true} 
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} style={{ width: "auto" }}>
            <img src={image} className="h-24" alt={`Image ${index + 1}`} />
          </SwiperSlide>
        ))}
        {images.map((image, index) => (
          <SwiperSlide key={index} style={{ width: "auto" }}>
            <img src={image} className="h-24" alt={`Dup Image ${index + 1}`} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default CarousselSlider;
