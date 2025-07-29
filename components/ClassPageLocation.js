import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.mapbox_key;

export default function ClassLocationMap({ longitude, latitude, address }) {
  if (!longitude || !latitude) return null;
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  useEffect(() => {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [longitude, latitude],
      zoom: 15,
    });

    marker.current = new mapboxgl.Marker()
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    return () => map.current.remove();
  }, [longitude, latitude]);

  const handleAddressClick = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      "_blank"
    );
  };

  return (
    <div className="w-full mb-10">
      <div ref={mapContainer} className="w-full h-[400px] rounded-xl mb-4" />
      <button className="text-left text-gray-600 transition-colors duration-200">
        📍 {address}
        <button
          onClick={handleAddressClick}
          className="ml-2 text-logo-red font-medium"
        >
          Get Directions
        </button>
      </button>
    </div>
  );
}
