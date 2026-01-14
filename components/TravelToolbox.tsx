import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Wallet, CheckSquare, Plus, Trash2, RefreshCw, TrendingUp, Coins, Cloud, FileJson, ChevronDown, ChevronRight, FolderPlus, Pencil, Save, Upload, Copy, Check, AlertTriangle, Sparkles, GripVertical } from 'lucide-react';
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag state for checklist categories
  const [activeChecklistCategoryId, setActiveChecklistCategoryId] = useState<string | null>(null);

  // Drag state for checklist items - stores {categoryId, itemId}
  const [activeChecklistItemId, setActiveChecklistItemId] = useState<{ categoryId: string, itemId: string } | null>(null);

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
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
      {/* Fixed height container to prevent jumping */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden">


        {/* Header - Washi Style */}
        <div className="relative bg-gradient-to-br from-paper-light to-paper bg-paper border-b-2 border-japan-blue/20 px-6 py-5 overflow-hidden">
          {/* Subtle Decorative Background */}
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-japan-blue/5 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-kiniro/10 rounded-full blur-2xl" />

          {/* Content */}
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl text-japan-blue-700 dark:text-japan-blue-300 tracking-wide flex items-center gap-2.5">
                <Wallet size={22} className="text-kiniro" />
                旅遊工具箱
              </h3>
              <p className="text-ink-lighter dark:text-ink-light text-xs mt-0.5 font-sans tracking-wider">
                Travel Essentials
              </p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-japan-blue/10 dark:hover:bg-japan-blue-700/20 p-2 rounded-full transition-colors text-ink-light hover:text-japan-blue-600 dark:text-ink-lighter dark:hover:text-japan-blue-400"
            >
              <X size={20} />
            </button>
          </div>
        </div>


        {/* Tabs - Refined Design */}
        <div className="flex border-b border-japan-blue/10 dark:border-slate-700 overflow-x-auto no-scrollbar bg-paper-light/50 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex-1 min-w-[80px] py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'expense'
              ? 'text-japan-blue-700 dark:text-japan-blue-300'
              : 'text-ink-lighter hover:text-japan-blue-500 hover:bg-japan-blue/5 dark:text-slate-400 dark:hover:text-japan-blue-400'
              }`}
          >
            <Coins size={16} /> <span className="hidden sm:inline">記帳</span>
            {activeTab === 'expense' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-japan-blue-600 to-transparent dark:via-japan-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('currency')}
            className={`flex-1 min-w-[80px] py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'currency'
              ? 'text-japan-blue-700 dark:text-japan-blue-300'
              : 'text-ink-lighter hover:text-japan-blue-500 hover:bg-japan-blue/5 dark:text-slate-400 dark:hover:text-japan-blue-400'
              }`}
          >
            <RefreshCw size={16} /> <span className="hidden sm:inline">匯率</span>
            {activeTab === 'currency' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-japan-blue-600 to-transparent dark:via-japan-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 min-w-[80px] py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'checklist'
              ? 'text-japan-blue-700 dark:text-japan-blue-300'
              : 'text-ink-lighter hover:text-japan-blue-500 hover:bg-japan-blue/5 dark:text-slate-400 dark:hover:text-japan-blue-400'
              }`}
          >
            <CheckSquare size={16} /> <span className="hidden sm:inline">清單</span>
            {activeTab === 'checklist' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-japan-blue-600 to-transparent dark:via-japan-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 min-w-[80px] py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'cloud'
              ? 'text-japan-blue-700 dark:text-japan-blue-300'
              : 'text-ink-lighter hover:text-japan-blue-500 hover:bg-japan-blue/5 dark:text-slate-400 dark:hover:text-japan-blue-400'
              }`}
          >
            <Cloud size={16} /> <span className="hidden sm:inline">雲端</span>
            {activeTab === 'cloud' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-japan-blue-600 to-transparent dark:via-japan-blue-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex-1 min-w-[80px] py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'backup'
              ? 'text-japan-blue-700 dark:text-japan-blue-300'
              : 'text-ink-lighter hover:text-japan-blue-500 hover:bg-japan-blue/5 dark:text-slate-400 dark:hover:text-japan-blue-400'
              }`}
          >
            <Copy size={16} /> <span className="hidden sm:inline">備份</span>
            {activeTab === 'backup' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-japan-blue-600 to-transparent dark:via-japan-blue-400" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-paper dark:bg-slate-950">

          {/* --- EXPENSE TAB --- */}
          {activeTab === 'expense' && (
            <div className="space-y-4 pb-20">

              {/* 1. Budget Settings - Glassmorphism Card */}
              <div className="relative overflow-hidden bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 p-5 rounded-2xl border border-japan-blue/10 dark:border-slate-800 shadow-lg shadow-japan-blue/5">
                {/* Subtle Decorative Background */}
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-japan-blue/5 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-ink-lighter dark:text-slate-400 uppercase tracking-widest">Total Budget</span>
                    {isEditingBudget ? (
                      <button onClick={handleSaveBudget} className="text-japan-blue-600 bg-japan-blue-50 dark:bg-japan-blue-900/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-japan-blue-100 dark:hover:bg-japan-blue-900/50 transition-colors">儲存</button>
                    ) : (
                      <button onClick={() => setIsEditingBudget(true)} className="text-ink-lighter hover:text-japan-blue-600 dark:text-slate-400 dark:hover:text-japan-blue-400 transition-colors"><Pencil size={14} /></button>
                    )}
                  </div>

                  {isEditingBudget ? (
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={e => setBudgetInput(e.target.value)}
                      className="w-full text-2xl font-mono font-bold border-b-2 border-japan-blue-600 dark:border-japan-blue-400 outline-none bg-transparent dark:text-white"
                      autoFocus
                    />
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-mono font-bold text-ink dark:text-white">
                          ¥{(tripSettings.budgetJPY || 0).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-ink-lighter dark:text-slate-400 font-mono">({toTWD(tripSettings.budgetJPY || 0)})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Visual Chart - Glassmorphism Card */}
              <div className="relative overflow-hidden bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 p-5 rounded-2xl border border-japan-blue/10 dark:border-slate-800 shadow-lg shadow-japan-blue/5 space-y-3">
                {/* Subtle Decorative Background */}
                <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-kiniro/10 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-ink-lighter dark:text-slate-400">已支出</p>
                      <p className="text-xl font-mono font-bold text-japan-blue-700 dark:text-japan-blue-300">¥{totalJPY.toLocaleString()}</p>
                      <p className="text-[10px] text-ink-lighter dark:text-slate-400 font-mono">{toTWD(totalJPY)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-ink-lighter dark:text-slate-400">剩餘</p>
                      <p className={`text-xl font-mono font-bold ${remaining < 0 ? 'text-japan-red-500 dark:text-japan-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        ¥{remaining.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-ink-lighter dark:text-slate-400 font-mono">{toTWD(remaining)}</p>
                    </div>
                  </div>

                  {/* Stacked Bar */}
                  <div className="h-4 w-full bg-paper-dark/50 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    {totalJPY > 0 && Object.entries(categoryStats).map(([cat, amount]) => {
                      if (amount === 0) return null;
                      const pct = ((amount as number) / totalJPY) * 100;
                      const colorClass = EXPENSE_CATEGORIES[cat]?.bg || 'bg-gray-400';
                      return (
                        <div key={cat} style={{ width: `${pct}%` }} className={`h-full ${colorClass}`} title={`${cat}: ¥${amount}`} />
                      );
                    })}
                  </div>

                  {/* Breakdown Legend */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Object.entries(categoryStats).map(([cat, amount]) => {
                      if (amount === 0) return null;
                      const conf = EXPENSE_CATEGORIES[cat] || { label: cat, bg: 'bg-gray-400', color: '#9ca3af' };
                      return (
                        <div key={cat} className="flex items-center gap-1.5 text-xs bg-paper-light/80 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-japan-blue/5 dark:border-slate-700">
                          <div className={`w-2.5 h-2.5 rounded-full ${conf.bg}`} />
                          <span className="text-ink dark:text-slate-300 font-bold">{conf.label}</span>
                          <span className="font-mono text-ink-lighter dark:text-slate-400">¥{amount.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Action Header */}
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-gray-400 uppercase">新增記帳</span>
                {expenses.length > 0 && (
                  <button
                    onClick={handleClearExpensesWithConfirm}
                    className="text-xs font-bold text-red-400 hover:text-red-500 flex items-center gap-1 bg-red-50 dark:bg-slate-800 px-2 py-1 rounded-md"
                  >
                    <Trash2 size={12} /> 清空
                  </button>
                )}
              </div>

              {/* 4. Add Expense Input - Enhanced Card */}
              <div className="relative overflow-hidden bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 p-4 rounded-2xl border border-japan-blue/10 dark:border-slate-800 shadow-lg shadow-japan-blue/5 flex flex-wrap gap-3 items-end">
                {/* Subtle decorative element */}
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-japan-blue/5 rounded-full blur-xl" />
                <div className="flex-1 min-w-[140px] relative z-10">
                  <label className="text-[10px] font-bold text-ink-lighter dark:text-slate-400 uppercase tracking-wider block mb-1.5">項目名稱</label>
                  <input
                    type="text"
                    placeholder="例如：一蘭拉麵"
                    value={newExpTitle}
                    onChange={e => setNewExpTitle(e.target.value)}
                    className="w-full text-sm font-bold border-b-2 border-japan-blue/20 dark:border-slate-700 focus:border-japan-blue-600 dark:focus:border-japan-blue-400 outline-none py-2 mb-3 bg-transparent dark:text-white placeholder-ink-lighter/40 dark:placeholder-slate-500 transition-colors"
                  />
                  <label className="text-[10px] font-bold text-ink-lighter dark:text-slate-400 uppercase tracking-wider block mb-1.5">金額 (日圓)</label>
                  <input
                    type="number"
                    placeholder="1000"
                    value={newExpAmount}
                    onChange={e => setNewExpAmount(e.target.value)}
                    className="w-full text-base font-mono font-bold border-b-2 border-japan-blue/20 dark:border-slate-700 focus:border-kiniro dark:focus:border-kiniro outline-none py-2 bg-transparent dark:text-white placeholder-ink-lighter/40 dark:placeholder-slate-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3 w-full sm:w-auto relative z-10">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-ink-lighter dark:text-slate-400 uppercase tracking-wider block mb-1.5">類別</label>
                    <select
                      value={newExpCat}
                      onChange={(e: any) => setNewExpCat(e.target.value)}
                      className="w-full text-sm font-bold bg-paper-light dark:bg-slate-800 dark:text-white rounded-lg px-3 py-3 border border-japan-blue/10 dark:border-slate-700 outline-none focus:border-japan-blue-600 dark:focus:border-japan-blue-400 transition-colors cursor-pointer"
                    >
                      <option value="food">🍜 美食</option>
                      <option value="shopping">🛍️ 購物</option>
                      <option value="transport">🚇 交通</option>
                      <option value="hotel">🏨 住宿</option>
                      <option value="other">⭐ 其他</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddExpense}
                    className="relative overflow-hidden group bg-gradient-to-r from-japan-blue-600 to-japan-blue-700 hover:from-japan-blue-700 hover:to-japan-blue-800 dark:from-japan-blue-500 dark:to-japan-blue-600 dark:hover:from-japan-blue-600 dark:hover:to-japan-blue-700 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 flex-shrink-0"
                  >
                    {/* Subtle shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Plus size={22} className="relative z-10" />
                  </button>
                </div>
              </div>

              {/* 5. Expense List - Enhanced */}
              <div className="space-y-3">
                {expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-japan-blue/5 flex items-center justify-center">
                      <Coins size={28} className="text-ink-lighter/30" />
                    </div>
                    <p className="text-ink-lighter dark:text-slate-400 text-sm font-serif">還沒有記帳紀錄</p>
                    <p className="text-ink-lighter/60 dark:text-slate-500 text-xs mt-1">開始記錄您的旅遊花費</p>
                  </div>
                ) : (
                  expenses.map((item, index) => {
                    const categoryConf = EXPENSE_CATEGORIES[item.category] || EXPENSE_CATEGORIES['other'];
                    return (
                      <div
                        key={item.id}
                        className="relative overflow-hidden flex items-center justify-between bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 p-4 rounded-xl border border-japan-blue/10 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Subtle decorative background */}
                        <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ backgroundColor: categoryConf.color }} />

                        <div className="flex items-center gap-3.5 flex-1 min-w-0 relative z-10">
                          {/* Category Badge - Enhanced */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0 ${categoryConf.bg} bg-opacity-90`}>
                            <span className="text-white drop-shadow">
                              {item.category === 'food' ? '🍜' :
                                item.category === 'shopping' ? '🛍️' :
                                  item.category === 'transport' ? '🚇' :
                                    item.category === 'hotel' ? '🏨' : '⭐'}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-ink dark:text-white text-base truncate leading-tight">{item.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-ink-lighter dark:text-slate-400 font-medium">{item.date}</span>
                              <span className="text-ink-lighter/40">•</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: categoryConf.color }}>
                                {categoryConf.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0 relative z-10">
                          <div className="text-right">
                            <span className="font-mono font-bold text-lg text-japan-blue-700 dark:text-japan-blue-300">¥{item.amountJPY.toLocaleString()}</span>
                            <p className="text-[9px] text-ink-lighter dark:text-slate-400 font-mono mt-0.5">{toTWD(item.amountJPY)}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteExpense(item.id)}
                            className="p-2 rounded-lg text-ink-lighter/40 hover:text-japan-red-500 hover:bg-japan-red-50 dark:hover:bg-japan-red-900/20 transition-colors"
                          >
                            <Trash2 size={16} />
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
            <div className="space-y-6 pt-4">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Current Rate (JPY/TWD)</p>
                <div className="flex items-center justify-center gap-2 text-japan-blue dark:text-sky-400">
                  <TrendingUp size={20} />
                  <span className="text-4xl font-mono font-bold">{rate}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {loadingRate ? 'Updating...' : `Updated: ${lastUpdated}`}
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl space-y-4 border border-gray-100 dark:border-slate-800">
                {/* JPY Input */}
                <div className="relative">
                  <label className="text-xs font-bold text-gray-400 absolute left-3 top-2">JPY 日幣</label>
                  <input
                    type="number"
                    value={jpyInput}
                    onChange={e => handleJpyChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-3 pt-6 rounded-xl border border-gray-200 dark:border-slate-700 text-2xl font-mono font-bold text-ink dark:text-white focus:ring-2 focus:ring-japan-blue dark:focus:ring-sky-500 outline-none"
                  />
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-1.5 shadow-sm text-gray-400">
                    <RefreshCw size={16} />
                  </div>
                </div>

                {/* TWD Input */}
                <div className="relative">
                  <label className="text-xs font-bold text-gray-400 absolute left-3 top-2">TWD 台幣 (約)</label>
                  <input
                    type="number"
                    value={twdInput}
                    onChange={e => handleTwdChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 p-3 pt-6 rounded-xl border border-gray-200 dark:border-slate-700 text-2xl font-mono font-bold text-ink dark:text-white focus:ring-2 focus:ring-japan-blue dark:focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* --- CHECKLIST TAB (Categorized) --- */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 pb-20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink dark:text-white">檢查清單</h4>
                  <span className="text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-1 rounded-full">
                    {checklist.reduce((acc, cat) => acc + (cat.items?.filter(i => i.checked).length || 0), 0)} / {checklist.reduce((acc, cat) => acc + (cat.items?.length || 0), 0)}
                  </span>
                </div>
                <button
                  onClick={handleResetChecklistWithConfirm}
                  className="text-xs font-bold text-gray-400 hover:text-japan-blue flex items-center gap-1"
                >
                  <RefreshCw size={12} /> 重置
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
                  <div className="space-y-4">
                    {checklist.map(cat => {
                      const total = cat.items?.length || 0;
                      const checkedCount = cat.items?.filter(i => i.checked).length || 0;
                      const progress = total > 0 ? (checkedCount / total) * 100 : 0;
                      const isEditingTitle = editingCatId === cat.id;

                      return (
                        <SortableChecklistCategory key={cat.id} category={cat}>
                          {(dragListeners) => (
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                              {/* Cat Header */}
                              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 transition-colors select-none">
                                <div
                                  onClick={() => toggleCategoryCollapse(cat.id)}
                                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors -m-3 p-3 rounded-l-xl"
                                >
                                  {cat.isCollapsed ? <ChevronRight size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}

                                  {isEditingTitle ? (
                                    <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                      <div className="flex-1 min-w-0">
                                        <input
                                          type="text"
                                          value={editingTitle}
                                          onChange={e => setEditingTitle(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveTitle(cat.id);
                                          }}
                                          className="text-sm font-bold p-1 border border-japan-blue rounded outline-none w-full bg-white dark:bg-slate-900 dark:text-white min-w-0"
                                          autoFocus
                                        />
                                      </div>
                                      <button
                                        onClick={() => handleSaveTitle(cat.id)}
                                        className="p-1.5 bg-blue-50 text-japan-blue rounded hover:bg-japan-blue hover:text-white transition-colors flex-shrink-0"
                                      >
                                        <Save size={16} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 group/title min-w-0">
                                      <span className="font-bold text-sm text-ink dark:text-white truncate">{cat.title}</span>
                                      <button
                                        onClick={(e) => handleStartEditTitle(cat, e)}
                                        className="text-gray-300 hover:text-japan-blue p-1 opacity-0 group-hover/title:opacity-100 transition-opacity flex-shrink-0"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <span className="text-xs text-gray-400 font-mono flex-shrink-0">({checkedCount}/{total})</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategoryWithConfirm(cat.id); }}
                                    className="text-gray-300 hover:text-red-400 p-1 flex-shrink-0"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  <div
                                    {...dragListeners}
                                    className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 touch-none flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <GripVertical size={14} />
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="h-1 bg-gray-100 dark:bg-slate-800 w-full">
                                <div className="h-full bg-japan-blue dark:bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                              </div>

                              {/* Cat Items */}
                              {!cat.isCollapsed && (
                                <div className="p-3 space-y-2">
                                  <DndContext
                                    sensors={checklistSensors}
                                    collisionDetection={closestCenter}
                                    onDragStart={handleItemDragStart(cat.id)}
                                    onDragEnd={handleItemDragEnd(cat.id)}
                                  >
                                    <SortableContext items={(cat.items || []).map(item => item.id)} strategy={verticalListSortingStrategy}>
                                      {(cat.items || []).map(item => {
                                        const isEditingItem = editingItemId === item.id;

                                        return (
                                          <SortableChecklistItem key={item.id} item={item} categoryId={cat.id}>
                                            {(dragListeners, isDragging) => (
                                              <div className={`flex items-center justify-between group rounded-lg transition-all ${isDragging ? 'bg-gray-50 dark:bg-slate-800' : ''}`}>
                                                {isEditingItem ? (
                                                  // Edit Mode
                                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <input
                                                      type="text"
                                                      value={editingItemText}
                                                      onChange={e => setEditingItemText(e.target.value)}
                                                      onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSaveItem(cat.id, item.id);
                                                        if (e.key === 'Escape') handleCancelEditItem();
                                                      }}
                                                      className="flex-1 text-sm font-bold p-1 border border-japan-blue rounded outline-none bg-white dark:bg-slate-900 dark:text-white min-w-0"
                                                      autoFocus
                                                    />
                                                    <button
                                                      onClick={() => handleSaveItem(cat.id, item.id)}
                                                      className="p-1.5 bg-blue-50 text-japan-blue rounded hover:bg-japan-blue hover:text-white transition-colors flex-shrink-0"
                                                    >
                                                      <Check size={14} />
                                                    </button>
                                                    <button
                                                      onClick={handleCancelEditItem}
                                                      className="p-1.5 bg-gray-50 text-gray-400 rounded hover:bg-gray-200 hover:text-gray-600 transition-colors flex-shrink-0"
                                                    >
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  // View Mode - Make entire row draggable
                                                  <>
                                                    <div
                                                      {...dragListeners}
                                                      className="flex items-center gap-3 min-w-0 flex-1 cursor-grab active:cursor-grabbing py-1.5 px-2 -mx-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800 touch-none"
                                                      onClick={() => handleToggleItem(cat.id, item.id)}
                                                    >
                                                      <div className={`
                                                            w-4 h-4 rounded border border-gray-300 dark:border-slate-600 flex items-center justify-center transition-colors flex-shrink-0
                                                            ${item.checked ? 'bg-japan-blue border-japan-blue dark:bg-sky-500 dark:border-sky-500 text-white' : 'bg-white dark:bg-slate-800'}
                                                         `}>
                                                        {item.checked && <Check size={10} />}
                                                      </div>
                                                      <span className={`text-sm truncate ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-slate-300'}`}>
                                                        {item.text}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); handleStartEditItem(cat.id, item.id, item.text); }}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-japan-blue transition-opacity p-1"
                                                      >
                                                        <Pencil size={14} />
                                                      </button>
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteItemWithConfirm(cat.id, item.id); }}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity p-1"
                                                      >
                                                        <X size={14} />
                                                      </button>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                          </SortableChecklistItem>
                                        );
                                      })}
                                    </SortableContext>
                                  </DndContext>

                                  {/* Add Item Input */}
                                  <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-800 flex items-center gap-2">
                                    <Plus size={14} className="text-gray-300 flex-shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="新增項目..."
                                      className="flex-1 text-xs bg-transparent outline-none py-1 min-w-0 dark:text-white placeholder-gray-400"
                                      value={newItemInputs[cat.id] || ''}
                                      onChange={(e) => handleAddItemInput(cat.id, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAddItemSubmit(cat.id);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleAddItemSubmit(cat.id)}
                                      className="p-1 rounded bg-blue-50 text-japan-blue hover:bg-japan-blue hover:text-white transition-colors flex-shrink-0 dark:bg-slate-800 dark:text-sky-400"
                                    >
                                      <Plus size={14} />
                                    </button>
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

                {/* Drag Overlay */}
                <DragOverlay>
                  {activeChecklistCategory ? (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl scale-105 rotate-2 opacity-90">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {activeChecklistCategory.isCollapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                          <span className="font-bold text-sm text-ink dark:text-white truncate">{activeChecklistCategory.title}</span>
                          <span className="text-xs text-gray-400 font-mono">
                            ({activeChecklistCategory.items?.filter(i => i.checked).length || 0}/{activeChecklistCategory.items?.length || 0})
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {/* Add Category Button */}
              {showNewCatInput ? (
                <div className="flex gap-2 items-center bg-gray-50 dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    placeholder="新分類名稱..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none focus:border-japan-blue min-w-0 dark:text-white"
                    autoFocus
                  />
                  <button onClick={handleAddCategory} className="text-japan-blue dark:text-sky-400 font-bold text-sm flex-shrink-0">新增</button>
                  <button onClick={() => setShowNewCatInput(false)} className="text-gray-400 flex-shrink-0"><X size={16} /></button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCatInput(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:border-japan-blue hover:text-japan-blue hover:bg-blue-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                >
                  <FolderPlus size={16} /> 新增分類
                </button>
              )}
            </div>
          )}


          {/* --- CLOUD SYNC TAB --- */}
          {activeTab === 'cloud' && (
            <div className="space-y-6 pt-2 pb-10">
              {/* Tutorial / Help Link */}
              <div className="bg-blue-50 dark:bg-sky-900/10 border border-blue-100 dark:border-sky-900/30 rounded-xl p-4 flex items-start gap-3">
                <div className="text-blue-500 mt-1 flex-shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="text-xs text-blue-700 dark:text-sky-400 leading-relaxed">
                  <p className="font-bold mb-1">如何使用雲端同步？</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>前往 <a href="https://console.firebase.google.com/" target="_blank" className="underline font-bold">Firebase 控制台</a> 建立專案。</li>
                    <li>開啟 **Firestore** 與 **Anonymous Auth**。</li>
                    <li>在專案設定中複製 **Config JSON** 貼到下方。</li>
                  </ol>
                </div>
              </div>

              {/* STORAGE INDICATOR */}
              {(() => {
                const totalData = { settings: tripSettings, itinerary: itineraryData, expenses, checklist };
                const sizeMB = calculateDataSizeMB(totalData);
                const percent = Math.min((sizeMB / STORAGE_LIMITS.CLOUD_MAX) * 100, 100);
                const isWarning = sizeMB > STORAGE_LIMITS.CLOUD_WARNING;

                return (
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-slate-400">目前資料大小</h4>
                      <span className={`text-xs font-mono font-bold ${isWarning ? 'text-orange-500' : 'text-japan-blue dark:text-sky-400'}`}>
                        {formatSize(sizeMB)} / {STORAGE_LIMITS.CLOUD_MAX}.0 MB
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isWarning ? 'bg-orange-500' : 'bg-japan-blue dark:bg-sky-500'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isWarning && (
                      <p className="text-[10px] text-orange-500 mt-2 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        接近雲端傳輸上限，建議移除部分照片以確保同步成功。
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Config Section */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-ink dark:text-white flex items-center gap-2">
                    <Save size={14} /> Firebase 設定
                  </h4>
                  <button
                    onClick={() => setShowConfigEdit(!showConfigEdit)}
                    className="text-xs font-bold text-japan-blue dark:text-sky-400"
                  >
                    {showConfigEdit ? '取消' : '修改設定'}
                  </button>
                </div>

                {showConfigEdit || !firebaseConfig ? (
                  <div className="space-y-3">
                    <textarea
                      value={configInput}
                      onChange={e => setConfigInput(e.target.value)}
                      placeholder='請貼上 Firebase Config JSON...'
                      className="w-full h-32 p-3 text-[10px] font-mono bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-japan-blue dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveConfig}
                        className="flex-1 py-2 bg-japan-blue text-white rounded-lg font-bold text-sm dark:bg-sky-600"
                      >
                        儲存設定
                      </button>
                      {firebaseConfig && (
                        <button
                          onClick={handleResetConfigWithConfirm}
                          className="px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="清除所有設定"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                      <span className="flex items-center gap-1"><Check size={14} /> 已連接專案: {firebaseConfig.projectId}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Section */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 text-center">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md text-japan-blue dark:text-sky-400">
                    <Cloud size={24} className={isSyncing ? "animate-bounce" : ""} />
                  </div>
                  <h4 className="font-bold text-ink dark:text-white mb-2">上傳至雲端</h4>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-4 px-4">
                    將目前的行程、記帳與清單上傳，並獲取一組 Cloud ID 分享給朋友。
                  </p>

                  {syncError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={14} />
                      <p className="text-[10px] text-red-600 dark:text-red-400 text-left leading-relaxed">
                        {syncError}
                      </p>
                    </div>
                  )}

                  {cloudId ? (
                    <div className="space-y-3">
                      <div className="bg-japan-blue/5 dark:bg-sky-400/5 p-3 rounded-xl border-2 border-dashed border-japan-blue/30 dark:border-sky-400/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">您的 Cloud ID</p>
                        <p className="text-3xl font-mono font-bold text-japan-blue dark:text-sky-400 tracking-widest">{cloudId}</p>
                      </div>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(cloudId);
                            alert("Cloud ID 已複製到剪貼簿！");
                          }}
                          className="text-xs font-bold text-japan-blue dark:text-sky-400 flex items-center justify-center gap-1 bg-blue-50 dark:bg-slate-800 px-3 py-2 rounded-lg"
                        >
                          <Copy size={12} /> 複製 ID
                        </button>
                        <button
                          onClick={handleUpdateCloud}
                          disabled={isSyncing}
                          className="text-xs font-bold text-white bg-japan-blue dark:bg-sky-600 hover:bg-japan-blue/90 dark:hover:bg-sky-500 flex items-center justify-center gap-1 px-3 py-2 rounded-lg shadow-sm transition-colors"
                        >
                          {isSyncing ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                          更新雲端資料
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleUploadCloud}
                      disabled={isSyncing || !firebaseConfig}
                      className="w-full py-3 bg-japan-blue text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 dark:bg-sky-600"
                    >
                      {isSyncing ? (syncStage || "同步中...") : "產生 Cloud ID 並上傳"}
                    </button>
                  )}
                </div>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] font-bold tracking-widest">或從雲端下載</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                </div>

                <div className="flex gap-2">
                  <input
                    value={cloudIdInput}
                    onChange={e => setCloudIdInput(e.target.value.toUpperCase())}
                    placeholder="輸入朋友的 Cloud ID..."
                    className="flex-1 p-3 text-sm font-mono border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:border-japan-blue dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    onClick={handleDownloadCloud}
                    disabled={isSyncing || !firebaseConfig || !cloudIdInput}
                    className="px-6 bg-gray-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="animate-spin" size={18} /> : "下載"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- BACKUP TAB --- */}
          {activeTab === 'backup' && (
            <div className="space-y-6 pt-2">
              {/* WARNING ALERT */}
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-4 flex items-start gap-3">
                <div className="text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-yellow-800 dark:text-yellow-400 text-sm mb-1">重要提示：請定期備份</h4>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500/80 leading-relaxed">
                    您的旅程資料目前僅儲存在這台裝置的瀏覽器中。
                    若清除瀏覽紀錄或遺失手機，資料可能會消失。
                    建議您定期點擊下方按鈕，將檔案下載保存或複製代碼傳給自己。
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 text-center">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-japan-blue dark:text-sky-400">
                  <Cloud size={24} />
                </div>
                <h4 className="font-bold text-ink dark:text-white mb-1">備份與分享行程</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed px-4">
                  將您的行程轉成代碼，或下載成小包裹檔案 (.json) 傳給朋友。
                </p>
              </div>

              {/* Export Section */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadFile}
                  className="flex flex-col items-center justify-center p-4 bg-japan-blue text-white rounded-xl shadow-md hover:bg-japan-blue/90 transition-all gap-2 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  <FileJson size={24} />
                  <div className="text-center">
                    <span className="block text-sm font-bold">下載檔案</span>
                    <span className="text-[10px] opacity-80">(推薦 LINE 分享)</span>
                  </div>
                </button>

                <button
                  onClick={handleCopyCode}
                  className={`
                     flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all gap-2
                     ${copied
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'border-japan-blue/30 text-japan-blue hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-slate-800'}
                   `}
                >
                  {copied ? <Check size={24} /> : <Copy size={24} />}
                  <div className="text-center">
                    <span className="block text-sm font-bold">{copied ? '已複製！' : '複製代碼'}</span>
                    <span className="text-[10px] opacity-70">(文字訊息)</span>
                  </div>
                </button>
              </div>

              {/* Import Section */}
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-gray-300 dark:text-slate-600 text-xs font-bold">OR IMPORT</span>
                <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
              </div>

              <div className="space-y-3 pb-8">
                <input
                  type="file"
                  accept=".json,application/json"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ opacity: 0, position: 'absolute', zIndex: -1, width: 0, height: 0 }}
                />

                <button
                  onClick={triggerFileUpload}
                  className="w-full py-3 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <Upload size={16} /> 選擇檔案 (.json) 匯入
                </button>

                <div className="flex gap-2">
                  <input
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="或貼上壓縮代碼..."
                    className="flex-1 p-3 text-sm font-mono border border-gray-200 dark:border-slate-800 rounded-xl outline-none focus:border-japan-blue dark:focus:border-sky-500 min-w-0 bg-transparent dark:text-white placeholder-gray-400"
                  />
                  <button
                    onClick={handleImportCode}
                    disabled={!importCode}
                    className="px-4 bg-gray-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-slate-600 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    讀取
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