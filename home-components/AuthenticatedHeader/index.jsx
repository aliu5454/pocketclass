import { useState } from "react";
import MusicClassroomLayout from "../MusicClassroomLayout";
import {categories} from "../../utils/categories";

function AuthenticatedHeader() {
  const [activeCategoryFilter, setCategoryFilter] = useState(categories[0].name.toLowerCase());

  return (
    <div className="bg-[white] box-border overflow-x-hidden">
      <MusicClassroomLayout activeCategory={activeCategoryFilter} />
    </div>
  );
}

export default AuthenticatedHeader;
