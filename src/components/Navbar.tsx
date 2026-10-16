import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HeartHandshake,
  LogOut,
  Globe,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { Relationship } from '../types';

interface NavbarProps {
  activeRelationship?: Relationship | null;
  onBackToDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeRelationship, onBackToDashboard }) => {
  const { user, profile, signOut } = useAuth();
  const { uiLang, setUiLang, aiLang, setAiLang } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAiLangMenu, setShowAiLangMenu] = useState(false);

  const aiLangLabels = {
    ar_eg: 'اللهجة المصرية (الافتراضي)',
    ar_msa: 'العربية الفصحى',
    en: 'English',
  };

  // If in active relationship on mobile, we hide the main navbar so the relationship workspace can be true full screen!
  // On desktop (md and above), it stays visible as a clean top bar.
  return (
    <header className={`sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors ${activeRelationship ? 'hidden md:block' : 'block'}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand & Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-2 text-stone-900 dark:text-stone-100 hover:opacity-85 transition-opacity text-start focus:outline-none"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight block">
                {uiLang === 'ar' ? 'رفيق العلاقات' : 'Relationship Companion'}
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium hidden sm:block">
                {uiLang === 'ar' ? 'تحليل ذكي وقائم على الأدلة' : 'Evidence-Based Intelligence'}
              </span>
            </div>
          </button>

          {activeRelationship && (
            <div className="hidden sm:flex items-center gap-2 mr-2 pr-2 border-r border-stone-200 dark:border-stone-700 rtl:border-r-0 rtl:border-l rtl:mr-0 rtl:ml-2 rtl:pr-0 rtl:pl-2">
              <span className="text-xs text-stone-400 dark:text-stone-500">/</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium max-w-[150px] truncate">
                {activeRelationship.displayName}
              </span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* AI Response Language Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAiLangMenu(!showAiLangMenu);
                setShowUserMenu(false);
              }}
              title="لغة ردود الذكاء الاصطناعي"
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-medium text-[11px] sm:text-xs">
                {aiLang === 'ar_eg' ? 'مصري' : aiLang === 'ar_msa' ? 'فصحى' : 'EN'}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showAiLangMenu && (
              <div className="absolute end-0 mt-2 w-52 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl py-2 z-50 text-xs">
                <div className="px-3 py-1 text-stone-400 dark:text-stone-500 font-medium text-[11px]">
                  {uiLang === 'ar' ? 'لغة ردود الذكاء الاصطناعي:' : 'AI Language:'}
                </div>
                {(['ar_eg', 'ar_msa', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setAiLang(lang);
                      setShowAiLangMenu(false);
                    }}
                    className={`w-full text-start px-3 py-2 flex items-center justify-between hover:bg-stone-100 dark:hover:bg-stone-700/60 transition ${
                      aiLang === lang
                        ? 'text-rose-600 dark:text-rose-400 font-semibold bg-rose-50/50 dark:bg-rose-950/20'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <span>{aiLangLabels[lang]}</span>
                    {aiLang === lang && <span className="text-rose-500">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* UI Language Switcher */}
          <button
            onClick={() => setUiLang(uiLang === 'ar' ? 'en' : 'ar')}
            title="تبديل لغة الواجهة"
            className="flex items-center gap-1 p-1.5 sm:p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition text-xs font-medium"
          >
            <Globe className="w-4 h-4 text-stone-500" />
            <span className="text-[11px] font-bold">{uiLang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* User Profile / Menu */}
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowAiLangMenu(false);
                }}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-stone-200 dark:border-stone-700 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    {(profile?.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-3 h-3 text-stone-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute end-0 mt-2 w-52 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100 dark:border-stone-700/60">
                    <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                      {profile?.displayName || 'مستخدم'}
                    </p>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                    className="w-full text-start px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{uiLang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
