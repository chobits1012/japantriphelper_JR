import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TripCard } from './TripCard';
import type { TripMetadata, TripSeason } from '../types';

interface SortableTripCardProps {
    trip: TripMetadata;
    onClick: () => void;
    getSeasonColor: (season: TripSeason) => string;
}

export const SortableTripCard: React.FC<SortableTripCardProps> = ({ trip, onClick, getSeasonColor }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: trip.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1, // Keep user's preferred opacity behavior
    };

    return (
        <TripCard
            ref={setNodeRef}
            trip={trip}
            onClick={onClick}
            getSeasonColor={getSeasonColor}
            style={style}
            attributes={attributes}
            listeners={listeners}
        />
    );
};
