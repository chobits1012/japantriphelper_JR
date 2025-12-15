import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "確定",
  cancelText = "取消",
  isDangerous = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
        <div className="p-6 text-center">
          <div className={`mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-japan-blue'}`}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 font-serif">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800 transition-colors border-r border-gray-100 dark:border-slate-800"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-4 text-sm font-bold transition-colors ${
              isDangerous 
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                : 'text-japan-blue hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-slate-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;