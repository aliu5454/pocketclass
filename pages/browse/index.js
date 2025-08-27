import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { categories } from "../../utils/categories";
import NewHeader from "../../components/NewHeader";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  doc as firestoreDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import Select from "react-select";
import InstructorSection from "../../home-components/InstructorSection";

// Only set access token if it exists to prevent MapBox errors
if (process.env.mapbox_key) {
  mapboxgl.accessToken = process.env.mapbox_key;
}

export default function Results() {
  const router = useRouter();
  const { subCategory, category } = router.query;
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState(
    subCategory || ""
  );
  const [sortBy, setSortBy] = useState("");
  const categoryOptions = [
    { value: "All", label: "All" },
    ...categories.map((category) => ({
      value: category.name,
      label: category.name,
    })),
  ];

  const [selectedCategory, setSelectedCategory] = useState(category || "");
  const [subCategoryOptions, setSubCategoryOptions] = useState([]);
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [activeView, setActiveView] = useState("classes");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setSelectedSubCategory(subCategory || "");
    setSelectedCategory(category || "");
  }, [subCategory, category]);

  // MapBox Initialization
  useEffect(() => {
    if (map.current || !process.env.mapbox_key) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [location?.longitude || -79.347015, location?.latitude || 43.65107],
        zoom: 9,
      });
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
      });

      setTimeout(() => {
        map.current?.resize();
      }, 4000);

      map.current.addControl(geocoder);
    } catch (error) {
      console.error("MapBox initialization failed:", error);
    }
  }, []);

  // Add Markers for Classes
  useEffect(() => {
    if (!map.current || !filteredClasses.length) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.marker.remove());
    markers.current = [];

    // Determine map bounds
    const bounds = new mapboxgl.LngLatBounds();

    filteredClasses.forEach((classItem) => {
      if (classItem.longitude && classItem.latitude && !(classItem.Address === "Online") && !(classItem.Mode === "Online")) {
        const marker = new mapboxgl.Marker()
          .setLngLat([classItem.longitude, classItem.latitude])
          .addTo(map.current);

        // Create a popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="text-lg font-bold">${classItem.Name}</h3>
            <p class="text-sm text-gray-600">${
              classItem.Address || "No Address"
            }</p>
            <p class="text-sm text-blue-600">${classItem.Category} | ${
          classItem.SubCategory || classItem.Type || "N/A"
        }</p>
            <p class="text-sm text-yellow-500">⭐ ${
              classItem.averageRating
                ? classItem.averageRating.toFixed(1)
                : "N/A"
            } (${classItem.reviewCount || 0}+ reviews)</p>
            <p class="text-sm text-logo-red">Price: $${classItem.Price}</p>
          </div>
        `);

        marker.setPopup(popup);

        marker.getElement().addEventListener("click", () => {
          setSelectedClassDetails(classItem);
        });

        markers.current.push({ marker, classId: classItem.id });
        bounds.extend([classItem.longitude, classItem.latitude]);
      }
    });

    
    if (location) {
      bounds.extend([location.longitude, location.latitude]);
      const size = 150;

      const pulsingDot = {
        width: size,
        height: size,
        data: new Uint8Array(size * size * 4),

        onAdd: function () {
          const canvas = document.createElement("canvas");
          canvas.width = this.width;
          canvas.height = this.height;
          this.context = canvas.getContext("2d");
        },

        render: function () {
          const duration = 1000;
          const t = (performance.now() % duration) / duration;

          const radius = (size / 2) * 0.3;
          const outerRadius = (size / 2) * 0.7 * t + radius;
          const context = this.context;

          context.clearRect(0, 0, this.width, this.height);
          context.beginPath();
          context.arc(
            this.width / 2,
            this.height / 2,
            outerRadius,
            0,
            Math.PI * 2
          );
          context.fillStyle = `rgba(255, 200, 200, ${1 - t})`;
          context.fill();

          context.beginPath();
          context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2);
          context.fillStyle = "rgba(255, 100, 100, 1)";
          context.strokeStyle = "white";
          context.lineWidth = 2 + 4 * (1 - t);
          context.fill();
          context.stroke();

          this.data = context.getImageData(0, 0, this.width, this.height).data;

          map.current.triggerRepaint();

          return true;
        },
      };

      map.current.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });

      if (map.current.getSource("dot-point")) {
        map.current.removeLayer("layer-with-pulsing-dot");
        map.current.removeSource("dot-point");
      }

      map.current.addSource("dot-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  location?.longitude || 0,
                  location?.latitude || 0,
                ],
              },
            },
          ],
        },
      });

      // Add the layer using the new source
      map.current.addLayer({
        id: "layer-with-pulsing-dot",
        type: "symbol",
        source: "dot-point",
        layout: {
          "icon-image": "pulsing-dot",
        },
      });
    }
    
    if (location){
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
      });
    }
  }, [filteredClasses]);
  const [location, setLocation] = useState(null);
  useEffect(() => {
    (async () => {
      const { geolocation } = navigator;
      if (!geolocation) {
        return;
      }
      const position = await new Promise((resolve, reject) => {
        geolocation.getCurrentPosition(resolve, reject);
      });
      if (!position.coords) {
        return;
      }
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    })();
  }, []);
  const distanceCalculator = (lat1, lon1, lat2, lon2) => {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const R = 6371;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
  };

  useEffect(() => {
    const options = categories
      .find((cat) => cat.name === selectedCategory)
      ?.subCategories.map((sub) => ({
        value: sub.name,
        label: sub.name,
      }));
    setSubCategoryOptions(options || []);
  }, [selectedCategory]);

  const distanceOptions = [
    { value: "2", label: "2 km" },
    { value: "5", label: "5 km" },
    { value: "15", label: "15 km" },
    { value: "30", label: "30 km" },
    { value: "", label: "All" },
  ];
  const [selectedDistance, setSelectedDistance] = useState(
    distanceOptions[3].value
  );

  const sortOptions = [
    { value: "rating", label: "Rating" },
    { value: "price", label: "Price" },
    { value: "distance", label: "Distance" },
  ];

  useEffect(() => {
    const fetchClassesAndInstructors = async () => {
      setLoading(true);
      try {
        const classesQuery = query(collection(db, "classes"));
        const classesSnapshot = await getDocs(classesQuery);
        const classesWithInstructors = await Promise.all(
          classesSnapshot.docs.map(async (doc) => {
            const classData = { id: doc.id, ...doc.data() };

            if (classData.classCreator) {
              const instructorRef = firestoreDoc(
                db,
                "Users",
                classData.classCreator
              );
              const instructorDoc = await getDoc(instructorRef);
              if (instructorDoc.exists()) {
                classData.instructorName = instructorDoc.data().firstName
                  ? instructorDoc.data().firstName +
                    " " +
                    instructorDoc.data().lastName
                  : "N/A";
                classData.instructorImage = instructorDoc.data().profileImage;
              }
            }

            classData.name = classData.Name || "N/A";
            classData.profileImage = classData.Images?.[0] || "N/A";
            classData.category = classData.Category || "N/A";
            classData.instructorName = classData.instructorName || "N/A";

            const classReviews = reviews.filter(
              (rev) => rev.classID === classData.id
            );
            console.log(`Class ${classData.Name}: ${classReviews.length} reviews`);
            const avgRating =
              classReviews.length > 0
                ? classReviews.reduce(
                    (acc, rev) =>
                      acc +
                      (rev.qualityRating +
                        rev.recommendRating +
                        rev.safetyRating) /
                        3,
                    0
                  ) / classReviews.length
                : 0;

            classData.averageRating = avgRating;
            classData.reviewCount = classReviews.length;
            return classData;
          })
        );

        setClasses(classesWithInstructors);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch classes after reviews are loaded
    fetchClassesAndInstructors();
  }, [reviews]);

  useEffect(() => {
    // Use the correct collection name consistent across the app
    const unsubscribe = onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = [...classes];

    if (selectedCategory && selectedCategory !== "All") {
      filtered = filtered.filter((data) => data.Category === selectedCategory);
    }
    if (selectedSubCategory) {
      filtered = filtered.filter(
        (data) =>
          data.SubCategory === selectedSubCategory ||
          data.Type === selectedSubCategory
      );
    }
    if (selectedDistance) {
      if (location) {
        filtered = filtered.filter((data) => {
          const distance = distanceCalculator(
            location.latitude,
            location.longitude,
            data.latitude,
            data.longitude
          );
          return (
            distance <= Number(selectedDistance) ||
            data.Mode === "Online" ||
            data.Address === "Online"
          );
        });
      }
    }
    if (sortBy === "rating") {
      filtered.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sortBy === "price") {
      filtered.sort((a, b) => a.Price - b.Price);
    } else if (sortBy === "distance" && location) {
      if (location) {
        filtered.sort((a, b) => {
          const distanceA = distanceCalculator(
            location.latitude,
            location.longitude,
            a.latitude,
            a.longitude
          );
          const distanceB = distanceCalculator(
            location.latitude,
            location.longitude,
            b.latitude,
            b.longitude
          );
          return distanceA - distanceB;
        });
      }
    }
    setFilteredClasses(filtered);
  }, [
    selectedCategory,
    selectedSubCategory,
    sortBy,
    classes,
    selectedDistance,
    location,
  ]);

  return (
    <div className="md:overflow-hidden h-screen">
      <div className="flex flex-col md:flex-row md:overflow-hidden h-full">
        {/* Mobile view toggle for small screens */}
        <div className="md:hidden w-full flex z-50 fixed bottom-0 items-center justify-center my-2">
          <div className="inline-flex bg-gray-200 rounded-full p-1">
            <button
              className={`px-4 py-2 rounded-full transition-all duration-300 
                ${
                  activeView === "classes"
                    ? "bg-logo-red text-white"
                    : "text-gray-700"
                }`}
              onClick={() => setActiveView("classes")}
            >
              Classes
            </button>
            <button
              className={`px-4 py-2 rounded-full transition-all duration-300 
                ${
                  activeView === "map"
                    ? "bg-logo-red text-white"
                    : "text-gray-700"
                }`}
              onClick={() => {
                setActiveView("map");
                setTimeout(() => {
                  map.current.resize();
                }, 100);
              }}
            >
              Map
            </button>
          </div>
        </div>

        {/* Classes section - visible on mobile when "classes" view is active, always visible on larger screens */}
        <div
          className={`
          w-full md:w-1/2 md:overflow-hidden h-full 
          ${activeView === "classes" || "hidden md:block"}
        `}
        >
          <div className="flex flex-wrap gap-4 mb-2 mt-2 px-4">
            <Select
              options={categoryOptions}
              placeholder="Category"
              className="w-auto md:w-40 rounded-lg"
              value={
                categoryOptions.find(
                  (option) => option.value === selectedCategory
                ) || null
              }
              onChange={(option) => {
                setSelectedCategory(option ? option.value : "");
                setSelectedSubCategory("");
              }}
            />
            <Select
              options={subCategoryOptions}
              placeholder="Sub-category"
              className="w-auto md:w-40 rounded-lg"
              value={
                subCategoryOptions.find(
                  (option) => option.value === selectedSubCategory
                ) || null
              }
              onChange={(option) =>
                setSelectedSubCategory(option ? option.value : "")
              }
            />
            <Select
              options={distanceOptions}
              placeholder="Distance"
              className="hidden md:block md:w-40 rounded-lg"
              value={
                distanceOptions.find(
                  (option) => option.value === selectedDistance
                ) || null
              }
              onChange={(option) =>
                setSelectedDistance(option ? option.value : "")
              }
            />
            <Select
              options={sortOptions}
              placeholder="Sort By"
              className="hidden md:block md:w-40 rounded-lg"
              value={
                sortOptions.find((option) => option.value === sortBy) || null
              }
              onChange={(option) => setSortBy(option ? option.value : "")}
            />
            <button
              className="block md:hidden border-gray-300 border px-4 py-1 rounded-md transition-all duration-300 text-gray-700"
              onClick={() => setModalVisible(true)}
            >
              Filters
            </button>
          </div>

          {modalVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen bg-black bg-opacity-50">
              <div className="bg-white p-8 px-10 rounded-lg shadow-xl w-[400px]">
                <div className="flex gap-8">
                  {/* Distance Section */}
                  <div className="w-1/2 flex flex-col gap-3">
                    <h3 className="text-lg font-semibold">Distance</h3>
                    {distanceOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDistance === option.value}
                          onChange={() => setSelectedDistance(option.value)}
                          className="hidden peer"
                        />
                        <div className="w-5 h-5 border-2 border-gray-400 rounded-md flex items-center justify-center peer-checked:border-logo-red peer-checked:bg-logo-red">
                          {selectedDistance === option.value && (
                            <svg
                              className="w-4 h-4 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M5 12l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Sort By Section */}
                  <div className="w-1/2 flex flex-col gap-3">
                    <h3 className="text-lg font-semibold">Sort By</h3>
                    {sortOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={sortBy === option.value}
                          onChange={() => setSortBy(option.value)}
                          className="hidden peer"
                        />
                        <div className="w-5 h-5 border-2 border-gray-400 rounded-md flex items-center justify-center peer-checked:border-logo-red peer-checked:bg-logo-red">
                          {sortBy === option.value && (
                            <svg
                              className="w-4 h-4 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <path
                                d="M5 12l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <div className="flex justify-center mt-6">
                  <button
                    className="px-5 py-2 rounded-full text-logo-red border border-logo-red hover:bg-logo-red hover:text-white transition-all duration-300"
                    onClick={() => setModalVisible(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 md:overflow-auto h-full max-h-[80%]">
            {loading ? (
              <p className="text-center text-gray-500">Loading...</p>
            ) : (
              <div className="flex box-border flex-row flex-wrap gap-4">
                {filteredClasses.map((classItem) => (
                  <div
                    key={classItem.id}
                    className="w-full flex-1 flex-grow box-border border z-0 min-w-[305px] md:w-[48%] border-gray-300 transition-all duration-300 hover:border-logo-red rounded-2xl"
                    onMouseEnter={() => {
                      if (
                        !(
                          classItem.Mode === "Online" ||
                          classItem.Address === "Online"
                        ) &&
                        classItem.longitude &&
                        classItem.latitude
                      ) {
                        markers.current
                          .find((marker) => {
                            return marker.classId === classItem.id;
                          })
                          ?.marker.getElement()
                          .querySelectorAll('svg [fill="' + "#3FB1CE" + '"]')[0]
                          ?.setAttribute("fill", "red");
                      }
                    }}
                    onMouseLeave={() => {
                      if (
                        !(
                          classItem.Mode === "Online" ||
                          classItem.Address === "Online"
                        ) &&
                        classItem.longitude &&
                        classItem.latitude
                      ) {
                        markers.current
                          .find((marker) => {
                            return marker.classId === classItem.id;
                          })
                          ?.marker.getElement()
                          .querySelectorAll('svg [fill="' + "red" + '"]')[0]
                          ?.setAttribute("fill", "#3FB1CE");
                      }
                    }}
                    onClick={() => {
                      router.push(`/classes/id=${classItem.id}`);
                      setSelectedClassDetails(classItem);
                    }}
                  >
                    <InstructorSection
                      key={classItem.id}
                      classId={classItem.id}
                      instructor={classItem}
                      reviews={reviews}
                      loading={false}
                    />
                  </div>
                ))}
                {filteredClasses.length === 0 && (
                  <p className="text-center text-gray-500">
                    More classes coming soon!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map section - visible on mobile when "map" view is active, always visible on larger screens */}
        <div
          className={`
          w-full md:w-1/2 p-4 relative h-full 
          ${activeView === "map" || "hidden md:block"}
        `}
        >
          <div
            ref={mapContainer}
            className="h-[90%] min-h-[600px] w-full rounded-xl bg-gray-200"
          />
          {selectedClassDetails && (
            <div
              key={selectedClassDetails.id}
              onClick={() => {
                router.push(`/classes/id=${selectedClassDetails.id}`);
              }}
              className={`flex cursor-pointer items-center z-50 absolute bottom-24 box-border left-4 right-4 bg-white rounded-xl shadow-md overflow-hidden transform transition-all duration-300 border-2 border-gray-100 hover:border-logo-red`}
            >
              <img
                src={selectedClassDetails.Images[0] || "/default-image.jpg"}
                alt={selectedClassDetails.Name}
                className="w-32 h-32 object-cover rounded-xl"
              />
              <div className="p-4 flex flex-grow flex-col justify-between">
                <h3 className="text-lg font-semibold flex flex-row justify-between items-center text-gray-900">
                  <p>{selectedClassDetails.Name}</p>
                  <p className="text-logo-red">${selectedClassDetails.Price}</p>
                </h3>
                <p className="text-sm text-blue-600 font-medium">
                  {selectedClassDetails.Category} |{" "}
                  {selectedClassDetails.SubCategory ||
                    selectedClassDetails.Type ||
                    "N/A"}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedClassDetails.Address || "No Address Available"}
                </p>
                <p className="text-yellow-500 text-sm">
                  ⭐ {selectedClassDetails.averageRating.toFixed(1)} (
                  {selectedClassDetails.reviewCount}+ reviews)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
