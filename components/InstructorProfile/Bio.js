import { useState, useRef, useEffect } from 'react';

function ExperienceSection({ classData }) {
    const [isReadMore, setIsReadMore] = useState(true);
    const [isClamped, setIsClamped] = useState(false);
    const paragraphRef = useRef(null);

    const toggleReadMore = () => setIsReadMore(!isReadMore);

    useEffect(() => {
        console.log('classData.profileDescription', classData?.profileDescription);
        const el = paragraphRef.current;
        if (!el) return;

        const isOverflowing = el.scrollHeight > el.clientHeight + 1;
        setIsClamped(isOverflowing);
    }, [classData?.profileDescription]);

    return (
        <div className="w-full box-border">
            <div className="flex justify-start items-start flex-col md:flex-row gap-[15px]">
                <div className="grow-0 shrink-0 basis-auto w-full lg:w-[calc(100%-4rem)]">
                    <p className="[font-family:'DM_Sans',sans-serif] text-2xl font-bold text-[#261f22] m-0 p-0">
                        Bio
                    </p>
                    <p
                        ref={paragraphRef}
                        className={`[font-family:'DM_Sans',sans-serif] whitespace-pre-wrap text-base font-medium text-black mt-2 m-0 p-0 leading-6 ${isReadMore ? 'line-clamp-3' : ''
                            }`}
                    >
                        {classData?.profileDescription}
                    </p>
                    {isClamped && (
                        <p
                            onClick={toggleReadMore}
                            className="[font-family:Inter,sans-serif] text-base font-semibold text-[#261f22] mt-4 m-0 p-0 cursor-pointer hover:text-red-600"
                        >
                            {isReadMore ? 'Read more' : 'Read less'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ExperienceSection;
