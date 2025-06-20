import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { SearchIcon } from "@heroicons/react/solid";
import { categories as categoryData } from "../utils/categories";
import { smartDefaults } from "../utils/smartDefaults";
import dayjs from "dayjs";
import dynamic from 'next/dynamic';
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-day-picker/dist/style.css";
import { useActiveIndicator } from "../hooks/useActiveIndicator";

// Dynamically import DayPicker to reduce bundle size
const DayPicker = dynamic(
  () => import('react-day-picker').then(mod => mod.DayPicker),
  {
    ssr: false,
    loading: () => <p>Loading date picker...</p>
  }
);

// Precompute search options outside component
const initialSearchOptions = [
  ...smartDefaults.map(d => ({
    label: d.name,
    type: 'smart',
    icon: d.iconPath,
    payload: d
  })),
  ...categoryData.flatMap(cat => [
    {
      label: cat.name,
      type: 'category',
      icon: cat.imagePath,
      payload: cat
    },
    ...cat.subCategories.map(subCat => ({
      label: subCat.name,
      type: 'subCategory',
      icon: subCat.imagePath,
      payload: subCat
    }))
  ])
];

const distanceOptions = [
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '15', label: '15 km' },
  { value: '30', label: '30 km' },
  { value: '', label: 'Any distance' },
];

const sortByOptions = [
  { value: 'rating', label: 'Rating (High to Low)' },
  { value: 'price', label: 'Price (Low to High)' },
  { value: 'distance', label: 'Distance (Nearest)' },
];

const ClearSearchIcon = React.memo(({ classes, onClick }) => (
  <div className={`clear-search-icon ${classes}`} onClick={onClick}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true" role="presentation"
      focusable="false"
      style={{
        display: "block",
        fill: "none",
        height: '12px',
        width: '12px',
        stroke: "currentcolor",
        strokeWidth: 4,
        overflow: "visible"
      }}>
      <path d="m6 6 20 20M26 6 6 26"></path>
    </svg>
  </div>
));

const TeacherSearch = ({ isShrunk, isMenuSmall, expandMenu, user }) => {
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchDistance, setSearchDistance] = useState("");
  const [searchSortBy, setSearchSortBy] = useState("rating");
  const [dateRange, setDateRange] = useState([undefined, undefined]);
  const [selectedRange, setSelectedRange] = useState();
  const dropdownRef = useRef(null);

  const { containerRef, activeStyle, updateIndicator, resetActiveBG } = useActiveIndicator();

  // Memoize filtered search options
  const filteredSearchOptions = useMemo(() => {
    return initialSearchOptions.filter(item =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Handle URL parameters
  useEffect(() => {
    if (Object.keys(router.query).length && initialSearchOptions.length) {
      const { category, subCategory, startDate, endDate } = router.query;

      let term = '';
      if (smartDefaults.some(item => item.name === category)) {
        term = category;
      } else if (subCategory && subCategory !== 'All') {
        term = subCategory;
      } else if (category) {
        term = category;
      }

      setSearchTerm(term);

      const selected = initialSearchOptions.find(item => item.label === category);
      setSelectedItem(selected);

      setDateRange([startDate, endDate]);
      setSelectedRange({ from: startDate, to: endDate });
    }
  }, [router.query, initialSearchOptions]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const isPickerPanel = event.target.closest('.ant-picker-panel');
        if (isPickerPanel) return;
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isISODate = (str) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(str);
  };

  const handleSearch = (e) => {
    e.preventDefault();

    const searchParams = {
      distance: searchDistance,
      sortBy: searchSortBy,
    };

    if (!selectedItem) return;

    if (selectedItem.type === "smart") {
      searchParams.category = selectedItem.label;
      searchParams.distance = '';
      searchParams.subCategory = selectedItem.payload.subCategories;
    } else if (selectedItem.type === "category") {
      searchParams.category = selectedItem.label;
      searchParams.subCategory = 'All';
    } else if (selectedItem.type === "subCategory") {
      const category = categoryData.find(cat =>
        cat.subCategories.some(sc => sc.name === selectedItem.label)
      );
      if (category) {
        searchParams.category = category.name;
      }
      searchParams.subCategory = selectedItem.label;
    }

    if (dateRange[0] && dateRange[1]) {
      searchParams.startDate = isISODate(dateRange[0]) ? dateRange[0] : dateRange[0].toISOString();
      searchParams.endDate = isISODate(dateRange[1]) ? dateRange[1] : dateRange[1].toISOString();
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

  const handleDatePickerClick = (e) => {
    e.stopPropagation();
  };

  const formattedDateRange = () => {
    if (dateRange[0] && dateRange[1]) {
      return `${dayjs(dateRange[0]).format("MMM D")} - ${dayjs(dateRange[1]).format("MMM D")}`;
    }
    return "Add dates";
  };

  useEffect(() => {
    if (activeDropdown?.length) {
      const activeSearchBg = document.querySelector('.search-wrap-bg.active-search');
      const defaultBg = document.querySelector('.search-wrap-bg.default');
      if (activeSearchBg) activeSearchBg.style.opacity = "1";
      if (defaultBg) defaultBg.style.opacity = "0";
    } else {
      const activeSearchBg = document.querySelector('.search-wrap-bg.active-search');
      const defaultBg = document.querySelector('.search-wrap-bg.default');
      if (activeSearchBg) activeSearchBg.style.opacity = "0";
      if (defaultBg) defaultBg.style.opacity = "1";
      resetActiveBG();
    }
  }, [activeDropdown, resetActiveBG]);

  useEffect(() => {
    setActiveDropdown(null);
  }, [isShrunk]);

  const toggleDropdown = (type) => {
    setActiveDropdown(prev => (prev === type ? null : type));
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
    <div className={`menu-search-bar z-[100] relative w-full transition-all duration-500 mx-auto max-dm2:px-3 ${isShrunk ? 'max-w-[230px] h-[50px] translate-y-[-75px]' :
          `${isMenuSmall ? 'max-w-[400px] h-[54px] dm2:translate-y-[-75px]' : 'max-dm2:h-[54px] max-w-[650px]'}`
        }`}>
      <div className={`${user ? 'dm2:translate-y-[-20px] translate-y-[0px]' : ''}  transition duration-500`}>
        <div className="relative h-full" ref={dropdownRef}>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className={`search-wrap-bg active-search ${isShrunk ? 'hidden' : 'block'}`}></div>
            <div className="search-wrap-bg default"></div>
          </div>

          <div ref={containerRef} className="search-bar-wrapper transition-all">
            {!isShrunk && (
              <div
                className={`active-bg ${isMenuSmall ? 'h-full' : 'h-[52px] dm2:h-[62px]'}`}
                style={{
                  left: activeStyle.left,
                  width: activeStyle.width,
                }}
              ></div>
            )}

            {/* Search Input */}
            <div
              className={`search-bar-option group z-50 ${isShrunk ? '!pl-6 !pr-3 font-medium' :
                  `${isMenuSmall ? '!pl-5 !pr-4 dm2:!pl-8' : '!pl-5 !pr-4 dm2:!pl-8'}`
                }`}
              onClick={() => handleOptionClick('sub', 0)}
            >
              <div className={`search-hover initial bg-gray-200 ${isShrunk ? 'opacity-0' : 'group-hover:opacity-100'
                }`}></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-xs dm2:text-sm text-gray-700 relative">
                Search
              </div>
              {!isShrunk && (
                <input
                  type="text"
                  placeholder="Explore your interests"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="relative border-0 p-0 text-xs dm2:text-sm text-black bg-transparent font-semibold focus:ring-0 placeholder:text-black"
                />
              )}
              <ClearSearchIcon
                classes={searchTerm.length && activeDropdown === 'sub' ? 'opacity-100' : 'opacity-0'}
                onClick={() => setSearchTerm('')}
              />
            </div>

            {isShrunk ? (
              <div className="search-options-separator !opacity-100"></div>
            ) : (
              <div className={`search-options-separator ${!['picker', 'sub'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0'
                }`}></div>
            )}

            {/* Date Picker */}
            <div
              className={`search-bar-option group ${isShrunk ? '!pl-3 !pr-14 !w-auto text-center font-medium' :
                  `${isMenuSmall ? '!px-4' : ''}`
                }`}
              onClick={() => handleOptionClick('picker', 1)}
            >
              <div className={`search-hover initial bg-gray-200 ${isShrunk ? 'opacity-0' : 'group-hover:opacity-100'
                }`}></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-left text-xs dm2:text-sm relative">
                <p className="text-gray-700">
                  {isShrunk ? 'Date' : 'From - To'}
                </p>
                {!isShrunk && <p className="font-semibold">{formattedDateRange()}</p>}
              </div>
              <ClearSearchIcon
                classes={`!right-16 ${dateRange[0] && dateRange[1] && activeDropdown === 'picker' ? 'opacity-100' : 'opacity-0'
                  }`}
                onClick={() => setDateRange([undefined, undefined])}
              />
            </div>

            {/* Search Button */}
            <button
              className={`absolute right-1 dm2:right-2 -translate-y-1/2 top-1/2 flex items-center justify-center z-30 rounded-full bg-red-500 hover:bg-red-600 text-white transition duration-500 ${isShrunk ? 'size-9 !right-1.5' :
                  `${isMenuSmall ? 'size-11 right-1' : 'size-11 dm2:size-12'}`
                }`}
              onClick={handleSearch}
              type="button"
            >
              <SearchIcon className={`${isShrunk ? 'size-4' : 'size-5'}`} />
            </button>
          </div>

          {/* Dropdowns */}
          {activeDropdown === 'sub' && !isShrunk && (
            <div className="menu-dropdown left-0 max-w-[400px] !pr-0">
              <div className="max-h-[calc(100vh_-_250px)] overflow-auto">
                <ul className="flex flex-col dm2:gap-1 pr-5">
                  {filteredSearchOptions.map((item, index) => (
                    <li
                      key={index}
                      onClick={() => {
                        setSelectedItem(item);
                        setSearchTerm(item.label);
                        toggleDropdown('picker');
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
                        {item.payload?.description && <p>{item.payload.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeDropdown === 'picker' && !isShrunk && (
            <div className="menu-dropdown right-0 !w-fit z-50">
              <div onClick={handleDatePickerClick}>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TeacherSearch);