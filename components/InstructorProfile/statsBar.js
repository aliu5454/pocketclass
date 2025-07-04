const StatsBar = ({ classLength, averageRating, totalStudentsTaught, totalReviews }) => {
    return (
        <div className="mt-6 flex justify-center overflow-x-auto px-4">
            <div className="flex w-full max-w-4xl rounded-xl border border-gray-200 bg-gray-50 text-center shadow-sm overflow-hidden flex-nowrap md:flex-row flex-col">
                {/* Rating */}
                <div className="flex items-center flex-1 justify-center md:border-r md:border-b-0 border-b border-gray-200">
                    <div className="flex items-center md:justify-center md:min-w-[0px] min-w-[234px] justify-start px-4 py-4 ">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-8 h-8 text-black mr-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                            />
                        </svg>
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-lg font-bold">{averageRating || '0.0'}/5</div>
                            <div className="text-sm">{totalReviews || '0'} reviews</div>
                        </div>
                    </div>
                </div>

                {/* Classes */}
                <div className="flex items-center flex-1 justify-center md:border-r md:border-b-0 border-b border-gray-200">
                    <div className="flex items-center md:justify-center md:min-w-[0px] min-w-[234px] justify-start px-4 py-4 ">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 18C16.35 18 14.9375 17.4125 13.7625 16.2375C12.5875 15.0625 12 13.65 12 12C12 10.35 12.5875 8.9375 13.7625 7.7625C14.9375 6.5875 16.35 6 18 6C19.65 6 21.0625 6.5875 22.2375 7.7625C23.4125 8.9375 24 10.35 24 12C24 13.65 23.4125 15.0625 22.2375 16.2375C21.0625 17.4125 19.65 18 18 18ZM6 30V25.8C6 24.95 6.21875 24.1687 6.65625 23.4562C7.09375 22.7437 7.675 22.2 8.4 21.825C9.95 21.05 11.525 20.4688 13.125 20.0812C14.725 19.6937 16.35 19.5 18 19.5C19.65 19.5 21.275 19.6937 22.875 20.0812C24.475 20.4688 26.05 21.05 27.6 21.825C28.325 22.2 28.9062 22.7437 29.3438 23.4562C29.7812 24.1687 30 24.95 30 25.8V30H6ZM9 27H27V25.8C27 25.525 26.9312 25.275 26.7938 25.05C26.6562 24.825 26.475 24.65 26.25 24.525C24.9 23.85 23.5375 23.3438 22.1625 23.0063C20.7875 22.6688 19.4 22.5 18 22.5C16.6 22.5 15.2125 22.6688 13.8375 23.0063C12.4625 23.3438 11.1 23.85 9.75 24.525C9.525 24.65 9.34375 24.825 9.20625 25.05C9.06875 25.275 9 25.525 9 25.8V27ZM18 15C18.825 15 19.5313 14.7063 20.1188 14.1187C20.7063 13.5312 21 12.825 21 12C21 11.175 20.7063 10.4688 20.1188 9.88125C19.5313 9.29375 18.825 9 18 9C17.175 9 16.4688 9.29375 15.8813 9.88125C15.2937 10.4688 15 11.175 15 12C15 12.825 15.2937 13.5312 15.8813 14.1187C16.4688 14.7063 17.175 15 18 15Z" fill="#1D1B20" />
                        </svg>
                        <div className="flex flex-col items-center ml-6 justify-center">
                            <div className="text-lg font-bold">{classLength}</div>
                            <div className="text-sm">classes</div>
                        </div>
                    </div>
                </div>

                {/* Students */}
                <div className="flex items-center flex-1 justify-center md:border-r dm:min-w-[0px] min-w-[215px] md:border-b-0 border-b border-gray-200">
                    <div className="flex items-center md:justify-center min-w-[234px] justify-start px-4 py-4 ">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 18C16.35 18 14.9375 17.4125 13.7625 16.2375C12.5875 15.0625 12 13.65 12 12C12 10.35 12.5875 8.9375 13.7625 7.7625C14.9375 6.5875 16.35 6 18 6C19.65 6 21.0625 6.5875 22.2375 7.7625C23.4125 8.9375 24 10.35 24 12C24 13.65 23.4125 15.0625 22.2375 16.2375C21.0625 17.4125 19.65 18 18 18ZM6 30V25.8C6 24.95 6.21875 24.1687 6.65625 23.4562C7.09375 22.7437 7.675 22.2 8.4 21.825C9.95 21.05 11.525 20.4688 13.125 20.0812C14.725 19.6937 16.35 19.5 18 19.5C19.65 19.5 21.275 19.6937 22.875 20.0812C24.475 20.4688 26.05 21.05 27.6 21.825C28.325 22.2 28.9062 22.7437 29.3438 23.4562C29.7812 24.1687 30 24.95 30 25.8V30H6ZM9 27H27V25.8C27 25.525 26.9312 25.275 26.7938 25.05C26.6562 24.825 26.475 24.65 26.25 24.525C24.9 23.85 23.5375 23.3438 22.1625 23.0063C20.7875 22.6688 19.4 22.5 18 22.5C16.6 22.5 15.2125 22.6688 13.8375 23.0063C12.4625 23.3438 11.1 23.85 9.75 24.525C9.525 24.65 9.34375 24.825 9.20625 25.05C9.06875 25.275 9 25.525 9 25.8V27ZM18 15C18.825 15 19.5313 14.7063 20.1188 14.1187C20.7063 13.5312 21 12.825 21 12C21 11.175 20.7063 10.4688 20.1188 9.88125C19.5313 9.29375 18.825 9 18 9C17.175 9 16.4688 9.29375 15.8813 9.88125C15.2937 10.4688 15 11.175 15 12C15 12.825 15.2937 13.5312 15.8813 14.1187C16.4688 14.7063 17.175 15 18 15Z" fill="#1D1B20" />
                        </svg>
                        <div className="flex flex-col items-center ml-6 justify-center">
                            <div className="text-lg font-bold">{totalStudentsTaught}</div>
                            <div className="text-sm">students</div>
                        </div>
                    </div>
                </div>

                {/* Verified Instructor */}
                <div className="flex items-center flex-1 justify-center md:border-r md:border-b-0 border-b border-gray-200">
                    <div className="flex items-center md:ml-0 ml-4 md:justify-center justify-start md:px-4 px-0 py-4">
                        <div className="relative w-6 h-6 mb-1">
                            {/* User icon */}
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clip-path="url(#clip0_8_64)">
                                    <path d="M20 26.25V23.75C20 22.4239 19.4732 21.1521 18.5355 20.2145C17.5979 19.2768 16.3261 18.75 15 18.75H6.25C4.92392 18.75 3.65215 19.2768 2.71447 20.2145C1.77678 21.1521 1.25 22.4239 1.25 23.75V26.25M21.25 13.75L23.75 16.25L28.75 11.25M15.625 8.75C15.625 11.5114 13.3864 13.75 10.625 13.75C7.86358 13.75 5.625 11.5114 5.625 8.75C5.625 5.98858 7.86358 3.75 10.625 3.75C13.3864 3.75 15.625 5.98858 15.625 8.75Z" stroke="#1E1E1E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                                </g>
                                <defs>
                                    <clipPath id="clip0_8_64">
                                        <rect width="30" height="30" fill="white" />
                                    </clipPath>
                                </defs>
                            </svg>
                        </div>
                        <div className="text-lg flex flex-wrap font-bold ml-6">Verified Instructor</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatsBar;
