import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { SearchIcon } from "@heroicons/react/solid";
import { categories as categoryData } from "../utils/categories";
import { smartDefaults } from "../utils/smartDefaults";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-day-picker/dist/style.css";
import { useActiveIndicator } from "../hooks/useActiveIndicator";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";

const DayPicker = dynamic(
  () => import("react-day-picker").then((mod) => mod.DayPicker),
  {
    ssr: false,
    loading: () => <p>Loading date picker...</p>,
  }
);

const initialSearchOptions = [
  ...smartDefaults.map((d) => ({
    label: d.name,
    type: "smart",
    icon: d.iconPath,
    payload: d,
  })),
  ...categoryData.flatMap((cat) => [
    {
      label: cat.name,
      type: "category",
      icon: cat.imagePath,
      payload: cat,
    },
    ...cat.subCategories.map((subCat) => ({
      label: subCat.name,
      type: "subCategory",
      icon: subCat.imagePath,
      payload: subCat,
    })),
  ]),
];

const ClearSearchIcon = React.memo(({ classes, onClick }) => (
  <div className={`clear-search-icon ${classes}`} onClick={onClick}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      aria-hidden="true"
      role="presentation"
      focusable="false"
      style={{
        display: "block",
        fill: "none",
        height: "12px",
        width: "12px",
        stroke: "currentcolor",
        strokeWidth: 4,
        overflow: "visible",
      }}
    >
      <path d="m6 6 20 20M26 6 6 26"></path>
    </svg>
  </div>
));

const TeacherSearch = ({ expandMenu, user }) => {
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [dateRange, setDateRange] = useState([undefined, undefined]);
  const [selectedRange, setSelectedRange] = useState();
  const [isShrunk, setIsShrunk] = useState(false);
  const [isMenuSmall, setIsMenuSmall] = useState(true);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const { activeStyle, updateIndicator, resetActiveBG } = useActiveIndicator();
  console.log("")

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.15, ease: "easeInOut" },
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: 0,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };

    const handleScroll = () => {
      setActiveDropdown(null);
    };

    const handleResize = () => {
      setActiveDropdown(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const isHomePage =
      router.pathname === "/" && Object.keys(router.query).length === 0;
    setIsMenuSmall(!isHomePage);
  }, [router.pathname, router.query]);

  const filteredSearchOptions = useMemo(() => {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return initialSearchOptions;

  const startsWith = [];
  const includes = [];
  const fromClasses = [];

  for (const item of initialSearchOptions) {
    const label = item.label.toLowerCase();

    if (label.startsWith(term)) {
      startsWith.push(item);
    } else if (label.includes(term)) {
      includes.push(item);
    } else if (
      filteredClasses.some(
        (cls) =>
          cls.Category?.toLowerCase() === label ||
          cls.SubCategory?.toLowerCase() === label
      )
    ) {
      fromClasses.push(item);
    }
  }

  return [...startsWith, ...includes, ...fromClasses];
}, [searchTerm, filteredClasses]);


  useEffect(() => {
    if (Object.keys(router.query).length && initialSearchOptions.length) {
      const { category, subCategory, startDate, endDate } = router.query;

      let term = "";
      if (smartDefaults.some((item) => item.name === category)) {
        term = category;
      } else if (subCategory && subCategory !== "All") {
        term = subCategory;
      } else if (category) {
        term = category;
      }

      setSearchTerm(term);
      setSelectedItem(
        initialSearchOptions.find((item) => item.label === category)
      );
      setDateRange([startDate, endDate]);
      setSelectedRange({ from: startDate, to: endDate });
    }
  }, [router.query]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesQuery = query(collection(db, "classes"));
        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClasses(classesData);
        setFilteredClasses(classesData);
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  const fuzzySearch = (searchTerm, text, threshold = 0.3) => {
    if (!searchTerm || !text) return { score: 0, match: false };

    const term = searchTerm.toLowerCase().trim();
    const target = text.toLowerCase();

    if (target.includes(term)) return { score: 1, match: true };

    let score = 0;
    let termIndex = 0;
    let consecutiveMatches = 0;
    let maxConsecutive = 0;

    for (let i = 0; i < target.length && termIndex < term.length; i++) {
      if (target[i] === term[termIndex]) {
        score += 1;
        termIndex++;
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      } else {
        consecutiveMatches = 0;
      }
    }

    let normalizedScore = termIndex / term.length;
    if (maxConsecutive > 1)
      normalizedScore += (maxConsecutive / term.length) * 0.2;
    if (target.startsWith(term.substring(0, Math.min(3, term.length))))
      normalizedScore += 0.2;
    if (target.length > term.length * 3) normalizedScore *= 0.8;

    return {
      score: Math.min(normalizedScore, 1),
      match: normalizedScore >= threshold,
    };
  };

  useEffect(() => {
    if (searchTerm && searchTerm.trim().length > 0) {
      const lowerCaseTerm = searchTerm.toLowerCase().trim();
      const scoredClasses = classes.map((cls) => {
        const scores = [
          fuzzySearch(lowerCaseTerm, cls.Name || "", 0.2),
          fuzzySearch(lowerCaseTerm, cls.Description || "", 0.15),
          fuzzySearch(lowerCaseTerm, cls.Category || "", 0.25),
          fuzzySearch(lowerCaseTerm, cls.SubCategory || "", 0.25),
        ];

        const totalScore =
          scores[0].score * 0.4 +
          scores[1].score * 0.2 +
          scores[2].score * 0.2 +
          scores[3].score * 0.2;
        const hasMatch = scores.some((s) => s.match);

        return { ...cls, searchScore: totalScore, hasMatch };
      });

      let filtered = scoredClasses
        .filter((cls) => cls.hasMatch || cls.searchScore > 0.1)
        .sort((a, b) => b.searchScore - a.searchScore);

      const highQualityResults = filtered.filter(
        (cls) => cls.searchScore > 0.5
      );
      const mediumQualityResults = filtered.filter(
        (cls) => cls.searchScore > 0.3 && cls.searchScore <= 0.5
      );
      const lowQualityResults = filtered.filter(
        (cls) => cls.searchScore <= 0.3
      );

      let finalResults = [];
      if (highQualityResults.length > 0) {
        finalResults = [
          ...highQualityResults,
          ...mediumQualityResults.slice(0, 5),
        ];
      } else if (mediumQualityResults.length > 0) {
        finalResults = mediumQualityResults.slice(0, 10);
      } else if (lowQualityResults.length > 0) {
        finalResults = lowQualityResults.slice(0, 5);
      }

      setFilteredClasses(finalResults);
    } else {
      setFilteredClasses(classes);
    }
  }, [searchTerm, classes]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const searchParams = {
      sortBy: "rating",
    };

    if (selectedItem.type === "smart") {
      searchParams.category = selectedItem.label;
      searchParams.subCategory = selectedItem.payload.subCategories;
    } else if (selectedItem.type === "category") {
      searchParams.category = selectedItem.label;
      searchParams.subCategory = "All";
    } else if (selectedItem.type === "subCategory") {
      const category = categoryData.find((cat) =>
        cat.subCategories.some((sc) => sc.name === selectedItem.label)
      );
      if (category) searchParams.category = category.name;
      searchParams.subCategory = selectedItem.label;
    }

    if (dateRange[0] && dateRange[1]) {
      searchParams.startDate = dateRange[0].toISOString
        ? dateRange[0].toISOString()
        : dateRange[0];
      searchParams.endDate = dateRange[1].toISOString
        ? dateRange[1].toISOString()
        : dateRange[1];
    }

    const filteredParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, v]) => v != null)
    );

    const path = searchParams.subCategory?.length
      ? `/browse/${searchParams.category}/${searchParams.subCategory}`
      : `/browse/${searchParams.category}`;

    router.push({
      pathname: path,
      query: filteredParams,
    });

    setActiveDropdown(null);
  };

  const formattedDateRange = () => {
    if (dateRange[0] && dateRange[1]) {
      return `${dayjs(dateRange[0]).format("MMM D")} - ${dayjs(
        dateRange[1]
      ).format("MMM D")}`;
    }
    return "Add dates";
  };

  const toggleDropdown = (type) => {
    setActiveDropdown((prev) => (prev === type ? null : type));
  };

  const handleOptionClick = (type, index) => {
    if (isShrunk) {
      expandMenu();
      setTimeout(() => {
        toggleDropdown(type);
        updateIndicator(index);
      }, 500);
    } else {
      toggleDropdown(type);
      updateIndicator(index);
    }
  };

  return (
    <div
      className={`menu-search-bar transition-all duration-500 mx-auto max-dm2:px-3 ${
        isShrunk
          ? "max-w-[230px] h-[50px]"
          : `${
              isMenuSmall
                ? "max-w-[400px] h-[54px]"
                : "max-dm2:h-[54px] max-w-[650px]"
            }`
      }`}
      ref={dropdownRef}
    >
      <div className="transition duration-500 h-full">
        <div className="relative h-full">
          <div className="absolute top-0 left-0 w-full h-full">
            <div
              className={`search-wrap-bg active-search ${
                isShrunk ? "hidden" : "block"
              }`}
            ></div>
            <div className="search-wrap-bg default"></div>
          </div>

          <div
            ref={containerRef}
            className="search-bar-wrapper transition-transform"
          >
            {!isShrunk ||
              (isShrunk && (
                <div
                  className={`active-bg ${
                    isMenuSmall ? "h-full" : "h-[52px] dm2:h-[62px]"
                  }`}
                  style={{ left: activeStyle.left, width: activeStyle.width }}
                ></div>
              ))}

            <div
              className={`search-bar-option group z-50 ${
                isShrunk
                  ? "!pl-6 !pr-3 font-medium"
                  : `${
                      isMenuSmall
                        ? "!pl-5 !pr-4 dm2:!pl-8"
                        : "!pl-5 !pr-4 dm2:!pl-8"
                    }`
              }`}
              onClick={() => {
                handleOptionClick("sub", 0);
                if (activeDropdown !== "sub") {
                  setActiveDropdown("sub");
                }
              }}
            >
              <div
                className={`search-hover initial bg-gray-200 ${
                  isShrunk ? "opacity-0" : "group-hover:opacity-100"
                }`}
              ></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-xs dm2:text-sm text-gray-700 relative">
                Search
              </div>
              {!isShrunk && (
                <input
                  type="text"
                  placeholder="Explore your interests"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (activeDropdown !== "sub") {
                      setActiveDropdown("sub");
                    }
                  }}
                  className="relative border-0 p-0 text-xs dm2:text-sm text-black bg-transparent font-semibold focus:ring-0 placeholder:text-black"
                />
              )}
              <ClearSearchIcon
                classes={
                  searchTerm.length && activeDropdown === "sub"
                    ? "opacity-100"
                    : "opacity-0"
                }
                onClick={() => setSearchTerm("")}
              />
            </div>

            {isShrunk ? (
              <div className="search-options-separator !opacity-100"></div>
            ) : (
              <div className={`search-options-separator opacity-100`}></div>
            )}

            <div
              className={`search-bar-option group ${
                isShrunk
                  ? "!pl-3 !pr-14 !w-auto text-center font-medium"
                  : `${isMenuSmall ? "!px-4" : ""}`
              }`}
              onClick={() => handleOptionClick("picker", 1)}
            >
              <div
                className={`search-hover initial bg-gray-200 ${
                  isShrunk ? "opacity-0" : "group-hover:opacity-100"
                }`}
              ></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-left text-xs dm2:text-sm relative">
                <p className="text-gray-700">
                  {isShrunk ? "Date" : "From - To"}
                </p>
                {!isShrunk && (
                  <p className="font-semibold">{formattedDateRange()}</p>
                )}
              </div>
              <ClearSearchIcon
                classes={`!right-16 ${
                  dateRange[0] && dateRange[1] && activeDropdown === "picker"
                    ? "opacity-100"
                    : "opacity-0"
                }`}
                onClick={() => setDateRange([undefined, undefined])}
              />
            </div>

            <button
              className={`searchsearch absolute right-1 dm2:right-2 -translate-y-1/2 top-1/2 flex items-center justify-center z-30 rounded-full bg-red-500 hover:bg-red-600 text-white transition duration-500 ${
                isShrunk
                  ? "size-9 !right-1.5"
                  : `${isMenuSmall ? "size-11 right-1" : "size-11 dm2:size-12"}`
              }`}
              onClick={handleSearch}
              type="button"
            >
              <SearchIcon className={`${isShrunk ? "size-4" : "size-5"}`} />
            </button>
          </div>

          <AnimatePresence>
            {activeDropdown === "sub" && !isShrunk && (
              <motion.div
                className="menu-dropdown left-0 max-w-[400px] !pr-0 overflow-auto"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownVariants}
              >
                <div className="max-h-[calc(100vh_-_250px)]">
                  <ul className="flex flex-col dm2:gap-1 pr-5">
                    {filteredSearchOptions.map((item, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        onClick={() => {
                          setSelectedItem(item);
                          setSearchTerm(item.label);
                          toggleDropdown("picker");
                          updateIndicator(1);
                        }}
                        className="flex gap-3 items-center rounded-lg hover:bg-gray-100 transition p-2"
                      >
                        <div className="size-12 shrink-0 rounded flex justify-center items-center bg-gray-50">
                          <img
                            src={item.icon}
                            alt={item.label}
                            className="w-[80%] h-full object-contain"
                          />
                        </div>
                        <div>
                          <span className="font-medium">{item.label}</span>
                          {item.payload?.description && (
                            <p>{item.payload.description}</p>
                          )}
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  {filteredClasses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="mt-4"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Classes
                      </h3>
                      <ul className="space-y-1">
                        {filteredClasses.map((cls) => (
                          <motion.li
                            key={cls.id}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.1 }}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 transition rounded-lg cursor-pointer"
                            onClick={() => {
                              router.push(`/classes/${cls.id}`);
                              setActiveDropdown(null);
                            }}
                          >
                            <div className="size-12 shrink-0 rounded flex justify-center items-center bg-gray-50">
                              {cls.Images && cls.Images.length > 0 ? (
                                <img
                                  src={cls.Images[0]}
                                  alt={cls.Name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">
                                    No Image
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium whitespace-nowrap text-gray-900">
                                {cls.Name.length > 30
                                  ? `${cls.Name.slice(0, 30)}...`
                                  : cls.Name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {cls.Category} •{" "}
                                {cls.Address || "Location not specified"}
                              </p>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeDropdown === "picker" && !isShrunk && (
              <motion.div
                className="menu-dropdown right-0 !w-fit z-50"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownVariants}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available Between
                  </label>
                  <DayPicker
                    mode="range"
                    selected={selectedRange}
                    onSelect={(range) => {
                      setSelectedRange(range);
                      if (range?.from && range?.to) {
                        setDateRange([range.from, range.to]);
                      }
                    }}
                    className="p-2 bg-white-100 text-sm"
                    disabled={{ before: new Date() }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TeacherSearch);
