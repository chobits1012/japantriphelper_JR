import React from 'react';
import type { ItineraryEvent } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import TimelineEventClassic from './TimelineEventClassic';
import TimelineEventComfort from './TimelineEventComfort';

interface TimelineEventProps {
  event: ItineraryEvent;
  isLast?: boolean;
}

const TimelineEvent: React.FC<TimelineEventProps> = (props) => {
  const { theme } = useTheme();

  if (theme === 'comfort') {
    return <TimelineEventComfort {...props} />;
  }

  return <TimelineEventClassic {...props} />;
};

export default TimelineEvent;