function PricingSection({ classData }) {
  // console.log("Insructor Data" + {instructorData});
  return (
    <>
    <div className="w-[100.00%] box-border mt-[15.5px]">
      {!classData ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="space-y-2">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-5 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ) : (
        <div className="w-[100.00%] box-border">
          <p className="[font-family:'DM_Sans',sans-serif] text-2xl font-bold text-[#261f22] m-0 p-0">
            Pricing
          </p>
          <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[black] mt-2 m-0 p-0">
            Individual Price: {classData?.Price}
            <br/>
            Group Price: {classData?.groupPrice}
            {/* Packages Pricing */}
            {classData?.Packages.map((pkg, index) => (
                <p key={index} className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[black] m-0 p-0">{pkg.num_sessions} Lectures Package: {(pkg.Price-pkg.Discount*pkg.Price/100)/pkg.num_sessions}</p>
            ))}
          </p>
        </div>
      )}
      <div className="w-[100.00%] box-border mt-[15.5px] border-t-[#d4d2d3] border-t border-solid" />
    </div>
      <div className="w-[100.00%] box-border mt-[15.5px]">
        {!classData ? (
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-3/4"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <div className="w-[100.00%] box-border">
            <p className="[font-family:'DM_Sans',sans-serif] text-2xl font-bold text-[#261f22] m-0 p-0">
              Pricing Description
            </p>
            <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[black] mt-2 m-0 p-0">
              {classData?.Pricing}
              {/* Prices range from ${instructorData?.price_min}/hr-${instructorData?.price_max}/hr, depending on class type and group size */}
              <br />
              (Please contact for more information).
            </p>
          </div>
        )}
        <div className="w-[100.00%] box-border mt-[15.5px] border-t-[#d4d2d3] border-t border-solid" />
      </div>
    </>
  );
}

export default PricingSection;
