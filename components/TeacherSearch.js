import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SearchIcon } from "@heroicons/react/solid";
import { categories as categoryData } from "../utils/categories";
import dayjs from "dayjs";
import {DayPicker} from "react-day-picker";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-day-picker/dist/style.css";
import {useActiveIndicator} from "../hooks/useActiveIndicator";

const TeacherSearch = ({ selectedCategory }) => {
  const router = useRouter();
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const [searchDistance, setSearchDistance] = useState("");
  const [searchSortBy, setSearchSortBy] = useState("");
  const [dateRange, setDateRange] = useState([undefined, undefined]);
  const [selectedRange, setSelectedRange] = useState();

  const dropdownRef = useRef(null);

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

    if (dateRange) {
      searchParams.startDate = dateRange[0].toISOString();
      searchParams.endDate = dateRange[1].toISOString();
    }

    const filteredParams = Object.fromEntries(
        Object.entries(searchParams).filter(([_, v]) => v != null)
    );

    const category = categoryData.find(c => c.name.toLowerCase() === selectedCategory).name;

    router.push({
      pathname: `/browse/${category}/${selectedSubCategory}`,
      query: filteredParams,
    });

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
        <div className="relative w-[850px]" ref={dropdownRef}>

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
            <div className="search-bar-option group max-w-[240px] !pl-8"
                 onClick={() => {
                   toggleDropdown('sub');
                   updateIndicator(0);
                 }}
            >
              <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-sm text-gray-700 relative">
                Sub-categories
              </div>
              <input
                  type="text"
                  placeholder="Search"
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="relative border-0 p-0 text-sm text-black bg-transparent font-semibold focus:ring-0 placeholder:text-black"
              />
              <ClearSearchIcon
                  classes={selectedSubCategory.length && activeDropdown === 'sub' ? 'opacity-100' : 'opacity-0'}
                  onClick={() => setSelectedSubCategory('')}
              />
            </div>

            <div className={`search-options-separator ${!['distance', 'sub'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0' }`}></div>

            {/*Distance Select*/}
            <div className="search-bar-option group max-w-[165px]"
                onClick={() => {
                  toggleDropdown('distance');
                  updateIndicator(1);
                }}
            >
              <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>

              <div className="text-sm text-gray-700 relative">
                Distance (km)
              </div>
              <div className="font-semibold text-sm relative">
                {searchDistance.length ?
                    distanceOptions.find((option) => option.value === searchDistance).label
                    :
                    'Select'}
              </div>

              <ClearSearchIcon
                  classes={searchDistance.length && activeDropdown === 'distance' ? 'opacity-100' : 'opacity-0'}
                  onClick={() => setSearchDistance('')}
              />
            </div>


            {/*Sort By*/}
            <div className={`search-options-separator ${!['distance', 'sort'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="search-bar-option max-w-[185px] group py-3 px-6"
                 onClick={() => {
                   toggleDropdown('sort');
                   updateIndicator(2);
                 }}
            >
              <div className="search-hover initial group-hover:opacity-100 bg-gray-200"></div>
              <div className="search-hover active hidden group-hover:opacity-100 bg-gray-300"></div>
              <div className="text-sm text-gray-700 relative">
                Sort By
              </div>
              <div className="font-semibold text-sm relative line-clamp-1">
                {searchSortBy.length ?
                    sortByOptions.find((option) => option.value === searchSortBy).label
                    :
                    'Select'}
              </div>

              <ClearSearchIcon
                  classes={searchSortBy.length && activeDropdown === 'sort' ? 'opacity-100' : 'opacity-0'}
                  onClick={() => setSearchSortBy('')}
              />
            </div>



            <div
                className={`search-options-separator ${!['picker', 'sort'].includes(activeDropdown) ? 'opacity-100' : 'opacity-0' }`}></div>

            {/* Date Range Picker Button */}
            <div className="search-bar-option group max-w-[260px]"
                 onClick={() => {
                   toggleDropdown('picker');
                   updateIndicator(3);
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
                disabled={!selectedSubCategory}
            >
              <SearchIcon className="h-5 w-5"/>
            </button>
          </div>

          {/*Sub Categories List Dropdown*/}
          {activeDropdown === 'sub' &&
            <div className="menu-dropdown left-0 max-w-[240px] px-8">
              <ul className="flex flex-col gap-1">
                {categoryData.find(cat => cat.name.toLowerCase() === selectedCategory)?.subCategories
                    .filter(subCat => subCat.name.toLowerCase().includes(selectedSubCategory.toLowerCase()))
                    .map((subCat, index) => (
                        <li
                            key={index}
                            onClick={() => {
                              setSelectedSubCategory(subCat.name);
                              toggleDropdown('distance');
                              updateIndicator(1);
                            }}
                        >
                          {subCat.name}
                        </li>
                    ))}
              </ul>
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
                <div className="menu-dropdown right-0 !w-fit p-5 z-50">
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
                    {/*<RangePicker*/}
                    {/*    onChange={(dates) => setDateRange(dates)}*/}
                    {/*    className="w-full"*/}
                    {/*    disabledDate={(current) => current && current < Date.now()}*/}
                    {/*    getPopupContainer={(trigger) => trigger.parentNode}*/}
                    {/*    onClick={(e) => e.stopPropagation()}*/}
                    {/*/>*/}
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
