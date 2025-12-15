import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItineraryDay } from '../types';
import { DayCard } from './DayCard';

interface SortableDayCardProps {
  day: ItineraryDay;
  index: number;
  isSelected: boolean;
  isHome: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  passUsageMap?: Map<string, number>;
}

export const SortableDayCard: React.FC<SortableDayCardProps> = ({ index, ...props }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.day.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <DayCard
      {...props}
      innerRef={setNodeRef}
      style={style}
      attributes={attributes}
      listeners={listeners}
    />
  );
};