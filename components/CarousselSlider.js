import Marquee from "react-fast-marquee";
import Image from "next/image";

// Keep original images list intact
const images = [
  "/assets/Partnerships/DMZ.png",
  "/assets/Partnerships/Estrelar.jpeg",
  "/assets/Partnerships/iCube.png",
  "/assets/Partnerships/Speedy_Golf.jpg",
  "/assets/Partnerships/TMU.jpg",
  "/assets/Partnerships/uoft.jpg",
  "/assets/Partnerships/HockeyPylon.png",
  "/assets/Partnerships/UNITYLogo.jpg",
  "/assets/Partnerships/munchwell.png",
];

const CarousselSlider = () => {
  return (
    <div className="relative mx-2 my-12 md:m-12 p-4">
      {/* <h1 className="[font-family:'DM_Sans',sans-serif] text-[32px] md:text-[40px] font-bold text-center leading-[40px] md:leading-[48px] text-[#261f22] max-w-[642px] mx-auto mb-10">
        Our Partners
      </h1> */}
      
      {/* Left blur overlay */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
      
      {/* Right blur overlay */}
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

        <Marquee
          speed={50} 
          gradient={false}
          pauseOnHover={true}
          pauseOnClick={false}
          autoFill={true}
        >
          {images.map((src, i) => (
            <div key={i} className="mx-2 md:mx-12 flex items-center justify-center h-24 select-none overflow-visible">
              <div className="relative w-[125px] h-16 transition-all duration-500 ease-out hover:scale-110">
                <Image
                  src={src}
                  alt={`Partner ${i + 1}`}
                  layout="fill"
                  priority={true}
                  draggable={false}
                  className="object-contain opacity-70 hover:opacity-100 transition-opacity duration-500 ease-out"
                />
              </div>
            </div>
          ))}
        </Marquee>
    </div>
  );
};

export default CarousselSlider;
