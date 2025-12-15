import { useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { ItineraryDay, TripSettings } from '../types';
import useLocalStorage from './useLocalStorage';

// Helper: Recalculate Dates based on start date and index
const recalculateDates = (days: ItineraryDay[], startDateStr: string): ItineraryDay[] => {
  return days.map((day, index) => {
    const dateObj = new Date(startDateStr);
    dateObj.setDate(dateObj.getDate() + index);
    
    const dateStr = `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      ...day,
      day: `Day ${index + 1}`,
      date: dateStr,
      weekday: weekday,
    };
  });
};

export const useItinerary = (
  tripId: string, 
  tripSettings: TripSettings,
  onDaysChange?: (newCount: number) => void // New callback prop
) => {
  const STORAGE_KEY = `trip-${tripId}-itinerary`;

  const [itineraryData, setItineraryData] = useLocalStorage<ItineraryDay[]>(STORAGE_KEY, []);

  const addDay = useCallback(() => {
    const newDay: ItineraryDay = {
      id: Math.random().toString(36).substr(2, 9),
      day: "", date: "", weekday: "", // Will be calculated
      title: "新的一天",
      desc: "自由安排行程",
      pass: false,
      bg: "https://images.unsplash.com/photo-1478860409698-8707f313ee8b?q=80&w=1000", // Will be replaced by Picsum in UI ideally
      location: "Japan",
      weatherIcon: tripSettings.season === 'winter' ? 'snow' : 'sunny',
      temp: "--°C",
      events: []
    };

    setItineraryData(prevData => {
      const newDays = recalculateDates([...prevData, newDay], tripSettings.startDate);
      if (onDaysChange) onDaysChange(newDays.length); // Trigger callback
      return newDays;
    });
  }, [setItineraryData, tripSettings.season, tripSettings.startDate, onDaysChange]);

  const deleteDay = useCallback((id: string) => {
    setItineraryData(prevData => {
      if (prevData.length <= 1) {
        alert("至少需要保留一天行程！");
        return prevData;
      }
      const newData = prevData.filter(d => d.id !== id);
      const recalculated = recalculateDates(newData, tripSettings.startDate);
      if (onDaysChange) onDaysChange(recalculated.length); // Trigger callback
      return recalculated;
    });
  }, [setItineraryData, tripSettings.startDate, onDaysChange]);

  const reorderDays = useCallback((activeId: string, overId: string) => {
    setItineraryData((items) => {
      const oldIndex = items.findIndex((item) => item.id === activeId);
      const newIndex = items.findIndex((item) => item.id === overId);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      return recalculateDates(newOrder, tripSettings.startDate);
    });
  }, [setItineraryData, tripSettings.startDate]);

  const updateDay = useCallback((updatedDay: ItineraryDay | ItineraryDay[] | Partial<ItineraryDay>) => {
    setItineraryData(prevData => {
        const updates = Array.isArray(updatedDay) ? updatedDay : [updatedDay];
        const updateMap = new Map<string, ItineraryDay>(
            updates.map((d): [string, ItineraryDay] => [d.id!, d as ItineraryDay])
        );
        return prevData.map(day => ({ ...day, ...updateMap.get(day.id) }));
    });
  }, [setItineraryData]);

  return {
    itineraryData,
    setItineraryData, 
    addDay,
    deleteDay,
    reorderDays,
    updateDay,
    recalculateDates, 
  };
};