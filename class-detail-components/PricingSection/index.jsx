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
            {/* <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[black] mt-2 m-0 p-0">
            Individual Price: {classData?.Price}
            <br/>
            Group Price: {classData?.groupPrice}
            {/* Packages Pricing */}
            {/* {classData?.Packages.map((pkg, index) => (
                <p key={index} className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[black] m-0 p-0">{pkg.num_sessions} Lectures Package: {(pkg.Price-pkg.Discount*pkg.Price/100)/pkg.num_sessions}</p>
            ))}
          </p> */}
            <p className="[font-family:'DM_Sans',sans-serif] text-base font-medium text-left leading-6 text-[black] mt-2 m-0 p-0">
              Our coaches offer 1-on-1s and group lessons, which are a fun and
              cost-effective way to improve your skills with friends and
              like-minded folks. If you're ready to commit to continuous
              improvement, a package is the way to go!
            </p>
            <div className="flex flex-row flex-wrap mt-4 gap-3">
              <div className="px-5 py-3 flex flex-col items-start justify-center border border-gray-500 rounded-lg flex-shrink-0">
                <p className="[font-family:'DM_Sans',sans-serif] text-nowrap text-lg font-bold text-left text-[black] m-0 p-0">
                  1-on-1s
                </p>
                <p className="[font-family:'DM_Sans',sans-serif] text-base text-left text-[black] m-0 p-0">
                  {classData?.Price}
                </p>
              </div>
              <div className="px-5 py-3 flex flex-col items-start justify-center border border-gray-500 rounded-lg flex-shrink-0">
                <p className="[font-family:'DM_Sans',sans-serif] text-nowrap text-lg font-bold text-left text-[black] m-0 p-0">
                  Group Class
                </p>
                <p className="[font-family:'DM_Sans',sans-serif] text-base text-left text-[black] m-0 p-0">
                  {classData?.groupPrice}
                </p>
              </div>
              {classData?.Packages.map((pkg, index) => (
                <div
                  key={index}
                  className="px-5 items-start justify-center flex flex-col py-3 border border-gray-500 rounded-lg flex-shrink-0"
                >
                  <p className="[font-family:'DM_Sans',sans-serif] text-nowrap text-lg font-bold text-left text-[black] m-0 p-0">
                    {pkg.num_sessions} Lectures Package
                  </p>
                  <p className="[font-family:'DM_Sans',sans-serif] text-base text-left  text-[black] m-0 p-0">
                    <p className="line-through inline">
                      {pkg.Price}
                    </p>{" "}
                    <p className="text-logo-red inline">
                      ({pkg.Discount}% off)
                    </p>
                  </p>
                  <p className="[font-family:'DM_Sans',sans-serif] text-base text-left text-[black] m-0 p-0">
                    {(pkg.Price - (pkg.Discount * pkg.Price) / 100)}
                  </p>
                </div>
              ))}
            </div>
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
