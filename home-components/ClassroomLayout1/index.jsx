import InstructorInfoSection from "../InstructorInfoSection";
import ClassroomFooter from "../ClassroomFooter";

function ClassroomLayout1({ activeFilter }) {
  return (
    <div className="flex justify-start items-stretch flex-col grow-0 shrink-0 basis-auto overflow-x-hidden">
      <InstructorInfoSection activeFilter={activeFilter} />
      <ClassroomFooter />
    </div>
  );
}

export default ClassroomLayout1;
