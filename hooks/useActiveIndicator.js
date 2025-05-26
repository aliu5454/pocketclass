import { useEffect, useRef, useState } from "react";

export const useActiveIndicator = () => {
    const containerRef = useRef(null);
    const [activeStyle, setActiveStyle] = useState({ left: 0, width: 0, opacity: 0 });

    const updateIndicator = (index) => {
        const container = containerRef.current;
        if (!container) return;

        const items = container.querySelectorAll(".search-bar-option");
        items.forEach((item) => {
            if (!item.classList.contains('group'))
                item.classList.add("group");
            item.querySelector('.search-hover.initial').classList.add('hidden');
            item.querySelector('.search-hover.active').classList.remove('hidden');
        })
        const target = items[index];
        target.classList.remove("group");

        if (target) {
            const { offsetLeft, offsetWidth } = target;
            setActiveStyle({ left: offsetLeft, width: offsetWidth, opacity: 100 });
        }
    };

    const resetActiveBG = () => {
        setActiveStyle({ opacity: 0 });
        const container = containerRef.current;
        if (!container) return;

        const items = container.querySelectorAll(".search-bar-option");
        items.forEach((item) => {
            item.classList.add("group");
            item.querySelector('.search-hover.initial').classList.remove('hidden');
            item.querySelector('.search-hover.active').classList.add('hidden');
        })
    };

    return { containerRef, activeStyle, updateIndicator, resetActiveBG };
};
