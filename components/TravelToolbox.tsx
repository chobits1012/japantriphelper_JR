import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Wallet, CheckSquare, Plus, Trash2, RefreshCw, TrendingUp, Coins, Cloud, FileJson, ChevronDown, ChevronRight, FolderPlus, Pencil, Save, Upload, Copy, Check, AlertTriangle, Sparkles, GripVertical, ArrowDownUp } from 'lucide-react';
import LZString from 'lz-string';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ExpenseItem, ChecklistCategory, ChecklistItem, TripSettings, ItineraryDay } from '../types';
import ConfirmModal from './ConfirmModal';
import { EXCHANGE_RATE_API_URL, CLOUD_SYNC_CONFIG_KEY } from '../constants';
import { uploadToCloud, downloadFromCloud, FirebaseConfig } from '../lib/firebaseSync';
import { calculateDataSizeMB, STORAGE_LIMITS, formatSize } from '../lib/storageCalculator';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useCurrency } from '../hooks/useCurrency';
import { useExpenses } from '../hooks/useExpenses';
import { useChecklist } from '../hooks/useChecklist';
import { useBackup } from '../hooks/useBackup';
import { useCloudSync } from '../hooks/useCloudSync';
import { SortableChecklistCategory } from './SortableChecklistCategory';
import { SortableChecklistItem } from './SortableChecklistItem';

interface TravelToolboxProps {
  isOpen: boolean;
  onClose: () => void;
  tripSettings: TripSettings;
  onUpdateTripSettings: (settings: TripSettings) => void;
  itineraryData: ItineraryDay[];
  onUpdateItinerary: (data: ItineraryDay[]) => void;
  expenses: ExpenseItem[];
  onUpdateExpenses: (items: ExpenseItem[]) => void;
  checklist: ChecklistCategory[];
  onUpdateChecklist: (categories: ChecklistCategory[]) => void;
}

const DEFAULT_CATEGORIES = [
  { title: "證件/錢財", items: ["護照 (效期6個月以上)", "JR PASS 兌換券", "日幣現金", "信用卡 (海外回饋高)"] },
  { title: "衣物/穿搭", items: ["換洗衣物", "好走的鞋子", "保暖衣物/發熱衣", "帽子/太陽眼鏡"] },
  { title: "電子產品", items: ["手機", "充電器", "行動電源", "網卡/eSIM/漫遊", "轉接頭 (日本雙孔)"] },
  { title: "盥洗/藥品", items: ["個人藥品", "牙刷牙膏", "保養品/化妝品"] },
  { title: "其他", items: ["雨傘", "筆", "Visit Japan Web 截圖"] }
];

// Define type for expense categories to avoid implicit any errors
type ExpenseCategoryKey = 'food' | 'shopping' | 'transport' | 'hotel' | 'other';

const EXPENSE_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  food: { label: '美食', color: '#f9c5d5', bg: 'bg-[#f9c5d5]' },       // sakura - 櫻花粉
  shopping: { label: '購物', color: '#a8d5a3', bg: 'bg-[#a8d5a3]' },  // matcha - 抹茶綠
  transport: { label: '交通', color: '#4a5568', bg: 'bg-[#4a5568]' }, // sumi - 炭灰
  hotel: { label: '住宿', color: '#e6b422', bg: 'bg-[#e6b422]' },     // kiniro - 金色
  other: { label: '其他', color: '#9d8ac7', bg: 'bg-[#9d8ac7]' }      // murasaki - 紫藤
};

const TravelToolbox: React.FC<TravelToolboxProps> = ({
  isOpen, onClose,
  tripSettings, onUpdateTripSettings,
  itineraryData, onUpdateItinerary,
  expenses, onUpdateExpenses,
  checklist, onUpdateChecklist
}) => {
  const [activeTab, setActiveTab] = useState<'currency' | 'expense' | 'checklist' | 'backup' | 'cloud'>('expense');




  // Use custom hooks
  const currencyHook = useCurrency(isOpen);
  const { rate, jpyInput, setJpyInput, twdInput, setTwdInput, lastUpdated, loadingRate, handleJpyChange, handleTwdChange, fetchRate } = currencyHook;


  const expenseHook = useExpenses(expenses, onUpdateExpenses, tripSettings, onUpdateTripSettings, rate);
  const {
    newExpTitle, setNewExpTitle,
    newExpAmount, setNewExpAmount,
    newExpCat, setNewExpCat,
    isEditingBudget, setIsEditingBudget,
    budgetInput, setBudgetInput,
    handleAddExpense, handleDeleteExpense, handleClearExpenses, handleSaveBudget,
    totalJPY, budget, remaining, percentSpent, toTWD, categoryStats
  } = expenseHook;


  const checklistHook = useChecklist(checklist, onUpdateChecklist);
  const {
    newCategoryName, setNewCategoryName,
    showNewCatInput, setShowNewCatInput,
    newItemInputs, setNewItemInputs,
    editingCatId, setEditingCatId,
    editingTitle, setEditingTitle,
    editingItemId, setEditingItemId,
    editingItemText, setEditingItemText,
    handleResetChecklist, toggleCategoryCollapse,
    handleDeleteCategory, handleAddCategory,
    handleStartEditTitle, handleSaveTitle,
    handleAddItemInput, handleAddItemSubmit,
    handleToggleItem, handleDeleteItem,
    handleStartEditItem, handleSaveItem, handleCancelEditItem,
    reorderCategories, reorderItemsInCategory
  } = checklistHook;

  // DnD Sensors for checklist
  const checklistSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,      // Hold for 200ms before drag activates
        tolerance: 8     // Allow 8px movement during delay period
      }
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag state for checklist categories
  const [activeChecklistCategoryId, setActiveChecklistCategoryId] = useState<string | null>(null);

  // Drag state for checklist items - stores {categoryId, itemId}
  const [activeChecklistItemId, setActiveChecklistItemId] = useState<{ categoryId: string, itemId: string } | null>(null);

  // Active edit mode category (only one can be active at a time)
  const [activeCategoryEditId, setActiveCategoryEditId] = useState<string | null>(null);

  // Drag handlers for checklist
  const handleChecklistDragStart = (event: DragStartEvent) => {
    setActiveChecklistCategoryId(event.active.id as string);
  };

  const handleChecklistDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveChecklistCategoryId(null);
    if (over && active.id !== over.id) {
      reorderCategories(active.id as string, over.id as string);
    }
  };

  // Drag handlers for items within a category
  const handleItemDragStart = (categoryId: string) => (event: DragStartEvent) => {
    setActiveChecklistItemId({ categoryId, itemId: event.active.id as string });
  };

  const handleItemDragEnd = (categoryId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveChecklistItemId(null);
    if (over && active.id !== over.id) {
      reorderItemsInCategory(categoryId, active.id as string, over.id as string);
    }
  };

  const activeChecklistCategory = activeChecklistCategoryId
    ? checklist.find(cat => cat.id === activeChecklistCategoryId)
    : null;

  const activeChecklistItem = activeChecklistItemId
    ? checklist
      .find(cat => cat.id === activeChecklistItemId.categoryId)
      ?.items?.find(item => item.id === activeChecklistItemId.itemId)
    : null;

  const backupHook = useBackup(
    tripSettings,
    itineraryData,
    expenses,
    checklist,
    onUpdateTripSettings,
    onUpdateItinerary,
    onUpdateExpenses,
    onUpdateChecklist
  );
  const {
    importCode, setImportCode,
    copied,
    fileInputRef,
    getExportData,
    handleCopyCode, handleDownloadFile, handleImportCode, handleFileUpload,
    triggerFileUpload, executeImport
  } = backupHook;

  const cloudSyncHook = useCloudSync(getExportData);
  const {
    firebaseConfig,
    configInput, setConfigInput,
    cloudId,
    cloudIdInput, setCloudIdInput,
    isSyncing, syncStage, showConfigEdit, setShowConfigEdit, syncError,
    handleSaveConfig, handleResetConfig, handleUploadCloud, handleUpdateCloud, handleDownloadCloud
  } = cloudSyncHook;





  // Confirm modal state  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDangerous?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  // Wrapper functions for import/download confirmation
  const handleImportWithConfirm = () => {
    handleImportCode((data) => {
      setConfirmModal({
        isOpen: true,
        title: "確認匯入",
        message: `⚠️ 確定要匯入行程「${data.tripSettings.name}」嗎？\\n\\n您目前手機上的所有資料將會被覆蓋！`,
        isDangerous: true,
        onConfirm: () => {
          executeImport(data);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setConfirmModal({
              isOpen: true,
              title: "匯入成功",
              message: "您的行程資料已成功匯入！",
              isDangerous: false,
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setImportCode('');
                onClose();
              }
            });
          }, 100);
        }
      });
    });
  };

  const handleDownloadWithConfirm = () => {
    handleDownloadCloud((data) => {
      setConfirmModal({
        isOpen: true,
        title: "確認匯入",
        message: `⚠️ 確定要匯入雲端行程「${data.tripSettings.name}」嗎？\\n\\n您目前手機上的所有資料將會被覆蓋！`,
        isDangerous: true,
        onConfirm: () => {
          executeImport(data);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setConfirmModal({
              isOpen: true,
              title: "下載成功",
              message: "雲端資料已成功下載！",
              isDangerous: false,
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                onClose();
              }
            });
          }, 100);
        }
      });
    });
  };

  const handleFileUploadWithConfirm = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event, (data) => {
      setConfirmModal({
        isOpen: true,
        title: "確認匯入",
        message: `⚠️ 確定要匯入行程「${data.tripSettings.name}」嗎？\\n\\n您目前手機上的所有資料將會被覆蓋！`,
        isDangerous: true,
        onConfirm: () => {
          executeImport(data);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setTimeout(() => {
            setConfirmModal({
              isOpen: true,
              title: "匯入成功",
              message: "您的行程資料已成功匯入！",
              isDangerous: false,
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setImportCode('');
                onClose();
              }
            });
          }, 100);
        }
      });
    });
  };

  const handleResetChecklistWithConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: "重置清單",
      message: "確定要重置檢查清單嗎？這將會恢復為預設項目並清除自訂項目。",
      isDangerous: true,
      onConfirm: () => {
        handleResetChecklist();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteCategoryWithConfirm = (catId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "刪除分類",
      message: "確定要刪除這個分類嗎？",
      isDangerous: true,
      onConfirm: () => {
        handleDeleteCategory(catId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteItemWithConfirm = (catId: string, itemId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "刪除項目",
      message: "確定要刪除這個項目嗎？",
      isDangerous: true,
      onConfirm: () => {
        handleDeleteItem(catId, itemId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleClearExpensesWithConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: "清空記帳",
      message: "確定要清空所有記帳紀錄嗎？此操作無法復原。",
      isDangerous: true,
      onConfirm: () => {
        handleClearExpenses();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleResetConfigWithConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: "重置設定",
      message: "確定要重置雲端同步設定嗎？",
      isDangerous: true,
      onConfirm: () => {
        handleResetConfig();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };




  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal Container: Classic Glassmorphism + Japan Blue Accents */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-lg h-[85vh] sm:h-[800px] max-h-[90vh] flex flex-col overflow-hidden border border-white/20 dark:border-slate-700 ring-1 ring-black/5 relative transition-all duration-300">

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-japan-blue/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-kiniro/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        {/* Header Section */}
        <div className="relative z-10 px-6 pt-6 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-japan-blue text-white rounded-xl shadow-lg shadow-japan-blue/30">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-ink dark:text-white tracking-wide">
                  旅遊工具箱
                </h3>
                <p className="text-[10px] text-ink-lighter dark:text-slate-400 font-bold tracking-[0.2em] uppercase mt-0.5">
                  Travel Essentials
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-ink dark:hover:text-white transition-all duration-200 active:scale-90"
            >
              <X size={24} />
            </button>
          </div>

          {/* New Segmented Control Tabs */}
          <div className="flex p-1 bg-gray-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { id: 'expense', icon: Coins, label: '記帳' },
              { id: 'currency', icon: RefreshCw, label: '匯率' },
              { id: 'checklist', icon: CheckSquare, label: '清單' },
              { id: 'cloud', icon: Cloud, label: '雲端' },
              { id: 'backup', icon: Copy, label: '備份' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-bold transition-all duration-300 whitespace-nowrap
                    ${isActive
                      ? 'bg-white dark:bg-slate-700 text-japan-blue dark:text-sky-400 shadow-sm scale-100'
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 scale-95 hover:scale-100'
                    }
                  `}
                >
                  <tab.icon size={16} className={isActive ? "stroke-2" : "stroke-[1.5]"} />
                  <span className={isActive ? "opacity-100" : "opacity-0 sm:opacity-100 sm:w-auto w-0 overflow-hidden transition-all duration-300"}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-paper dark:bg-slate-950">

          {/* --- EXPENSE TAB --- */}
          {activeTab === 'expense' && (
            <div className="space-y-4 pb-20 fade-in slide-in-from-bottom-4 duration-500">

              {/* 1. Budget Summary Card */}
              <div className="relative overflow-hidden bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-md group transition-all hover:shadow-lg">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Budget</p>
                    <div className="flex items-baseline gap-2">
                      {isEditingBudget ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={budgetInput}
                            onChange={e => setBudgetInput(e.target.value)}
                            className="w-32 text-2xl font-mono font-bold border-b-2 border-japan-blue outline-none bg-transparent"
                            autoFocus
                          />
                          <button onClick={handleSaveBudget} className="p-1 text-japan-blue bg-blue-50 rounded-md"><Check size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/edit cursor-pointer" onClick={() => setIsEditingBudget(true)}>
                          <span className="text-3xl font-mono font-bold text-japan-blue dark:text-sky-400">
                            ¥{(tripSettings.budgetJPY || 0).toLocaleString()}
                          </span>
                          <Pencil size={12} className="opacity-0 group-hover/edit:opacity-100 text-gray-400 transition-opacity" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-1">≈ {toTWD(tripSettings.budgetJPY || 0)}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Remaining</p>
                    <p className={`text-2xl font-mono font-bold ${remaining < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      ¥{remaining.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      {Math.round((remaining / (tripSettings.budgetJPY || 1)) * 100)}% left
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  {totalJPY > 0 && Object.entries(categoryStats).map(([cat, amount]) => {
                    if (amount === 0) return null;
                    const pct = ((amount as number) / totalJPY) * ((totalJPY / (tripSettings.budgetJPY || 1)) * 100);
                    const colorClass = EXPENSE_CATEGORIES[cat]?.bg || 'bg-gray-400';
                    return (
                      <div key={cat} style={{ width: `${pct}%` }} className={`h-full ${colorClass} opacity-80`} />
                    );
                  })}
                </div>

                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-japan-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              </div>

              {/* 3. Add Expense (Compact) */}
              <div className="bg-white dark:bg-slate-900 border border-japan-blue/10 dark:border-slate-700 p-1.5 rounded-2xl shadow-sm flex items-center gap-2">
                <div className="grid grid-cols-[1.5fr,1fr] gap-2 flex-1 pl-2">
                  <input
                    type="text"
                    placeholder="購物品名..."
                    value={newExpTitle}
                    onChange={e => setNewExpTitle(e.target.value)}
                    className="w-full text-sm font-bold bg-transparent border-b border-transparent focus:border-japan-blue outline-none py-2 dark:text-white placeholder-gray-400 transition-colors"
                  />
                  <input
                    type="number"
                    placeholder="¥ 金額"
                    value={newExpAmount}
                    onChange={e => setNewExpAmount(e.target.value)}
                    className="w-full text-sm font-mono font-bold bg-transparent border-b border-transparent focus:border-kiniro outline-none py-2 dark:text-white placeholder-gray-400 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1 pr-1">
                  <select
                    value={newExpCat}
                    onChange={(e: any) => setNewExpCat(e.target.value)}
                    className="h-10 pl-2 pr-6 text-xs font-bold bg-gray-50 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-1 focus:ring-japan-blue dark:text-white cursor-pointer appearance-none"
                    style={{ backgroundImage: 'none' }}
                  >
                    <option value="food">🍜 食</option>
                    <option value="shopping">🛍️ 購</option>
                    <option value="transport">🚇 行</option>
                    <option value="hotel">🏨 住</option>
                    <option value="other">⭐ 他</option>
                  </select>

                  <button
                    onClick={handleAddExpense}
                    className="h-10 w-10 bg-japan-blue text-white rounded-xl flex items-center justify-center hover:bg-japan-blue-700 active:scale-95 transition-all shadow-md shadow-japan-blue/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* 4. Action Header */}
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Activity</span>
                {expenses.length > 0 && (
                  <button
                    onClick={handleClearExpensesWithConfirm}
                    className="text-[10px] font-bold text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* 5. Expense List (Scrollable) */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {expenses.length === 0 ? (
                  <div className="py-10 text-center opacity-50">
                    <Coins size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400">尚無記帳資料</p>
                  </div>
                ) : (
                  expenses.map((item, index) => {
                    const conf = EXPENSE_CATEGORIES[item.category] || EXPENSE_CATEGORIES['other'];
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl hover:border-japan-blue/30 transition-all shadow-sm hover:shadow-md animate-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-10 h-10 rounded-xl ${conf.bg} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                            <span className="text-lg drop-shadow-sm">
                              {item.category === 'food' ? '🍜' : item.category === 'shopping' ? '🛍️' : item.category === 'transport' ? '🚇' : item.category === 'hotel' ? '🏨' : '⭐'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-ink dark:text-white truncate">{item.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-opacity-10 dark:bg-opacity-20`} style={{ backgroundColor: conf.color, color: conf.color }}>
                                {conf.label}
                              </span>
                              <span className="text-[10px] text-gray-400">{item.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 pl-2">
                          <p className="font-mono font-bold text-japan-blue dark:text-sky-400">¥{item.amountJPY.toLocaleString()}</p>
                          <button
                            onClick={() => handleDeleteExpense(item.id)}
                            className="mt-1 text-gray-300 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* --- CURRENCY TAB --- */}
          {activeTab === 'currency' && (
            <div className="space-y-6 pt-6 px-2 fade-in slide-in-from-bottom-4 duration-500">

              {/* Rate Card */}
              <div className="text-center relative py-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Current Exchange Rate</p>
                <div className="inline-flex items-center justify-center gap-3 bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl shadow-sm border border-japan-blue/10 dark:border-slate-700">
                  <div className="flex items-center gap-1.5 text-japan-blue dark:text-sky-400">
                    <TrendingUp size={18} />
                    <span className="text-3xl font-mono font-bold tracking-tight">{rate}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-bold">JPY/TWD</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-3 opacity-60 font-mono">
                  {loadingRate ? 'Updating...' : `Last Updated: ${lastUpdated}`}
                </p>
              </div>

              {/* Converter */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-2 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl shadow-japan-blue/5 relative">

                {/* JPY Input */}
                <div className="relative group transition-all rounded-2xl bg-gray-100/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-transparent hover:border-japan-blue/20">
                  <label className="text-[10px] font-bold text-gray-400 absolute left-4 top-3 pointer-events-none">JPY 日幣</label>
                  <input
                    type="number"
                    value={jpyInput}
                    onChange={e => handleJpyChange(e.target.value)}
                    className="w-full bg-transparent p-4 pt-7 text-2xl font-mono font-bold text-ink dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full shadow-sm overflow-hidden border border-gray-100 dark:border-slate-600 pointer-events-none">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect width="100" height="100" fill="white" />
                      <circle cx="50" cy="50" r="18" fill="#BC002D" />
                    </svg>
                  </div>
                </div>

                {/* Swap Icon */}
                <div className="relative h-2 z-10">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-slate-900 rounded-full border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-400 shadow-sm">
                    <RefreshCw size={14} className="opacity-50" />
                  </div>
                </div>

                {/* TWD Input */}
                <div className="relative group transition-all rounded-2xl bg-gray-100/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-transparent hover:border-japan-blue/20">
                  <label className="text-[10px] font-bold text-gray-400 absolute left-4 top-3 pointer-events-none">TWD 台幣 (約)</label>
                  <input
                    type="number"
                    value={twdInput}
                    onChange={e => handleTwdChange(e.target.value)}
                    className="w-full bg-transparent p-4 pt-7 text-2xl font-mono font-bold text-ink dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full shadow-sm overflow-hidden border border-gray-100 dark:border-slate-600 pointer-events-none">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect width="100" height="100" fill="#FE0000" />
                      <rect width="50" height="50" fill="#000095" />
                      {/* White Sun */}
                      <g transform="translate(25, 25) scale(0.8)">
                        <circle r="12" fill="white" />
                        <path d="M0 -22 L3 -13 L11 -19 L10 -10 L19 -11 L13 -3 L22 0 L13 3 L19 11 L10 10 L11 19 L3 13 L0 22 L-3 13 L-11 19 L-10 10 L-19 11 L-13 3 L-22 0 L-13 -3 L-19 -11 L-10 -10 L-11 -19 L-3 -13 Z" fill="white" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- CHECKLIST TAB (Categorized) --- */}
          {activeTab === 'checklist' && (
            <div className="pb-24 fade-in slide-in-from-bottom-4 duration-500">

              {/* Overall Progress Header */}
              <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3 border-b border-gray-100 dark:border-slate-800 -mx-4 px-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-100 dark:text-slate-800" />
                      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="3" fill="transparent"
                        strokeDasharray={100}
                        strokeDashoffset={100 - (checklist.reduce((acc, cat) => acc + (cat.items?.filter(i => i.checked).length || 0), 0) / (checklist.reduce((acc, cat) => acc + (cat.items?.length || 0), 0) || 1) * 100)}
                        className="text-japan-blue dark:text-sky-500 transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-japan-blue dark:text-sky-400">
                      {Math.round((checklist.reduce((acc, cat) => acc + (cat.items?.filter(i => i.checked).length || 0), 0) / (checklist.reduce((acc, cat) => acc + (cat.items?.length || 0), 0) || 1) * 100))}%
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-ink dark:text-white text-sm">Packing List</h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {checklist.reduce((acc, cat) => acc + (cat.items?.filter(i => i.checked).length || 0), 0)} of {checklist.reduce((acc, cat) => acc + (cat.items?.length || 0), 0)} items ready
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetChecklistWithConfirm}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 text-gray-400 hover:text-japan-blue hover:bg-blue-50 transition-colors"
                  title="Reset Checklist"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              {/* Categories with Drag and Drop */}
              <DndContext
                sensors={checklistSensors}
                collisionDetection={closestCenter}
                onDragStart={handleChecklistDragStart}
                onDragEnd={handleChecklistDragEnd}
              >
                <SortableContext items={checklist.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4 px-1">
                    {checklist.map(cat => {
                      const total = cat.items?.length || 0;
                      const checkedCount = cat.items?.filter(i => i.checked).length || 0;
                      const progress = total > 0 ? (checkedCount / total) * 100 : 0;
                      const isEditingTitle = editingCatId === cat.id;

                      return (
                        <SortableChecklistCategory key={cat.id} category={cat}>
                          {(dragListeners) => (
                            <div className="group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-japan-blue/20">
                              {/* Cat Header */}
                              <div className="relative">
                                {/* Progress Background */}
                                <div className="absolute inset-0 bg-gray-50 dark:bg-slate-800/50" />
                                <div className="absolute inset-y-0 left-0 bg-japan-blue/5 dark:bg-sky-500/10 transition-all duration-500" style={{ width: `${progress}%` }} />

                                <div className="relative flex items-center justify-between p-3 select-none">
                                  <div
                                    onClick={() => toggleCategoryCollapse(cat.id)}
                                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                  >
                                    <div className={`transition-transform duration-300 ${cat.isCollapsed ? '' : 'rotate-90'}`}>
                                      <ChevronRight size={16} className="text-gray-400" />
                                    </div>

                                    {isEditingTitle ? (
                                      <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          value={editingTitle}
                                          onChange={e => setEditingTitle(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveTitle(cat.id);
                                          }}
                                          className="text-sm font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded border border-japan-blue outline-none w-full min-w-0"
                                          autoFocus
                                        />
                                        <button onClick={() => handleSaveTitle(cat.id)} className="p-1 text-japan-blue"><Check size={16} /></button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 group/title min-w-0">
                                        <span className="font-bold text-sm text-ink dark:text-white truncate">{cat.title}</span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white/50 dark:bg-slate-700/50 rounded-md text-gray-500 dark:text-gray-400 font-mono">
                                          {checkedCount}/{total}
                                        </span>
                                        <button
                                          onClick={(e) => handleStartEditTitle(cat, e)}
                                          className="text-gray-300 hover:text-japan-blue p-1 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                        >
                                          <Pencil size={12} />
                                        </button>

                                        {/* Sort Mode Toggle */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveCategoryEditId(prev => prev === cat.id ? null : cat.id);
                                          }}
                                          className={`ml-1 p-1 rounded-full transition-all ${activeCategoryEditId === cat.id ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100'}`}
                                          title="Sort Items"
                                        >
                                          <ArrowDownUp size={12} />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDeleteCategoryWithConfirm(cat.id); }}
                                      className="text-gray-300 hover:text-red-400 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    <div
                                      {...dragListeners}
                                      className="cursor-grab active:cursor-grabbing p-1.5 text-gray-300 hover:text-gray-500 touch-none"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical size={16} />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Cat Items */}
                              {!cat.isCollapsed && (
                                <div className="p-2 space-y-1 bg-white dark:bg-slate-900">
                                  {activeCategoryEditId === cat.id ? (
                                    <DndContext
                                      sensors={checklistSensors}
                                      collisionDetection={closestCenter}
                                      onDragStart={handleItemDragStart(cat.id)}
                                      onDragEnd={handleItemDragEnd(cat.id)}
                                    >
                                      <SortableContext items={(cat.items || []).map(item => item.id)} strategy={verticalListSortingStrategy}>
                                        {(cat.items || []).map(item => (
                                          <SortableChecklistItem key={item.id} item={item} categoryId={cat.id}>
                                            {(dragListeners, isDragging) => (
                                              <div className={`flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 ${isDragging ? 'opacity-50' : ''}`}>
                                                <div {...dragListeners} className="cursor-grab text-gray-400"><GripVertical size={14} /></div>
                                                <span className="text-sm font-bold text-gray-500">{item.text}</span>
                                              </div>
                                            )}
                                          </SortableChecklistItem>
                                        ))}
                                      </SortableContext>
                                    </DndContext>
                                  ) : (
                                    <>
                                      {(cat.items || []).map(item => {
                                        const isEditingItem = editingItemId === item.id;
                                        return (
                                          <div key={item.id} className="group/item relative overflow-hidden">
                                            {isEditingItem ? (
                                              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                                <input
                                                  type="text"
                                                  value={editingItemText}
                                                  onChange={e => setEditingItemText(e.target.value)}
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveItem(cat.id, item.id);
                                                    if (e.key === 'Escape') handleCancelEditItem();
                                                  }}
                                                  className="flex-1 bg-transparent text-sm font-bold outline-none min-w-0"
                                                  autoFocus
                                                />
                                                <button onClick={() => handleSaveItem(cat.id, item.id)} className="text-japan-blue"><Check size={14} /></button>
                                              </div>
                                            ) : (
                                              <div
                                                className={`
                                                  flex items-center gap-3 p-3 rounded-xl transition-all duration-300 cursor-pointer border border-transparent
                                                  ${item.checked ? 'bg-gray-50/50 dark:bg-slate-800/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-100 dark:hover:border-slate-700'}
                                                `}
                                                onClick={() => handleToggleItem(cat.id, item.id)}
                                              >
                                                {/* Custom Checkbox */}
                                                <div className={`
                                                  w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 border
                                                  ${item.checked
                                                    ? 'bg-japan-blue border-japan-blue dark:bg-sky-500 dark:border-sky-500 scale-100'
                                                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 group-hover/item:border-japan-blue/50 scale-95'}
                                                `}>
                                                  {item.checked && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </div>

                                                <span className={`text-sm font-medium transition-all ${item.checked ? 'text-gray-400 line-through decoration-gray-300' : 'text-ink dark:text-slate-200'}`}>
                                                  {item.text}
                                                </span>

                                                <div className="flex ml-auto gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); handleStartEditItem(cat.id, item.id, item.text); }}
                                                    className="text-gray-300 hover:text-japan-blue p-1"
                                                  >
                                                    <Pencil size={12} />
                                                  </button>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteItemWithConfirm(cat.id, item.id); }}
                                                    className="text-gray-300 hover:text-red-400 p-1"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </>
                                  )}

                                  {/* Add Item Input Inline */}
                                  <div className="mt-1 p-2 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="w-5 h-5 flex items-center justify-center text-gray-300">
                                      <Plus size={14} />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Add item..."
                                      className="flex-1 text-sm bg-transparent outline-none min-w-0 dark:text-white placeholder-gray-400"
                                      value={newItemInputs[cat.id] || ''}
                                      onChange={(e) => handleAddItemInput(cat.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddItemSubmit(cat.id);
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </SortableChecklistCategory>
                      );
                    })}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {/* Custom drag overlay if needed */}
                </DragOverlay>
              </DndContext>

              {/* Add Category Section */}
              <div className="mt-4 px-1">
                {showNewCatInput ? (
                  <div className="flex gap-2 items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-japan-blue/20 shadow-lg ring-1 ring-japan-blue/10 animate-in fade-in zoom-in-95">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="New Category Name..."
                      className="flex-1 bg-transparent text-sm font-bold outline-none text-ink dark:text-white"
                      autoFocus
                    />
                    <button onClick={handleAddCategory} className="p-2 bg-japan-blue text-white rounded-lg shadow-md hover:bg-japan-blue-700 transition-colors"><Check size={16} /></button>
                    <button onClick={() => setShowNewCatInput(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewCatInput(true)}
                    className="w-full py-3 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-gray-400 hover:border-japan-blue hover:text-japan-blue hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider group"
                  >
                    <FolderPlus size={16} className="group-hover:scale-110 transition-transform" /> Create New Category
                  </button>
                )}
              </div>
            </div>
          )}


          {/* --- CLOUD SYNC TAB --- */}


          {/* --- CLOUD SYNC TAB --- */}
          {activeTab === 'cloud' && (
            <div className="space-y-6 pt-4 pb-12 fade-in slide-in-from-bottom-4 duration-500">
              {/* Info Banner */}
              <div className="bg-blue-50/50 dark:bg-sky-900/10 border border-blue-100 dark:border-sky-900/30 rounded-2xl p-4 flex gap-3">
                <div className="bg-blue-100 dark:bg-sky-800/30 p-2 rounded-full h-fit text-blue-600 dark:text-sky-400">
                  <Sparkles size={16} />
                </div>
                <div className="text-xs text-blue-800 dark:text-sky-300 leading-relaxed">
                  <p className="font-bold mb-1">Sync Across Devices</p>
                  <p className="opacity-80">Sync your itinerary and expenses with friends. Setup a Firebase project and paste the config below.</p>
                </div>
              </div>

              {/* ACTION CARD */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-1 shadow-lg shadow-gray-100 dark:shadow-black/20 border border-gray-100 dark:border-slate-800">
                {/* Storage Meter */}
                {(() => {
                  const totalData = { settings: tripSettings, itinerary: itineraryData, expenses, checklist };
                  const sizeMB = calculateDataSizeMB(totalData);
                  const percent = Math.min((sizeMB / STORAGE_LIMITS.CLOUD_MAX) * 100, 100);
                  const isWarning = sizeMB > STORAGE_LIMITS.CLOUD_WARNING;
                  return (
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Storage</span>
                        <span className={`text-[10px] font-bold ${isWarning ? 'text-orange-500' : 'text-gray-400'}`}>
                          {formatSize(sizeMB)} / {STORAGE_LIMITS.CLOUD_MAX}.0 MB
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-orange-500' : 'bg-gradient-to-r from-japan-blue to-sky-400'}`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })()}

                <div className="p-5 space-y-6">
                  {/* Upload Section */}
                  <div className="text-center">
                    <h4 className="font-bold text-ink dark:text-white mb-1">Cloud Upload</h4>
                    <p className="text-xs text-gray-400 mb-4">Generate a Cloud ID to share with friends.</p>

                    {syncError && (
                      <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle size={14} /> {syncError}
                      </div>
                    )}

                    {cloudId ? (
                      <div className="bg-japan-blue/5 border border-japan-blue/20 rounded-2xl p-4 animate-in zoom-in-95">
                        <p className="text-[10px] font-bold text-japan-blue uppercase mb-1">Your Cloud ID</p>
                        <p className="text-2xl font-mono font-bold text-ink dark:text-white tracking-widest mb-3 select-all">{cloudId}</p>
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => { navigator.clipboard.writeText(cloudId); alert("Copied!"); }} className="btn-secondary text-xs py-1.5 h-8">
                            <Copy size={12} className="mr-1" /> Copy
                          </button>
                          <button onClick={handleUpdateCloud} disabled={isSyncing} className="btn-primary text-xs py-1.5 h-8">
                            {isSyncing ? <RefreshCw size={12} className="animate-spin mr-1" /> : <RefreshCw size={12} className="mr-1" />} Update
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleUploadCloud}
                        disabled={isSyncing || !firebaseConfig}
                        className="w-full btn-premium py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-japan-blue/20"
                      >
                        {isSyncing ? <RefreshCw className="animate-spin" /> : <Cloud />}
                        {isSyncing ? "Syncing..." : "Generate Cloud ID"}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100 dark:border-slate-800" /></div>
                    <div className="relative flex justify-center text-xs ml-4"><span className="bg-white dark:bg-slate-900 px-2 text-gray-400 font-mono">OR</span></div>
                  </div>

                  {/* Download Section */}
                  <div className="space-y-3">
                    <div className="flex bg-gray-50 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-100 dark:border-slate-700 focus-within:ring-2 focus-within:ring-japan-blue/20 transition-all">
                      <input
                        value={cloudIdInput}
                        onChange={e => setCloudIdInput(e.target.value.toUpperCase())}
                        placeholder="Enter Cloud ID to Download..."
                        className="flex-1 bg-transparent px-3 text-sm font-mono font-bold outline-none min-w-0 dark:text-white placeholder-gray-400"
                      />
                      <button
                        onClick={handleDownloadCloud}
                        disabled={isSyncing || !firebaseConfig || !cloudIdInput}
                        className="bg-white dark:bg-slate-700 text-ink dark:text-white px-4 rounded-lg font-bold text-xs shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Config Toggle */}
              <div className="text-center">
                <button onClick={() => setShowConfigEdit(!showConfigEdit)} className="text-xs font-bold text-gray-400 hover:text-japan-blue flex items-center justify-center gap-1 mx-auto transition-colors">
                  <Save size={12} /> {showConfigEdit ? 'Hide Config' : 'Edit Firebase Config'}
                </button>
                {showConfigEdit && (
                  <div className="mt-4 animate-in slide-in-from-top-2">
                    <textarea
                      value={configInput}
                      onChange={e => setConfigInput(e.target.value)}
                      className="w-full h-32 p-3 text-[10px] font-mono bg-gray-900 text-white rounded-xl resize-none outline-none border-2 border-transparent focus:border-japan-blue"
                      placeholder="Paste Firebase Config JSON here..."
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleSaveConfig} className="text-xs bg-japan-blue text-white px-3 py-1.5 rounded-lg font-bold">Save Config</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- BACKUP TAB --- */}
          {activeTab === 'backup' && (
            <div className="space-y-6 pt-6 px-1 fade-in slide-in-from-bottom-4 duration-500">

              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl flex items-center justify-center mx-auto text-orange-500 dark:text-orange-400 shadow-sm rotate-3">
                  <FileJson size={32} />
                </div>
                <h4 className="font-bold text-lg text-ink dark:text-white">Backup & Restore</h4>
                <p className="text-xs text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                  Your data is stored locally. Please backup regularly to prevent data loss.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDownloadFile}
                  className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-[4rem] transition-colors" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                      <FileJson size={20} />
                    </div>
                    <h5 className="font-bold text-ink dark:text-white text-sm">Export File</h5>
                    <p className="text-[10px] text-gray-400 mt-1">Download JSON file</p>
                  </div>
                </button>

                <button
                  onClick={handleCopyCode}
                  className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="absolute right-0 top-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-bl-[4rem] transition-colors" />
                  <div className="relative z-10">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </div>
                    <h5 className="font-bold text-ink dark:text-white text-sm">Copy Code</h5>
                    <p className="text-[10px] text-gray-400 mt-1">Copy raw data string</p>
                  </div>
                </button>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="h-px bg-gray-100 dark:bg-slate-800 flex-1" />
                  <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Restore from Backup</span>
                  <span className="h-px bg-gray-100 dark:bg-slate-800 flex-1" />
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <button
                    onClick={triggerFileUpload}
                    className="w-full py-3 bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl text-gray-500 hover:text-japan-blue hover:border-japan-blue transition-colors flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    <Upload size={14} /> Select Backup File (.json)
                  </button>
                  <input
                    type="file"
                    accept=".json,application/json"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center gap-2">
                    <div className="text-gray-400"><Copy size={14} /></div>
                    <input
                      value={importCode}
                      onChange={e => setImportCode(e.target.value)}
                      className="bg-transparent text-xs font-mono w-full outline-none dark:text-white placeholder-gray-400"
                      placeholder="Or paste code here..."
                    />
                  </div>
                  <button
                    onClick={handleImportCode}
                    disabled={!importCode}
                    className="bg-gray-900 dark:bg-slate-700 text-white px-4 rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black transition-colors"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelToolbox;