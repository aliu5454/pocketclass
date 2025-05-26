import SportSelectionWidget from "../SportSelectionWidget";
import { useState } from "react";
import { categories } from "../../utils/categories";

function MusicSelector({ onFilterChange }) {
  const [activeKey, setActiveKey] = useState(categories[0].name.toLowerCase());
  const [activeSubCategory, setActiveSubCategory] = useState(null);

  const handleTagClick = (key) => {
    setActiveKey(key);
    setActiveSubCategory(null); // Reset subcategory when main category changes
    onFilterChange(null); // Reset filter when changing main category
  };

  const handleSubCategorySelect = (subCategory) => {
    setActiveSubCategory(subCategory);
    onFilterChange(subCategory);
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 0,
    flexShrink: 0
  };

  const tagContainerStyle = {
    display: 'flex',
    gap: '10px'
  };

  return (
    <div style={containerStyle} className=" top-[80px] md:top-[80px] bg-white z-40 pt-[3px] z-[11]">
      {/*<div style={tagContainerStyle} className="section-spacing">*/}
      {/*  {categories.map((category) => (*/}
      {/*    <Tag.CheckableTag*/}
      {/*      key={category.name}*/}
      {/*      checked={activeKey === category.name.toLowerCase()}*/}
      {/*      onChange={() => handleTagClick(category.name.toLowerCase())}*/}
      {/*      style={{*/}
      {/*        minWidth: '79px',*/}
      {/*        height: '35px',*/}
      {/*        display: 'flex',*/}
      {/*        alignItems: 'center',*/}
      {/*        justifyContent: 'center',*/}
      {/*        borderRadius: '100px',*/}
      {/*        border: '2px solid black',*/}
      {/*        backgroundColor: activeKey === category.name.toLowerCase() ? '#261f22' : 'white',*/}
      {/*        color: activeKey === category.name.toLowerCase() ? 'white' : 'black'*/}
      {/*      }}*/}
      {/*    >*/}
      {/*      {category.name}*/}
      {/*    </Tag.CheckableTag>*/}
      {/*  ))}*/}
      {/*</div>*/}
      <SportSelectionWidget
        category={activeKey}
        onSubCategorySelect={handleSubCategorySelect}
        activeSubCategory={activeSubCategory}
      />
    </div>
  );
}

export default MusicSelector;
