"use client";
import { useState, useEffect, useRef } from "react";

export default function MyGallery({ profileImage, coverImages = [] }) {
  const [showModal, setShowModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const modalContentRef = useRef(null);

  // Detect if the file is a video (handles query params in Firebase URLs)
  const isVideo = (url) => {
    try {
      const cleanPath = new URL(url).pathname;
      return /\.(mp4|webm|ogg)$/i.test(cleanPath);
    } catch {
      return false;
    }
  };

  const hasProfileImage = Boolean(profileImage);
  const effectiveProfileImage = hasProfileImage ? profileImage : coverImages[0];
  const adjustedCoverImages = hasProfileImage ? coverImages : coverImages.slice(1);
  const visibleImages = adjustedCoverImages.slice(0, 4);
  const remaining = adjustedCoverImages.length - 4;
  const allImages = hasProfileImage ? [profileImage, ...coverImages] : coverImages;

  const openModal = (index) => {
    setModalImageIndex(index);
    setIsImageLoading(true);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const goLeft = () => {
    if (allImages.length <= 1) return;
    setModalImageIndex((prev) => {
      const next = prev === 0 ? allImages.length - 1 : prev - 1;
      setIsImageLoading(true);
      return next;
    });
  };

  const goRight = () => {
    if (allImages.length <= 1) return;
    setModalImageIndex((prev) => {
      const next = prev === allImages.length - 1 ? 0 : prev + 1;
      setIsImageLoading(true);
      return next;
    });
  };

  useEffect(() => {
    if (!showModal) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") goRight();
      else if (e.key === "ArrowLeft") goLeft();
      else if (e.key === "Escape") closeModal();
    };

    const handleClickOutside = (e) => {
      if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showModal, modalImageIndex]);

  useEffect(() => {
    if (showModal) {
      console.log("Currently displayed media:", allImages[modalImageIndex]);
    }
  }, [showModal, modalImageIndex]);

  useEffect(() => {
    const preloadRange = 5;
    for (let i = -preloadRange; i <= preloadRange; i++) {
      const idx = (modalImageIndex + i + allImages.length) % allImages.length;
      const img = new Image();
      img.src = allImages[idx];
    }
  }, [modalImageIndex]);

  if (!effectiveProfileImage && adjustedCoverImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-gray-500 text-lg">No images uploaded</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-4">My Gallery</h2>

      <div className="grid dm2:grid-cols-3 grid-cols-1 gap-4">
        {/* Profile image or video */}
        <div
          onClick={() => openModal(0)}
          className="sm:col-span-2 h-[400px] cursor-pointer group relative rounded-lg overflow-hidden"
        >
          {isVideo(effectiveProfileImage) ? (
            <video
              src={effectiveProfileImage}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <img
              src={effectiveProfileImage}
              alt="Profile"
              className="w-full h-full object-cover transition duration-300 group-hover:opacity-90"
            />
          )}
        </div>

        {/* Grid of up to 4 cover images/videos */}
        {visibleImages.length > 0 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-2 h-[400px]">
            {visibleImages.map((img, i) => (
              <div
                key={i}
                onClick={() => openModal(hasProfileImage ? i + 1 : i + 1)}
                className="relative rounded-lg overflow-hidden cursor-pointer group"
              >
                {isVideo(img) ? (
                  <video
                    src={img}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                ) : (
                  <img
                    src={img}
                    alt={`Cover ${i}`}
                    className="w-full h-full object-cover transition duration-300 group-hover:opacity-90"
                  />
                )}
                {i === 3 && remaining > 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 text-white text-lg font-semibold flex items-center justify-center">
                    +{remaining}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[10010] bg-black bg-opacity-80 flex items-center justify-center transition-opacity duration-300">
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-white text-3xl font-bold"
          >
            &times;
          </button>

          <div ref={modalContentRef} className="relative max-w-4xl w-full px-4">
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {isVideo(allImages[modalImageIndex]) ? (
              <video
                src={allImages[modalImageIndex]}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                onLoadedData={() => setIsImageLoading(false)}
                className={`w-full max-h-[80vh] object-contain rounded-lg transition-all duration-300 ${
                  isImageLoading ? "opacity-0" : "opacity-100"
                }`}
              />
            ) : (
              <img
                src={allImages[modalImageIndex]}
                alt="Gallery View"
                onLoad={() => setIsImageLoading(false)}
                className={`w-full max-h-[80vh] object-contain rounded-lg transition-all duration-300 ${
                  isImageLoading ? "opacity-0" : "opacity-100"
                }`}
              />
            )}

            {allImages.length > 1 && (
              <>
                {/* Left arrow */}
                <button
                  onClick={goLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 text-black rounded-full p-2 hover:bg-white transition z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Right arrow */}
                <button
                  onClick={goRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 text-black rounded-full p-2 hover:bg-white transition z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
