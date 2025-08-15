import MusicSelector from "../MusicSelector";
import ClassroomLayout1 from "../ClassroomLayout1";
import TopClassesSection from "../TopInstructorsSection";

function MusicClassroomLayout({ activeCategory }) {
  return (
    <div className="mt-[-3px] flex justify-start items-stretch flex-col w-[100.00%] box-border overflow-x-hidden">
      {/* <MusicSelector selectedCategory={activeCategory} /> */}
      <ClassroomLayout1 />
    </div>
  );
}

export default MusicClassroomLayout;
