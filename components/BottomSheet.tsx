import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            // Small delay to allow render before animating in
            setTimeout(() => setIsVisible(true), 10);
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
            // Wait for animation to finish before unmounting
            setTimeout(() => setIsRendered(false), 300);
        }
    }, [isOpen]);

    if (!isRendered) return null;

    return (
        <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={`fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out transform ${isVisible ? 'translate-y-0' : 'translate-y-full'} dark:bg-slate-900 border-t border-white/20`}
            >
                {/* Drag Handle / Header */}
                <div className="flex-shrink-0 pt-3 pb-2 flex flex-col items-center justify-center relative touch-none" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2 dark:bg-slate-700" />
                </div>

                {/* Close Button (Absolute) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-400"
                >
                    <X size={16} />
                </button>

                {/* Content - Scrollable Area */}
                {/* pb-[env(safe-area-inset-bottom)] ensures content isn't covered by home indicator */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BottomSheet;
