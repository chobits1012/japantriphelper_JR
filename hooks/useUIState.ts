import { useState, useCallback } from 'react';

export const useUIState = (itineraryLength: number) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  
  // Track active drag item for Overlay
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const handleHome = useCallback(() => setSelectedDayIndex(null), []);
  
  const handleDaySelect = useCallback((index: number) => setSelectedDayIndex(index), []);

  const handleNext = useCallback(() => {
    setSelectedDayIndex(prev => (prev !== null && prev < itineraryLength - 1 ? prev + 1 : prev));
  }, [itineraryLength]);

  const handlePrev = useCallback(() => {
    setSelectedDayIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const isHome = selectedDayIndex === null;

  return {
    selectedDayIndex,
    setSelectedDayIndex,
    isAIModalOpen,
    setIsAIModalOpen,
    isToolboxOpen,
    setIsToolboxOpen,
    isSetupOpen,
    setIsSetupOpen,
    activeDragId,
    setActiveDragId,
    handleHome,
    handleDaySelect,
    handleNext,
    handlePrev,
    isHome,
  };
};
