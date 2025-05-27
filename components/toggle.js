'use client';

import { useState, useEffect } from 'react';

export default function ToggleSwitch({ formik, form, setForm }) {
  const [isOn, setIsOn] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [numberErrors, setNumberErrors] = useState({
    groupSize: false,
    groupPrice: false
  });

  // Initialize the toggle state when form values are loaded
  useEffect(() => {
    if (!initialized && (form.groupSize || form.groupPrice)) {
      setIsOn(true);
      setInitialized(true);
    }
  }, [form.groupSize, form.groupPrice, initialized]);

  const validateNumber = (value) => {
    // Check if value is a valid number (including empty string)
    return value === '' || /^\d*\.?\d*$/.test(value);
  };

  const handleToggle = () => {
    const newIsOn = !isOn;
    setIsOn(newIsOn);
    
    if (!newIsOn) {
      // When turning off, clear the values
      setForm({
        ...form,
        groupSize: '',
        groupPrice: ''
      });
      formik.setFieldValue('groupSize', '');
      formik.setFieldValue('groupPrice', '');
      setNumberErrors({ groupSize: false, groupPrice: false });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Validate the input
    const isValid = validateNumber(value);
    setNumberErrors(prev => ({ ...prev, [name]: !isValid }));
    
    // Only update if valid or empty
    if (isValid) {
      formik.handleChange(e);
      setForm({ ...form, [name]: value });
    }
  };

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
            onChange={handleToggle}
          />
          <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${
            isOn ? 'bg-[#E73F2B]' : 'bg-gray-300'
          }`}></div>
          <div
            className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform ${
              isOn ? 'translate-x-6' : ''
            }`}
          ></div>
        </div>
      </label>

      {/* Group inputs section */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isOn ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-row gap-4 rounded-3xl border-gray-200 p-5 px-6 border-[1px]">
          <div className="flex-grow">
            <label className="text-lg font-bold">Max Group Size</label>
            <input
              name="groupSize"
              className={`w-full border-2 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:ring-1 ${
                numberErrors.groupSize 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-100 focus:border-logo-red focus:ring-logo-red'
              }`}
              placeholder="e.g., 2-4"
              type="text" // Changed to text to allow better validation
              value={form.groupSize || ''}
              onBlur={formik.handleBlur}
              onChange={handleInputChange}
            />
            {numberErrors.groupSize && (
              <div className="text-red-500 text-sm">Please enter a valid number</div>
            )}
            {formik.touched.groupSize && formik.errors.groupSize && (
              <div className="text-red-500 text-sm">{formik.errors.groupSize}</div>
            )}
          </div>

          <div className="flex-grow">
            <label className="text-lg font-bold">Group Price Per Person</label>
            <input
              name="groupPrice"
              className={`w-full border-2 rounded-xl p-3 mt-1 bg-transparent focus:outline-none focus:ring-1 ${
                numberErrors.groupPrice 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-100 focus:border-logo-red focus:ring-logo-red'
              }`}
              placeholder="e.g., $30"
              type="text" // Changed to text to allow better validation
              value={form.groupPrice || ''}
              onBlur={formik.handleBlur}
              onChange={handleInputChange}
            />
            {numberErrors.groupPrice && (
              <div className="text-red-500 text-sm">Please enter a valid number</div>
            )}
            {formik.touched.groupPrice && formik.errors.groupPrice && (
              <div className="text-red-500 text-sm">{formik.errors.groupPrice}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}