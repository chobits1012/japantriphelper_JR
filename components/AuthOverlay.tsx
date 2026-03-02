import React, { useState } from 'react';
import { Mail, Lock, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface AuthOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose }) => {
    const { theme } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onClose();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            display_name: email.split('@')[0] // Default display name
                        }
                    }
                });
                if (error) throw error;

                // Show success message for email confirmation instead of closing
                setSuccessMessage('註冊成功！請前往您的信箱點擊確認信件，然後再回來登入。');
                setIsLogin(true); // Switch to login view so they can login after confirming
                setPassword(''); // Clear password for safety
            }
        } catch (err: any) {
            setError(err.message || '發生錯誤，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    const isComfort = theme === 'comfort';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`
        relative w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300
        ${isComfort ? 'bg-[#E5DDD0] text-[#1A1A1A]' : 'bg-slate-900 border border-white/10 text-white'}
      `}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className={`
            absolute top-6 right-6 p-2 rounded-full transition-colors
            ${isComfort ? 'hover:bg-[#1A1A1A]/10' : 'hover:bg-white/10'}
          `}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                        {isLogin ? '歡迎回來' : '建立新帳號'}
                    </h2>
                    <p className={`text-sm ${isComfort ? 'text-[#1A1A1A]/60' : 'text-white/60'}`}>
                        {isLogin ? '登入以同步您的所有旅程' : '註冊加入多人共編的行列'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2 items-start">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-500 leading-snug">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex gap-2 items-start">
                        <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-green-500 leading-snug">{successMessage}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isComfort ? 'text-[#1A1A1A]/60' : 'text-white/60'}`}>
                            電子郵件
                        </label>
                        <div className="relative">
                            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isComfort ? 'text-[#1A1A1A]/40' : 'text-white/40'}`} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`
                  w-full pl-11 pr-4 py-3 rounded-2xl outline-none transition-all
                  ${isComfort
                                        ? 'bg-white/50 focus:bg-white focus:ring-2 ring-[#1A1A1A]/20'
                                        : 'bg-white/5 focus:bg-white/10 border border-white/10 focus:border-white/30'}
                `}
                                placeholder="your@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className={`text-xs font-bold uppercase tracking-wider ${isComfort ? 'text-[#1A1A1A]/60' : 'text-white/60'}`}>
                            密碼
                        </label>
                        <div className="relative">
                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isComfort ? 'text-[#1A1A1A]/40' : 'text-white/40'}`} />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`
                  w-full pl-11 pr-4 py-3 rounded-2xl outline-none transition-all
                  ${isComfort
                                        ? 'bg-white/50 focus:bg-white focus:ring-2 ring-[#1A1A1A]/20'
                                        : 'bg-white/5 focus:bg-white/10 border border-white/10 focus:border-white/30'}
                `}
                                placeholder="至少 6 個字元"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`
              w-full mt-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
              ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
              ${isComfort
                                ? 'bg-[#1A1A1A] text-white'
                                : 'bg-japan-blue text-white'}
            `}
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                        {isLogin ? '登入帳號' : '註冊帳號'}
                    </button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError(null);
                        }}
                        className={`text-sm font-medium transition-colors ${isComfort ? 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]' : 'text-white/60 hover:text-white'}`}
                    >
                        {isLogin ? '還沒有帳號？點此註冊' : '已經有帳號了？點此登入'}
                    </button>
                </div>
            </div>
        </div>
    );
};
