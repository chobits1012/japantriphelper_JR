import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ChecklistItem } from '../types';

interface SortableChecklistItemProps {
    item: ChecklistItem;
    categoryId: string;
    children: (dragListeners: any, isDragging: boolean) => React.ReactNode;
}

export const SortableChecklistItem: React.FC<SortableChecklistItemProps> = ({ item, categoryId, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {children(listeners, isDragging)}
        </div>
    );
};
