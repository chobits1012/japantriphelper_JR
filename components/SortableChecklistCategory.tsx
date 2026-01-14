import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ChecklistCategory } from '../types';

interface SortableChecklistCategoryProps {
    category: ChecklistCategory;
    children: (dragListeners: any) => React.ReactNode;
}

export const SortableChecklistCategory: React.FC<SortableChecklistCategoryProps> = ({ category, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: category.id,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {children(listeners)}
        </div>
    );
};
