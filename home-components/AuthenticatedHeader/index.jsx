import { useState } from "react";
import MusicClassroomLayout from "../MusicClassroomLayout";
import {categories} from "../../utils/categories";

function AuthenticatedHeader() {
  const [activeCategoryFilter, setCategoryFilter] = useState(categories[0].name.toLowerCase());

  return (
    <div className="bg-[white] box-border px-4 md:px-6 lg:px-8 overflow-x-hidden">
      <MusicClassroomLayout activeCategory={activeCategoryFilter} />
    </div>
  );
}

export default AuthenticatedHeader;
