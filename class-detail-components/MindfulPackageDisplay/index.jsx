import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import MindfulClassDisplay from "../MindfulClassDisplay";
import { set } from "date-fns";

function MindfulPackageDisplay({
  classData,
  classId,
  mindfulClassCardOptions,
}) {
  const [packages, setPackages] = useState(classData?.Packages);

  useEffect(() => {
    setPackages(classData?.Packages);
  }, [classData]);

  return (
    <>
      {packages?.length > 0 && (
        <div className="w-[100.00%] box-border mt-6 md:mt-12">
          <p className="[font-family:'DM_Sans',sans-serif] text-2xl font-bold text-[#261f22] m-0 p-0">
            Package
          </p>
          <MindfulClassDisplay
            packages={packages}
            classId={classId}
            mindfulClassCardOptions={mindfulClassCardOptions}
          />
        </div>
      )}
    </>
  );
}

export default MindfulPackageDisplay;
