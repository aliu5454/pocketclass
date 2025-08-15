import Marquee from "react-fast-marquee";

// Keep original images list intact
const images = [
  "./assets/Partnerships/DMZ.png",
  "./assets/Partnerships/Estrelar.jpeg",
  "./assets/Partnerships/iCube.png",
  "./assets/Partnerships/Speedy_Golf.jpg",
  "./assets/Partnerships/TMU.jpg",
  "./assets/Partnerships/uoft.jpg",
  "./assets/Partnerships/HockeyPylon.png",
  "./assets/Partnerships/UNITYLogo.jpg",
  "./assets/Partnerships/munchwell.png",
];

const CarousselSlider = () => {
  return (
    <div className="relative overflow-hidden py-14 overflow-x-hidden">
      {/* <h1 className="[font-family:'DM_Sans',sans-serif] text-[32px] md:text-[40px] font-bold text-center leading-[40px] md:leading-[48px] text-[#261f22] max-w-[642px] mx-auto mb-10">
        Our Partners
      </h1> */}

      {/* Continuous marquee */}
      <div className="relative">
        {/* Edge blur overlays (stronger than built-in gradient) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 [mask-image:linear-gradient(to_right,black,transparent)] backdrop-blur-sm"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 [mask-image:linear-gradient(to_left,black,transparent)] backdrop-blur-sm"></div>
        <Marquee
          speed={50} // px/second (smooth + readable)
          gradient={true}
          gradientColor={[255,255,255]}
          gradientWidth={120}
          pauseOnHover={true}
          pauseOnClick={false}
          autoFill={true}
        >
          {images.map((src, i) => (
            <div key={i} className="mx-12 flex items-center justify-center h-24 select-none">
              <img
                src={src}
                alt={`Partner ${i + 1}`}
                loading="lazy"
                draggable={false}
                className="h-16 w-auto object-contain opacity-70  hover:opacity-100 hover:grayscale-0 transition-all duration-500 ease-out hover:scale-110"
              />
            </div>
          ))}
        </Marquee>
      </div>
    </div>
  );
};

export default CarousselSlider;
