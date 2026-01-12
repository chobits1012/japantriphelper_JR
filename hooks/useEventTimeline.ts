import { useState } from 'react';
import type { ItineraryDay, ItineraryEvent } from '../types';

export const useEventTimeline = (
    editData: ItineraryDay,
    setEditData: (data: ItineraryDay) => void,
    onUpdate: (updatedDay: ItineraryDay | ItineraryDay[]) => void
) => {
    const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);

    const handleEventChange = (index: number, field: keyof ItineraryEvent, value: any) => {
        const newEvents = [...editData.events];
        newEvents[index] = { ...newEvents[index], [field]: value };
        setEditData({ ...editData, events: newEvents });
    };

    const handleAddEvent = () => {
        const newEvent: ItineraryEvent = {
            time: '09:00',
            title: '',
            location: '',
            mapQuery: '',
            ticketLinks: []
        };
        setEditData({ ...editData, events: [...editData.events, newEvent] });
    };

    const handleQuickAdd = (template: Partial<ItineraryEvent>) => {
        const newEvent: ItineraryEvent = {
            time: template.time || '09:00',
            title: template.title || '',
            location: template.location || '',
            mapQuery: template.mapQuery || '',
            icon: template.icon,
            ticketLinks: template.ticketLinks || []
        };
        setEditData({ ...editData, events: [...editData.events, newEvent] });
    };

    const handleRemoveEvent = (index: number) => {
        const newEvents = editData.events.filter((_, i) => i !== index);
        setEditData({ ...editData, events: newEvents });
    };

    const handleConfirmRemoveEvent = (index: number, onConfirm: () => void) => {
        // This will be called from the component to show confirmation
        // The actual removal will happen in handleRemoveEvent
        onConfirm();
    };

    return {
        editingEventIndex,
        setEditingEventIndex,
        handleEventChange,
        handleAddEvent,
        handleQuickAdd,
        handleRemoveEvent,
        handleConfirmRemoveEvent,
    };
};
