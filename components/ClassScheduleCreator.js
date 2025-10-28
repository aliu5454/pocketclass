import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

const ClassScheduleCreator = ({ 
  classId, 
  onScheduleCreated, 
  className = "",
  schedule: externalSchedule,
  setSchedule: setExternalSchedule,
  isEmbedded = false 
}) => {
  const [schedule, setSchedule] = useState(externalSchedule || {
    generalAvailability: [
      { day: "Monday", slots: [] },
      { day: "Tuesday", slots: [] },
      { day: "Wednesday", slots: [] },
      { day: "Thursday", slots: [] },
      { day: "Friday", slots: [] },
      { day: "Saturday", slots: [] },
      { day: "Sunday", slots: [] }
    ],
    adjustedAvailability: []
  });

  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isLoading, setIsLoading] = useState(false);

  // Use external schedule state if provided (for embedded mode)
  const currentSchedule = externalSchedule || schedule;
  const setCurrentSchedule = setExternalSchedule || setSchedule;

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addTimeSlot = () => {
    if (selectedDays.length === 0) {
      toast.error('Please select at least one day');
      return;
    }
    
    if (startTime >= endTime) {
      toast.error('End time must be after start time');
      return;
    }

    // Check for duplicate or overlapping time slots
    const conflictingDays = [];
    selectedDays.forEach(day => {
      const dayData = currentSchedule.generalAvailability.find(d => d.day === day);
      if (dayData) {
        const hasConflict = dayData.slots.some(slot => {
          // Check for exact duplicate
          if (slot.startTime === startTime && slot.endTime === endTime) {
            return true;
          }
          // Check for overlapping times
          const newStart = new Date(`1970-01-01T${startTime}:00`);
          const newEnd = new Date(`1970-01-01T${endTime}:00`);
          const existingStart = new Date(`1970-01-01T${slot.startTime}:00`);
          const existingEnd = new Date(`1970-01-01T${slot.endTime}:00`);
          
          return (newStart < existingEnd && newEnd > existingStart);
        });
        
        if (hasConflict) {
          conflictingDays.push(day);
        }
      }
    });

    if (conflictingDays.length > 0) {
      if (conflictingDays.length === 1) {
        toast.error(`Time slot ${startTime} - ${endTime} already exists or overlaps with an existing slot on ${conflictingDays[0]}`);
      } else {
        toast.error(`Time slot ${startTime} - ${endTime} already exists or overlaps with existing slots on: ${conflictingDays.join(', ')}`);
      }
      return;
    }

    const newSlot = {
      startTime,
      endTime,
      available: true
    };

    const updatedSchedule = { ...currentSchedule };
    selectedDays.forEach(day => {
      const dayIndex = updatedSchedule.generalAvailability.findIndex(d => d.day === day);
      if (dayIndex !== -1) {
        updatedSchedule.generalAvailability[dayIndex].slots.push(newSlot);
      }
    });

    setCurrentSchedule(updatedSchedule);
    setSelectedDays([]);
    setStartTime('09:00');
    setEndTime('10:00');
    
    // Show success message
    if (selectedDays.length === 1) {
      toast.success(`Time slot ${startTime} - ${endTime} added to ${selectedDays[0]}`);
    } else {
      toast.success(`Time slot ${startTime} - ${endTime} added to ${selectedDays.length} days`);
    }
  };

  const removeTimeSlot = (day, slotIndex) => {
    const updatedSchedule = { ...currentSchedule };
    const dayIndex = updatedSchedule.generalAvailability.findIndex(d => d.day === day);
    if (dayIndex !== -1) {
      updatedSchedule.generalAvailability[dayIndex].slots.splice(slotIndex, 1);
      setCurrentSchedule(updatedSchedule);
    }
  };

  const saveSchedule = async () => {
    if (!classId) {
      toast.error('Class ID is required');
      return;
    }

    // Check if schedule has at least one time slot
    const hasSlots = currentSchedule.generalAvailability.some(day => day.slots.length > 0);
    if (!hasSlots) {
      toast.error('Please add at least one time slot');
      return;
    }

    setIsLoading(true);
    try {
      await setDoc(doc(db, "Schedule", classId), currentSchedule);
      toast.success('Class schedule saved successfully!');
      if (onScheduleCreated) {
        onScheduleCreated(currentSchedule);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Set Class Schedule
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Define when this class is available for booking. You can add multiple time slots throughout the week.
      </p>

      {/* Time Slot Creator */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Add Available Time Slots</h4>
        
        {/* Day Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Days
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`px-3 py-1 text-sm rounded-md border ${
                  selectedDays.includes(day)
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addTimeSlot}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Add Time Slot
        </button>
      </div>

      {/* Schedule Preview */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Current Schedule</h4>
        <div className="space-y-2">
          {currentSchedule.generalAvailability.map((day) => (
            <div key={day.day} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
              <span className="font-medium text-gray-700">{day.day}</span>
              <div className="flex flex-wrap gap-2">
                {day.slots.length === 0 ? (
                  <span className="text-gray-500 text-sm">No slots</span>
                ) : (
                  day.slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm bg-white px-2 py-1 rounded border">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(day.day, index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button - only show if not embedded */}
      {!isEmbedded && (
        <button
          type="button"
          onClick={saveSchedule}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Class Schedule'}
        </button>
      )}
    </div>
  );
};

export default ClassScheduleCreator;