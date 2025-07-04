"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRouter } from "next/router";

mapboxgl.accessToken = process.env.mapbox_key;

export default function LocationMap({ locations = [], classes = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const cleanup = () => {
      markersRef.current.forEach((marker) => marker?.remove?.());
      markersRef.current = [];

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Map removal error:", e);
        }
        mapInstanceRef.current = null;
      }
    };

    cleanup();

    const validLocations = locations.filter((loc) => {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      return !isNaN(lat) && !isNaN(lng);
    });

    if (validLocations.length === 0) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [validLocations[0].lng, validLocations[0].lat],
      zoom: 12,
    });

    mapInstanceRef.current = map;

    map.on("load", () => {
      const bounds = new mapboxgl.LngLatBounds();

      validLocations.forEach((loc) => {
        const coords = [loc.lng, loc.lat];
        const markerEl = document.createElement("div");
        markerEl.className = "map-marker";
        markerEl.style.width = "20px";
        markerEl.style.height = "20px";
        markerEl.style.backgroundColor = "#3FB1CE";
        markerEl.style.borderRadius = "50%";
        markerEl.style.border = "2px solid white";
        markerEl.style.cursor = "pointer";

        const matchedClass = classes.find(
          (cls) => String(cls.id) === String(loc.id)
        );

        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat(coords)
          .addTo(map);

        markerEl.addEventListener("click", () => {
          setSelectedClass(matchedClass || null);
        });

        markersRef.current.push(marker);
        bounds.extend(coords);
      });

      if (validLocations.length > 1) {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12,
          duration: 1000,
        });
      } else {
        map.setZoom(14);
      }
    });

    return cleanup;
  }, [locations, classes]);

  return (
    <div className="w-full rounded-lg shadow-md overflow-hidden relative">
      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-[400px]" />

      {/* Selected Class Detail with Animation */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          selectedClass
            ? "max-h-[300px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 translate-y-4"
        }`}
      >
        {selectedClass && (
          <div className="w-full bg-white border-t shadow-inner p-4 flex gap-4 items-center justify-between">
            <div className="flex gap-4 items-center overflow-x-auto max-w-full">
              <div className="w-24 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                {selectedClass.Images?.[0] ? (
                  <img
                    src={selectedClass.Images[0]}
                    alt={selectedClass.Name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Working fallback SVG (Option 2 - Teacher Icon)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-10 h-10 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 3h16v12H4z" />
                    <path d="M12 16v5" />
                    <path d="M9 21h6" />
                    <circle cx="9" cy="10" r="1.5" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg truncate">
                  {selectedClass.Name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {selectedClass.Description}
                </p>
                <p className="text-sm font-medium text-green-600 mt-1">
                  {selectedClass.Price || ""} {"CAD"}
                </p>
                <p className="text-xs text-gray-500">
                  Category: {selectedClass.Category || "N/A"}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/classes/id=${selectedClass.id}`)}
              className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800"
            >
              Book Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
