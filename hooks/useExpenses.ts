import { useState, useMemo } from 'react';
import type { ExpenseItem, TripSettings } from '../types';

export const useExpenses = (
    expenses: ExpenseItem[],
    onUpdateExpenses: (items: ExpenseItem[]) => void,
    tripSettings: TripSettings,
    onUpdateTripSettings: (settings: TripSettings) => void,
    rate: number
) => {
    const [newExpTitle, setNewExpTitle] = useState('');
    const [newExpAmount, setNewExpAmount] = useState('');
    const [newExpCat, setNewExpCat] = useState<string>('food');
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [budgetInput, setBudgetInput] = useState(tripSettings.budgetJPY?.toString() || '');

    const handleAddExpense = () => {
        if (!newExpTitle || !newExpAmount) return;
        const newItem: ExpenseItem = {
            id: Math.random().toString(36).substr(2, 9),
            title: newExpTitle,
            amountJPY: parseInt(newExpAmount),
            category: newExpCat,
            date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
        };
        onUpdateExpenses([newItem, ...expenses]);
        setNewExpTitle('');
        setNewExpAmount('');
    };

    const handleDeleteExpense = (id: string) => {
        onUpdateExpenses(expenses.filter(e => e.id !== id));
    };

    const handleClearExpenses = () => {
        onUpdateExpenses([]);
    };

    const handleSaveBudget = () => {
        const budget = parseInt(budgetInput);
        if (!isNaN(budget)) {
            onUpdateTripSettings({ ...tripSettings, budgetJPY: budget });
        }
        setIsEditingBudget(false);
    };

    // Calculate statistics
    const totalJPY = useMemo(() =>
        expenses.reduce((sum, item) => sum + (item.amountJPY || 0), 0),
        [expenses]
    );

    const budget = tripSettings.budgetJPY || 0;
    const remaining = budget - totalJPY;
    const percentSpent = budget > 0 ? Math.min((totalJPY / budget) * 100, 100) : 0;

    const toTWD = (jpy: number) => `NT$ ${Math.round(jpy * rate).toLocaleString()}`;

    const categoryStats = useMemo(() => {
        const stats: Record<string, number> = { food: 0, shopping: 0, transport: 0, hotel: 0, other: 0 };
        expenses.forEach(item => {
            const cat = item.category || 'other';
            if (stats[cat] !== undefined) {
                stats[cat] += (item.amountJPY || 0);
            }
        });
        return stats;
    }, [expenses]);

    return {
        // State
        newExpTitle,
        setNewExpTitle,
        newExpAmount,
        setNewExpAmount,
        newExpCat,
        setNewExpCat,
        isEditingBudget,
        setIsEditingBudget,
        budgetInput,
        setBudgetInput,
        // Handlers
        handleAddExpense,
        handleDeleteExpense,
        handleClearExpenses,
        handleSaveBudget,
        // Computed
        totalJPY,
        budget,
        remaining,
        percentSpent,
        toTWD,
        categoryStats,
    };
};
