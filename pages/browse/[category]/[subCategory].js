import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { categories } from "../../../utils/categories";
import NewHeader from "../../../components/NewHeader";
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
  doc,
} from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../../../firebaseConfig";
import Select from "react-select";
import InstructorSection from "../../../home-components/InstructorSection";
import { categories as categoryList } from "../../../utils/categories";
import Head from "next/head";
import { DatePicker } from "antd";
const { RangePicker } = DatePicker;
import moment from "moment";

mapboxgl.accessToken = process.env.mapbox_key;

export const getStaticPaths = async () => {
  let paths = [];

  categoryList.forEach((category) => {
    category.subCategories.forEach((subCategory) => {
      paths.push({
        params: { category: category.name, subCategory: subCategory.name },
      });
    });
  });

  return {
    paths,
    fallback: "blocking", // Or "false" for 404 on unknown paths
  };
};

export const getStaticProps = async ({ params }) => {
  const { category, subCategory } = params;

  return {
    props: {
      category,
      subCategory,
    },
    revalidate: 60, // ISR: Regenerates page every 60 seconds
  };
};

const distanceOptions = [
  { value: "2", label: "2 km" },
  { value: "5", label: "5 km" },
  { value: "15", label: "15 km" },
  { value: "30", label: "30 km" },
  { value: "", label: "All" },
];

export default function Results({ category, subCategory }) {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [instructorSchedules, setInstructorSchedules] = useState({});
  const [selectedDistance, setSelectedDistance] = useState('');
  const [location, setLocation] = useState(null);

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

  // useEffect(() => {
  //   setSelectedSubCategory(subCategory || "");
  //   setSelectedCategory(category || "");
  // }, [subCategory, category]);

  // useEffect(() => {
  //   setSelectedSubCategory(subCategory || "");
  //   setSelectedCategory(category || "");

  //   if (router.query.distance) {
  //     setSelectedDistance(router.query.distance);
  //   }

  //   if (router.query.sortBy) {
  //     setSortBy(router.query.sortBy);
  //   }

  //   // Get date range from URL query parameters if present
  //   if (router.query.startDate && router.query.endDate) {
  //     // You would need to add state variables for these
  //     // setStartDate(new Date(router.query.startDate));
  //     // setEndDate(new Date(router.query.endDate));
  //   }
  // }, [subCategory, category, router.query]);

  useEffect(() => {
    setSelectedSubCategory(subCategory || "");
    setSelectedCategory(category || "");

    if (router.query.distance) {
      setSelectedDistance(router.query.distance);
    }

    if (router.query.sortBy) {
      setSortBy(router.query.sortBy);
    }

    // Parse date range from URL
    if (router.query.startDate && router.query.endDate) {
      setStartDate(new Date(router.query.startDate));
      setEndDate(new Date(router.query.endDate));
    }
  }, [subCategory, category, router.query]);

  // will be live later

  useEffect(() => {
    const fetchInstructorSchedules = async () => {
      if (!classes || !startDate || !endDate) return;

      // Get unique instructor IDs
      const instructorIds = [
        ...new Set(classes.map((cls) => cls.classCreator)),
      ];

      // Fetch schedule for each instructor
      const schedules = {};
      await Promise.all(
        instructorIds.map(async (instructorId) => {
          const scheduleRef = doc(db, "Schedule", instructorId);
          const scheduleSnap = await getDoc(scheduleRef);

          console.log(
            "scheduleSnap: ",
            JSON.stringify(scheduleSnap.data(), null, 2)
          );

          if (scheduleSnap.exists()) {
            schedules[instructorId] = scheduleSnap.data();
          }
        })
      );

      // setInstructorSchedules(schedules);
    };

    fetchInstructorSchedules();
  }, [classes, startDate, endDate]);

  const isInstructorAvailableOnDate = (schedule, date) => {
    if (!schedule) return false;

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = daysOfWeek[dayOfWeek];

    // Check if instructor has general availability for this day
    const dayAvailability = schedule.generalAvailability?.find(
      (day) => day.day === dayName
    );
    if (
      !dayAvailability ||
      !dayAvailability.slots ||
      dayAvailability.slots.length === 0
    ) {
      return false;
    }

    // Check for adjusted availability (specific date overrides)
    const dateString = date.toISOString().split("T")[0]; // Format: YYYY-MM-DD
    const adjustedDay = schedule.adjustedAvailability?.find(
      (adj) => adj.date === dateString
    );

    // If there's an adjusted availability with no slots, instructor is unavailable
    if (adjustedDay && (!adjustedDay.slots || adjustedDay.slots.length === 0)) {
      return false;
    }

    // If there's an adjusted availability with slots, instructor is available
    if (adjustedDay && adjustedDay.slots && adjustedDay.slots.length > 0) {
      return true;
    }

    // Otherwise, fall back to general availability
    return true;
  };
  const isInstructorAvailableInRange = (schedule, start, end) => {
    if (!schedule) return false;

    // Create array of dates between start and end
    const dates = [];
    const currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check if instructor is available on at least one day in the range
    return dates.some((date) => isInstructorAvailableOnDate(schedule, date));
  };

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

    // Filter by date range availability
    if (startDate && endDate && Object.keys(instructorSchedules).length > 0) {
      filtered = filtered.filter((classItem) => {
        const instructorId = classItem.classCreator;
        const instructorSchedule = instructorSchedules[instructorId];

        return isInstructorAvailableInRange(
          instructorSchedule,
          startDate,
          endDate
        );
      });
    }

    // Apply sorting
    if (sortBy === "rating") {
      filtered.sort((a, b) => b.averageRating - a.averageRating);
    } else if (sortBy === "price") {
      filtered.sort((a, b) => a.Price - b.Price);
    } else if (sortBy === "distance" && location) {
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

    setFilteredClasses(filtered);
  }, [
    selectedCategory,
    selectedSubCategory,
    sortBy,
    classes,
    selectedDistance,
    location,
    startDate,
    endDate,
    instructorSchedules,
  ]);

  // MapBox Initialization
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [
        location?.longitude || -79.347015,
        location?.latitude || 43.65107,
      ],
      zoom: 9,
    });
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
    });

    setTimeout(() => {
      map.current.resize();
    }, 4000);

    map.current.addControl(geocoder);
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
      if (
        classItem.longitude &&
        classItem.latitude &&
        !(classItem.Address === "Online") &&
        !(classItem.Mode === "Online")
      ) {
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

    if (location) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 12,
      });
    }
  }, [filteredClasses]);
  // const [location, setLocation] = useState(null);
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

  // const distanceOptions = [
  //   { value: "2", label: "2 km" },
  //   { value: "5", label: "5 km" },
  //   { value: "15", label: "15 km" },
  //   { value: "30", label: "30 km" },
  //   { value: "", label: "All" },
  // ];
  // const [selectedDistance, setSelectedDistance] = useState(
  //   distanceOptions[2].value
  // );

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
              }
            }

            classData.name = classData.Name || "N/A";
            classData.profileImage = classData.Images?.[0] || "N/A";
            classData.category = classData.Category || "N/A";
            classData.instructorName = classData.instructorName || "N/A";

            const classReviews = reviews.filter(
              (rev) => rev.classID === classData.id
            );
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

    fetchClassesAndInstructors();
  }, [reviews]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Reviews"), (snapshot) => {
      setReviews(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
    return () => unsubscribe();
  }, []);

  // useEffect(() => {
  //   let filtered = [...classes];

  //   if (selectedCategory && selectedCategory !== "All") {
  //     filtered = filtered.filter((data) => data.Category === selectedCategory);
  //   }
  //   if (selectedSubCategory) {
  //     filtered = filtered.filter(
  //       (data) =>
  //         data.SubCategory === selectedSubCategory ||
  //         data.Type === selectedSubCategory
  //     );
  //   }
  //   if (selectedDistance) {
  //     if (location) {
  //       filtered = filtered.filter((data) => {
  //         const distance = distanceCalculator(
  //           location.latitude,
  //           location.longitude,
  //           data.latitude,
  //           data.longitude
  //         );
  //         return (
  //           distance <= Number(selectedDistance) ||
  //           data.Mode === "Online" ||
  //           data.Address === "Online"
  //         );
  //       });
  //     }
  //   }
  //   if (sortBy === "rating") {
  //     filtered.sort((a, b) => b.averageRating - a.averageRating);
  //   } else if (sortBy === "price") {
  //     filtered.sort((a, b) => a.Price - b.Price);
  //   } else if (sortBy === "distance" && location) {
  //     if (location) {
  //       filtered.sort((a, b) => {
  //         const distanceA = distanceCalculator(
  //           location.latitude,
  //           location.longitude,
  //           a.latitude,
  //           a.longitude
  //         );
  //         const distanceB = distanceCalculator(
  //           location.latitude,
  //           location.longitude,
  //           b.latitude,
  //           b.longitude
  //         );
  //         return distanceA - distanceB;
  //       });
  //     }
  //   }
  //   setFilteredClasses(filtered);
  // }, [
  //   selectedCategory,
  //   selectedSubCategory,
  //   sortBy,
  //   classes,
  //   selectedDistance,
  //   location,
  // ]);

  useEffect(() => {
    let filtered = [...classes];

    if (selectedCategory === 'Smart') {
      const subCategoriesList = selectedSubCategory.split(',');
      filtered = filtered.filter((data) => subCategoriesList.includes(data.SubCategory));
    } else {
      if (selectedCategory && selectedCategory !== "All") {
        filtered = filtered.filter((data) => data.Category === selectedCategory);
      }

      if (selectedSubCategory && selectedSubCategory !== 'All') {
        filtered = filtered.filter(
            (data) =>
                data.SubCategory === selectedSubCategory ||
                data.Type === selectedSubCategory
        );
      }
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

    // Add date range filtering
    if (startDate && endDate) {
      filtered = filtered.filter((data) => {
        // This is a placeholder - you would need to implement logic to check
        // if the class is available between startDate and endDate
        // This might involve checking the instructor's schedule
        return true; // Replace with actual availability check
      });
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
    startDate,
    endDate,
  ]);

  return (
    <>
      <Head>
        <title>
          {selectedSubCategory} Classes in Toronto | Affordable Lessons for All
          Levels
        </title>
        <meta
          name="description"
          content={`Find the best ${selectedSubCategory} classes in Toronto. Learn from top instructors and improve your game today!`}
        />
        <link
          rel="canonical"
          href={`/browse/${selectedCategory}/${selectedSubCategory}`}
        />
        <link rel="icon" href="/pc_favicon.ico" />
        <meta
          property="og:title"
          content={`${selectedSubCategory} Classes in Toronto | Affordable Lessons for All Levels`}
        />
        <meta
          property="og:description"
          content={`Find the best ${selectedSubCategory} classes in Toronto. Learn from top instructors and improve your game today!`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={`/browse/${selectedCategory}/${selectedSubCategory}`}
        />
        <meta
          name="keywords"
          content={`${selectedCategory}, ${selectedSubCategory}, online classes, best ${selectedCategory} courses, top ${selectedSubCategory} tutorials, best ${selectedCategory} classes in Toronto, in-person, online, toronto`}
        />
      </Head>
      <div className="md:overflow-hidden h-screen">
        <NewHeader />
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
              {/* <div className="hidden md:block md:w-auto rounded-lg">
                <RangePicker
                  defaultValue={[
                    moment("2025-05-27").clone(),
                    moment("2025-06-29").clone(),
                  ]}
                  format="YYYY-MM-DD"
                  onChange={(dates) => {
                    if (dates) {
                      setStartDate(dates[0].toDate());
                      setEndDate(dates[1].toDate());
                    } else {
                      setStartDate(null);
                      setEndDate(null);
                    }
                  }}
                  disabledDate={(current) =>
                    current && current < moment().startOf("day")
                  }
                  allowClear={true}
                />{" "}
              </div> */}
              <div className="hidden md:flex md:space-x-2 md:w-auto rounded-lg">
                <DatePicker
                  value={startDate ? moment(startDate) : null}
                  onChange={(date) => setStartDate(date ? date.toDate() : null)}
                  format="YYYY-MM-DD"
                  placeholder="Start Date"
                  disabledDate={(current) =>
                    current && current < moment().startOf("day")
                  }
                  allowClear={true}
                />
                <DatePicker
                  value={endDate ? moment(endDate) : null}
                  onChange={(date) => setEndDate(date ? date.toDate() : null)}
                  format="YYYY-MM-DD"
                  placeholder="End Date"
                  disabledDate={(current) =>
                    (current && current < moment().startOf("day")) ||
                    (startDate && current && current < moment(startDate))
                  }
                  allowClear={true}
                />
              </div>

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
                <div className="flex flex-row max-[1350px]:flex-col flex-wrap gap-4">
                  {filteredClasses.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="w-full min-[1350px]:w-[48%] border border-gray-300 transition-all duration-300 hover:border-logo-red rounded-2xl"
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
                            .querySelectorAll(
                              'svg [fill="' + "#3FB1CE" + '"]'
                            )[0]
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
                    <p className="text-logo-red">
                      ${selectedClassDetails.Price}
                    </p>
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
    </>
  );
}
