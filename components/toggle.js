'use client';

import { useState, useEffect } from 'react';

export default function ToggleSwitch({ formik, form, setForm }) {
  const [isOn, setIsOn] = useState(false);

  useEffect(()=>{
    if(!isOn){
      setForm({
        ...form,
        groupSize: '',
        groupPrice: ''
      })
    }
    else{
      setForm({
        ...form,
        groupSize: document.getElementById('groupSize').value,
        groupPrice: document.getElementById('groupPrice').value
      })
    }
    console.log('Form:', form.groupSize, form.groupPrice)
  },[isOn])

  return (
    <div className="max-w-[750px] w-full">
      {/* Toggle Switch */}
      <label className="flex justify-between cursor-pointer items-center">
        <span className="text-xl font-bold">Enable Group Lessons</span>
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={isOn}
            onChange={() => setIsOn(!isOn)}
          />
          <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${isOn ? 'bg-[#E73F2B]' : 'bg-gray-300'
            }`}></div>
          <div
            className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform ${isOn ? 'translate-x-6' : ''
              }`}
          ></div>
        </div>
      </label>

      {/* Dummy Box with animation */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${isOn ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="flex flex-row gap-4 rounded-3xl border-gray-200 p-5 px-6 border-[1px] ">
          <div className="flex-grow">
            <label className="text-lg font-bold">Max Group Size</label>
            <input
              id="groupSize"
              name="groupSize"
              className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
              placeholder="e.g., 2-4"
              type={"number"}
              // value={form.groupSize}
              onBlur={formik.handleBlur}
              onChange={(e) => {
                formik.handleChange(e);
                setForm({ ...form, groupSize: e.target.value })
              }
              }
            />
            {formik.touched.groupSize && formik.errors.groupSize && (
              <div className="text-red-500 text-sm">{formik.errors.groupSize}</div>
            )}
          </div>

          <div className="flex-grow">
            <label className="text-lg font-bold">
              Group Price Per Person
            </label>
            <input
              id='groupPrice'
              name="groupPrice"
              className="w-full border-2 border-gray-100 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:border-logo-red focus:ring-1 focus:ring-logo-red"
              placeholder="e.g., $30"
              type={"number"}
              // value={form.groupPrice}
              onBlur={formik.handleBlur}
              onChange={(e) => {
                formik.handleChange(e);
                setForm({ ...form, groupPrice: e.target.value })
              }
              }
            />
            {formik.touched.groupPrice && formik.errors.groupPrice && (
              <div className="text-red-500 text-sm">{formik.errors.groupPrice}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
