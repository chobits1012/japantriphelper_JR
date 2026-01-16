import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TripCard } from './TripCard';
import { ComfortTripCard } from './ComfortTripCard';
import type { TripMetadata, TripSeason } from '../types';
// Add access to theme context
import { useTheme } from '../contexts/ThemeContext';

interface SortableTripCardProps {
    trip: TripMetadata;
    onClick: () => void;
    getSeasonColor: (season: TripSeason) => string;
}

export const SortableTripCard: React.FC<SortableTripCardProps> = ({ trip, onClick, getSeasonColor }) => {
    const { theme } = useTheme();

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
        opacity: isDragging ? 0.3 : 1,
    };

    // Conditional Rendering based on Theme
    if (theme === 'comfort') {
        return (
            <ComfortTripCard
                ref={setNodeRef}
                trip={trip}
                onClick={onClick}
                getSeasonColor={getSeasonColor}
                style={style}
                attributes={attributes}
                listeners={listeners}
            />
        );
    }

    // Default / Classic
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
