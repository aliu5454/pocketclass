import { useState } from "react";
import MusicClassroomLayout from "../MusicClassroomLayout";
import {categories} from "../../utils/categories";

function AuthenticatedHeader() {
  const [activeCategoryFilter, setCategoryFilter] = useState(categories[0].name.toLowerCase());

  return (
    <div className="bg-[white] box-border max-w-[1440px] mx-auto sticky top-0">
      <MusicClassroomLayout activeCategory={activeCategoryFilter} />
    </div>
  );
}

export default AuthenticatedHeader;
