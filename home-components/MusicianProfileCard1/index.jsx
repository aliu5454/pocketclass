import SvgIcon2 from "./icons/SvgIcon2";
import { categories } from "../../utils/categories";
import { toast } from "react-toastify";

function MusicianProfileCard1({ instructor, router }) {
  const fullName = `${instructor?.name?.split(" ").slice(0, 4).join(" ") || "N/A"}`.trim();
  const rating = instructor?.averageRating;
  const price = instructor?.Price;
  const specialization = instructor?.SubCategory || instructor?.Type;
  const groupPrice = instructor?.groupPrice;

  const getCategoryIcon = (category, type) => {
    const categoryData = categories.find((cat) => cat.name === category);
    if (!categoryData) return null;
    const subCategoryData = categoryData.subCategories.find((sub) => sub.name === type);
    return subCategoryData ? subCategoryData.imagePath : categoryData.imagePath;
  };

  return (
    <div className="flex z-[0] cursor-default flex-col justify-between rounded-2xl w-full px-[15px] py-4 pb-0 bg-white rounded-lg">
      {/* Top Info Section */}
      <div>
        <div className="flex justify-between items-start gap-2 w-full">
          <div>
            <p className="[font-family:'DM_Sans',sans-serif] text-md font-bold text-[#261f22] m-0 p-0 text-[13px]">
              {fullName.length > 30 ? `${fullName.slice(0, 25)}..` : fullName}
            </p>

            {/* Category + SubCategory */}
            <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
              {getCategoryIcon(instructor?.Category, specialization) && (
                <img
                  src={getCategoryIcon(instructor?.Category, specialization)}
                  alt={specialization}
                  loading="lazy"
                  className="w-4 h-4"
                />
              )}
              <p className="text-base font-bold text-[#7d797a] break-words">
                {instructor?.category?.split(" ")[0]}
              </p>
              <img src="/assets/image_7a2617f3.png" loading="lazy" alt="" className="h-1 w-1 block" />
              <p className="text-base font-bold text-[#7d797a] break-words">{specialization}</p>
            </div>
          </div>

          {/* Price Section */}
          <div className="flex flex-col items-end shrink-0 min-w-[90px]">
            <p className="text-xl font-bold leading-6 text-[#261f22]">
              ${groupPrice}
              {groupPrice ? "-$" : ""}
              {price}
            </p>
            <p className="text-base font-normal text-[#261f22]">per hour</p>
          </div>
        </div>

        {/* Rating */}
      </div>

      {/* Bottom Section: Instructor Info Full Width + Right Aligned */}

    </div>
  );
}

export default MusicianProfileCard1;
