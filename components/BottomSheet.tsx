import React, { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children, onNext, onPrev, hasNext, hasPrev }) => {
    const [isRendered, setIsRendered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setIsRendered(true);
            setTimeout(() => setIsVisible(true), 10);
            document.body.style.overflow = 'hidden';
            // Prevent bounce scroll on body
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            setTimeout(() => setIsRendered(false), 300);
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
        }
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStartX.current || !touchStartY.current) return;

        const diffX = e.changedTouches[0].clientX - touchStartX.current;
        const diffY = e.changedTouches[0].clientY - touchStartY.current;

        // Reset
        touchStartX.current = null;
        touchStartY.current = null;

        // Horizontal Swipe Detection (prevent vertical scroll interference)
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 50) {
            if (diffX < 0 && hasNext && onNext) {
                // Swipe Left -> Next Day
                onNext();
            } else if (diffX > 0 && hasPrev && onPrev) {
                // Swipe Right -> Prev Day
                onPrev();
            }
        }
    };

    if (!isRendered) return null;

    return (
        <div className="fixed inset-0 z-[100] lg:hidden">
            {/* Backdrop - Blocks touches to background */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 touch-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Sheet Container */}
            <div
                className={`fixed bottom-0 left-0 right-0 max-h-[92vh] h-[92vh] bg-white rounded-t-[2rem] shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${isVisible ? 'translate-y-0' : 'translate-y-full'} dark:bg-slate-900 border-t border-white/20`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header / Drag Handle */}
                <div
                    className="flex-shrink-0 pt-3 pb-2 flex items-center justify-center relative touch-none cursor-grab active:cursor-grabbing bg-white/50 backdrop-blur-md rounded-t-[2rem] dark:bg-slate-900/50 z-20"
                    onClick={onClose}
                >
                    <div className="w-16 h-1.5 bg-gray-300 rounded-full mb-2 dark:bg-slate-600" />
                </div>

                {/* Top Controls Overlay */}
                <div className="absolute top-4 left-4 right-4 z-50 flex justify-between pointer-events-none">
                    {/* Just a spacer or maybe a Back indicator later */}
                    <div className="pointer-events-auto">
                        {/* Optional: Add a dedicated Back button if X isn't enough? */}
                    </div>
                    <button
                        onClick={onClose}
                        className="pointer-events-auto p-2 bg-white/90 shadow-md backdrop-blur-sm rounded-full text-gray-500 hover:bg-gray-100 dark:bg-slate-800/90 dark:text-slate-300 border border-gray-100 dark:border-slate-700"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable Area with overscroll containment */}
                {/* Added overscroll-contain and touch-action manipulation */}
                <div
                    className="flex-1 overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)] overscroll-contain"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BottomSheet;
