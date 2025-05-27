import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SearchIcon } from "@heroicons/react/solid";
import { categories as categoryData } from "../utils/categories";
import { smartDefaults } from "../utils/smartDefaults";
import dayjs from "dayjs";
import {DayPicker} from "react-day-picker";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-day-picker/dist/style.css";
import {useActiveIndicator} from "../hooks/useActiveIndicator";

const TeacherSearch = ({ selectedCategory }) => {
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [searchOptions, setSearchOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const [searchDistance, setSearchDistance] = useState("30");
  const [searchSortBy, setSearchSortBy] = useState("rating");
  const [dateRange, setDateRange] = useState([undefined, undefined]);
  const [selectedRange, setSelectedRange] = useState();

  const dropdownRef = useRef(null);

  useEffect(() => {
    function buildSearchOptions() {
      const results = [];

      smartDefaults.forEach((d) =>
          results.push({ label: d.name, type: 'smart', icon: d.iconPath, payload: d })
      );

      categoryData.forEach((cat) => {
        results.push({ label: cat.name, type: 'category', icon: cat.imagePath, payload: cat });
        cat.subCategories.forEach((subCat) => {
          results.push({ label: subCat.name, type: 'subCategory', icon: subCat.imagePath, payload: subCat });
        });
      });

      setSearchOptions(results);
    }

    buildSearchOptions();
  }, [smartDefaults, categoryData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        const isPickerPanel = event.target.closest('.ant-picker-panel');
        if (isPickerPanel) {
          return;
        }
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleSearch = (e) => {
    e.preventDefault();

    const searchParams = {
      distance: searchDistance,
      sortBy: searchSortBy,
    };

    if (selectedItem.type === "smart") {
      searchParams.category = 'Smart';
      searchParams.distance = '';
      searchParams.subCategory = selectedItem.payload.subCategories;
    } else if (selectedItem.type === "category") {
      searchParams.category = selectedItem.label;
      searchParams.subCategory = 'All';
    } else if (selectedItem.type === "subCategory") {
      categoryData.forEach((cat) => {
        if (cat.subCategories.some((sc) => sc.name === selectedItem.label)) {
          searchParams.category = cat.name;
        }
      });
     searchParams.subCategory = selectedItem.label;
    }

    if (dateRange) {
      searchParams.startDate = dateRange[0].toISOString();
      searchParams.endDate = dateRange[1].toISOString();
    }

    const filteredParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, v]) => v != null)
    );
    
    if (searchParams.subCategory.length) {
      router.push({
        pathname: `/browse/${searchParams.category}/${searchParams.subCategory}`,
        query: filteredParams,
      });
    } else {
      router.push({
        pathname: `/browse/${searchParams.category}`,
        query: filteredParams,
      });
    }

    setActiveDropdown(null);
  };

  const handleDatePickerClick = (e) => {
    e.stopPropagation();
  };

  const formattedDateRange = () => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      return `${dayjs(dateRange[0]).format("MMM D")} - ${dayjs(dateRange[1]).format("MMM D")}`;
    }
    return "Add dates";
  };

  const { containerRef, activeStyle, updateIndicator, resetActiveBG } = useActiveIndicator();

  useEffect(() => {
    if (activeDropdown?.length) {
      document.querySelector('.search-wrap-bg.active-search').style.opacity = "1";
      document.querySelector('.search-wrap-bg.default').style.opacity = "0";
    } else {
      document.querySelector('.search-wrap-bg.active-search').style.opacity = "0";
      document.querySelector('.search-wrap-bg.default').style.opacity = "1";
      resetActiveBG();
    }
  }, [activeDropdown]);

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

  const toggleDropdown = (type) => {
    setActiveDropdown(prev => (prev === type ? null : type));
  };

  useEffect(() => {
    setSelectedSubCategory('');
  }, [selectedCategory])

  return (
      <div className="menu-search-bar">
        <div className="relative w-[650px]" ref={dropdownRef}>

          <div className="absolute top-0 left-0 w-full h-full">
            {/*Show below div when any search option is clicked*/}
            <div className="search-wrap-bg active-search"></div>

            {/*Show below div as a default*/}
            <div className="search-wrap-bg default"></div>
          </div>

          {/*Search Wrapper*/}
          <div ref={containerRef} className="flex items-stretch justify-start gap-1 relative h-full">
            <div
                className="active-bg"
                style={{
                   left: activeStyle.left,
                   width: activeStyle.width,
                 }}
            ></div>

            {/*Sub-category Search*/}
            <div className="search-bar-option group max-w-[300px] !pl-8"
                 onClick={() => {
                   toggleDropdown('sub');
                   updateIndicator(0);
                 }}
            >
              <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-sm text-gray-700 relative">
                Search
              </div>
              <input
                  type="text"
                  placeholder="Explore your interests"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="relative border-0 p-0 text-sm text-black bg-transparent font-semibold focus:ring-0 placeholder:text-black"
              />
              <ClearSearchIcon
                  classes={setSearchTerm.length && activeDropdown === 'sub' ? 'opacity-100' : 'opacity-0'}
                  onClick={() => setSearchTerm('')}
              />
            </div>

            {/*<div className={`search-options-separator !hidden ${!['distance', 'sub'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0' }`}></div>*/}

            {/*/!*Distance Select*!/*/}
            {/*<div className="search-bar-option !hidden group max-w-[165px]"*/}
            {/*    onClick={() => {*/}
            {/*      toggleDropdown('distance');*/}
            {/*      updateIndicator(1);*/}
            {/*    }}*/}
            {/*>*/}
            {/*  <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>*/}
            {/*  <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>*/}

            {/*  <div className="text-sm text-gray-700 relative">*/}
            {/*    Distance (km)*/}
            {/*  </div>*/}
            {/*  <div className="font-semibold text-sm relative">*/}
            {/*    {searchDistance.length ?*/}
            {/*        distanceOptions.find((option) => option.value === searchDistance).label*/}
            {/*        :*/}
            {/*        'Select'}*/}
            {/*  </div>*/}

            {/*  <ClearSearchIcon*/}
            {/*      classes={searchDistance.length && activeDropdown === 'distance' ? 'opacity-100' : 'opacity-0'}*/}
            {/*      onClick={() => setSearchDistance('')}*/}
            {/*  />*/}
            {/*</div>*/}


            {/*/!*Sort By*!/*/}
            {/*<div className={`search-options-separator !hidden ${!['distance', 'sort'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0'}`}></div>*/}

            {/*<div className="search-bar-option !hidden max-w-[185px] group py-3 px-6"*/}
            {/*     onClick={() => {*/}
            {/*       toggleDropdown('sort');*/}
            {/*       updateIndicator(2);*/}
            {/*     }}*/}
            {/*>*/}
            {/*  <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>*/}
            {/*  <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>*/}
            {/*  <div className="text-sm text-gray-700 relative">*/}
            {/*    Sort By*/}
            {/*  </div>*/}
            {/*  <div className="font-semibold text-sm relative line-clamp-1">*/}
            {/*    {searchSortBy.length ?*/}
            {/*        sortByOptions.find((option) => option.value === searchSortBy).label*/}
            {/*        :*/}
            {/*        'Select'}*/}
            {/*  </div>*/}

            {/*  <ClearSearchIcon*/}
            {/*      classes={searchSortBy.length && activeDropdown === 'sort' ? 'opacity-100' : 'opacity-0'}*/}
            {/*      onClick={() => setSearchSortBy('')}*/}
            {/*  />*/}
            {/*</div>*/}

            <div
                className={`search-options-separator ${!['picker', 'sub'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0' }`}></div>

            {/* Date Range Picker Button */}
            <div className="search-bar-option group max-w-[350px]"
                 onClick={() => {
                   toggleDropdown('picker');
                   updateIndicator(1);
                 }}
            >
              <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-left px-2 text-sm relative">
                <p className="text-gray-700">From - To</p>
                <p className="font-semibold">{formattedDateRange()}</p>
              </div>
              <ClearSearchIcon
                  classes={`!right-16 ${dateRange[0] && dateRange[1] &&  activeDropdown === 'picker' ? 'opacity-100' : 'opacity-0'}`}
                  onClick={() => setDateRange([undefined, undefined])}
              />
            </div>

            {/* Search Button */}
            <button
                className="absolute right-2 -translate-y-1/2 top-1/2 flex items-center justify-center z-30 rounded-full  bg-red-500 hover:bg-red-600 text-white size-12"
                onClick={handleSearch}
                type="button"
            >
              <SearchIcon className="h-5 w-5"/>
            </button>
          </div>

          {/*Sub Categories List Dropdown*/}
          {activeDropdown === 'sub' &&
            <div className="menu-dropdown left-0 max-w-[400px] !pr-0">
              <div className="max-h-[calc(100vh_-_250px)] overflow-auto">
                <ul className="flex flex-col gap-1 pr-5">
                  {searchOptions
                      .filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((item, index) => (
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
                              <img src={item.icon} alt={item.label} className="w-[80%] h-full object-contain"/>
                            </div>
                            <div>
                              <span className="font-medium">{item.label}</span>
                              {item.payload?.description?.length && <p>{item.payload?.description}</p>}
                            </div>
                          </li>
                      ))}
                </ul>
              </div>
            </div>
          }

          {/*Distance List Dropdown*/}
          {activeDropdown === 'distance' &&
              <div className="menu-dropdown left-[260px] max-w-[165px]">
                <ul className="flex flex-col gap-1">
                  {distanceOptions.map((option) => (
                      <li
                          key={option.value}
                          onClick={() => {
                            setSearchDistance(option.value);
                            toggleDropdown('sort');
                            updateIndicator(2);
                          }}
                      >
                        {option.label}
                      </li>
                  ))}
                </ul>
              </div>
          }

          {/*Sort Options Dropdown*/}
          {activeDropdown === 'sort' &&
              <div className="menu-dropdown left-[435px] max-w-[185px]">
                <ul className="flex flex-col gap-1">
                  {sortByOptions.map((option) => (
                      <li
                          key={option.value}
                          onClick={() => {
                            setSearchSortBy(option.value);
                            toggleDropdown('picker');
                            updateIndicator(3);
                          }}
                      >
                        {option.label}
                      </li>
                  ))}
                </ul>
              </div>
          }

            {/* Expanded Datepicker */}
            {activeDropdown === 'picker' && (
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
                        disabled={{before: new Date()}}
                    />
                  </div>
                </div>
            )}

        </div>
      </div>
  );
};

const ClearSearchIcon = ({classes, onClick}) => {
  return (
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
  )
}

export default TeacherSearch;
