import React, { useState, useEffect } from 'react';
import type { ChecklistCategory, ChecklistItem } from '../types';

const DEFAULT_CATEGORIES = [
    { title: "證件/錢財", items: ["護照 (效期6個月以上)", "JR PASS 兌換券", "日幣現金", "信用卡 (海外回饋高)"] },
    { title: "衣物/穿搭", items: ["換洗衣物", "好走的鞋子", "保暖衣物/發熱衣", "帽子/太陽眼鏡"] },
    { title: "電子產品", items: ["手機", "充電器", "行動電源", "網卡/eSIM/漫遊", "轉接頭 (日本雙孔)"] },
    { title: "盥洗/藥品", items: ["個人藥品", "牙刷牙膏", "保養品/化妝品"] },
    { title: "其他", items: ["雨傘", "筆", "Visit Japan Web 截圖"] }
];

export const useChecklist = (
    checklist: ChecklistCategory[],
    onUpdateChecklist: (categories: ChecklistCategory[]) => void
) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewCatInput, setShowNewCatInput] = useState(false);
    const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');

    // Initialize Checklist if empty or corrupted
    useEffect(() => {
        const needsInitialization = checklist.length === 0 ||
            checklist.some(cat => !cat.items || !Array.isArray(cat.items));

        if (needsInitialization) {
            const initialList: ChecklistCategory[] = DEFAULT_CATEGORIES.map(cat => ({
                id: Math.random().toString(36).substr(2, 9),
                title: cat.title,
                items: cat.items.map(text => ({
                    id: Math.random().toString(36).substr(2, 9),
                    text,
                    checked: false
                })),
                isCollapsed: false
            }));
            onUpdateChecklist(initialList);
        }
    }, []);

    const handleResetChecklist = () => {
        const initialList: ChecklistCategory[] = DEFAULT_CATEGORIES.map(cat => ({
            id: Math.random().toString(36).substr(2, 9),
            title: cat.title,
            items: cat.items.map(text => ({
                id: Math.random().toString(36).substr(2, 9),
                text,
                checked: false
            })),
            isCollapsed: false
        }));
        onUpdateChecklist(initialList);
    };

    const toggleCategoryCollapse = (catId: string) => {
        onUpdateChecklist(checklist.map(cat =>
            cat.id === catId ? { ...cat, isCollapsed: !cat.isCollapsed } : cat
        ));
    };

    const handleDeleteCategory = (catId: string) => {
        onUpdateChecklist(checklist.filter(c => c.id !== catId));
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        const newCat: ChecklistCategory = {
            id: Math.random().toString(36).substr(2, 9),
            title: newCategoryName,
            items: [],
            isCollapsed: false
        };
        onUpdateChecklist([...checklist, newCat]);
        setNewCategoryName('');
        setShowNewCatInput(false);
    };

    const handleStartEditTitle = (cat: ChecklistCategory, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCatId(cat.id);
        setEditingTitle(cat.title);
    };

    const handleSaveTitle = (catId: string) => {
        if (editingTitle.trim()) {
            onUpdateChecklist(checklist.map(c => c.id === catId ? { ...c, title: editingTitle } : c));
        }
        setEditingCatId(null);
        setEditingTitle('');
    };

    const handleAddItemInput = (catId: string, val: string) => {
        setNewItemInputs(prev => ({ ...prev, [catId]: val }));
    };

    const handleAddItemSubmit = (catId: string) => {
        const text = newItemInputs[catId];
        if (!text || !text.trim()) return;

        onUpdateChecklist(checklist.map(cat => {
            if (cat.id === catId) {
                return {
                    ...cat,
                    items: [...cat.items, { id: Math.random().toString(36).substr(2, 9), text: text.trim(), checked: false }]
                };
            }
            return cat;
        }));

        setNewItemInputs(prev => ({ ...prev, [catId]: '' }));
    };

    const handleToggleItem = (catId: string, itemId: string) => {
        onUpdateChecklist(checklist.map(cat => {
            if (cat.id === catId) {
                return {
                    ...cat,
                    items: cat.items.map(item =>
                        item.id === itemId ? { ...item, checked: !item.checked } : item
                    )
                };
            }
            return cat;
        }));
    };

    const handleDeleteItem = (catId: string, itemId: string) => {
        onUpdateChecklist(checklist.map(cat => {
            if (cat.id === catId) {
                return {
                    ...cat,
                    items: cat.items.filter(item => item.id !== itemId)
                };
            }
            return cat;
        }));
    };

    const handleStartEditItem = (catId: string, itemId: string, currentText: string) => {
        setEditingItemId(itemId);
        setEditingItemText(currentText);
    };

    const handleSaveItem = (catId: string, itemId: string) => {
        if (editingItemText.trim()) {
            onUpdateChecklist(checklist.map(cat => {
                if (cat.id === catId) {
                    return {
                        ...cat,
                        items: cat.items.map(item =>
                            item.id === itemId ? { ...item, text: editingItemText.trim() } : item
                        )
                    };
                }
                return cat;
            }));
        }
        setEditingItemId(null);
        setEditingItemText('');
    };

    const handleCancelEditItem = () => {
        setEditingItemId(null);
        setEditingItemText('');
    };

    const reorderCategories = (activeId: string, overId: string) => {
        const oldIndex = checklist.findIndex(cat => cat.id === activeId);
        const newIndex = checklist.findIndex(cat => cat.id === overId);

        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...checklist];
        const [movedItem] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, movedItem);

        onUpdateChecklist(reordered);
    };

    return {
        newCategoryName,
        setNewCategoryName,
        showNewCatInput,
        setShowNewCatInput,
        newItemInputs,
        setNewItemInputs,
        editingCatId,
        setEditingCatId,
        editingTitle,
        setEditingTitle,
        editingItemId,
        setEditingItemId,
        editingItemText,
        setEditingItemText,
        handleResetChecklist,
        toggleCategoryCollapse,
        handleDeleteCategory,
        handleAddCategory,
        handleStartEditTitle,
        handleSaveTitle,
        handleAddItemInput,
        handleAddItemSubmit,
        handleToggleItem,
        handleDeleteItem,
        handleStartEditItem,
        handleSaveItem,
        handleCancelEditItem,
        reorderCategories,
    };
};

