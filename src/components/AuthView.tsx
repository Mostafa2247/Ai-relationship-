import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { HeartHandshake, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const { uiLang } = useTheme();

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isAr = uiLang === 'ar';

  const resetState = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleGoogleSignIn = async () => {
    resetState();
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        isAr
          ? 'تعذر تسجيل الدخول بواسطة Google. يرجى التأكد من السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.'
          : 'Google sign-in failed. Please ensure popups are allowed and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    if (!email) {
      setErrorMsg(isAr ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        if (!password) {
          setErrorMsg(isAr ? 'يرجى إدخال كلمة المرور.' : 'Please enter your password.');
          setLoading(false);
          return;
        }
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          setErrorMsg(isAr ? 'يجب ألا تقل كلمة المرور عن 6 أحرف.' : 'Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, displayName);
      } else if (mode === 'reset') {
        await sendPasswordReset(email);
        setSuccessMsg(
          isAr
            ? 'تم إرسال رابط إعادة ضبط كلمة المرور إلى بريدك الإلكتروني.'
            : 'Password reset link sent to your email.'
        );
      }
    } catch (err: any) {
      console.error(err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setErrorMsg(isAr ? 'بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.' : 'Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg(isAr ? 'هذا البريد الإلكتروني مسجل بالفعل.' : 'Email is already registered.');
      } else if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          isAr
            ? 'تسجيل الدخول بالبريد الإلكتروني يتطلب تفعيله من لوحة تحكم Firebase. يمكنك استخدام زر الدخول السريع عبر Google المتاح حالياً.'
            : 'Email/password is not enabled in Firebase Console. Please use Google Sign-in.'
        );
      } else {
        setErrorMsg(err?.message || (isAr ? 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.' : 'An unexpected error occurred.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-6 sm:p-8 transition-colors">
        {/* Brand Icon & Welcome */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/25 mb-4">
            <HeartHandshake className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            {isAr ? 'رفيق العلاقات' : 'Relationship Companion'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
            {isAr
              ? 'مساحتك الخاصة والآمنة لفهم المواقف، قراءة أنماط التواصل، واتخاذ قرارات متزنة وقائمة على الأدلة.'
              : 'Your secure space to understand relationship dynamics, evaluate patterns, and make evidence-based decisions.'}
          </p>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-700/70 transition shadow-xs focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isAr ? 'المتابعة باستخدام Google' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200 dark:border-stone-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-stone-900 px-3 text-stone-400 dark:text-stone-500">
              {isAr ? 'أو عبر البريد الإلكتروني' : 'or with email'}
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              resetState();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'login'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              resetState();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              mode === 'signup'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {isAr ? 'حساب جديد' : 'Sign Up'}
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                {isAr ? 'اسمك أو الاسم المستعار' : 'Your Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-stone-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isAr ? 'مثال: أحمد، سارة...' : 'e.g. Alex'}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
              {isAr ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      resetState();
                    }}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-medium text-xs shadow-md shadow-rose-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
            ) : mode === 'signup' ? (
              <span>{isAr ? 'إنشاء الحساب' : 'Create Account'}</span>
            ) : (
              <span>{isAr ? 'إرسال رابط الاستعادة' : 'Send Reset Link'}</span>
            )}
          </button>
        </form>

        {mode === 'reset' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                resetState();
              }}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
            >
              {isAr ? '← العودة لتسجيل الدخول' : '← Back to Sign In'}
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800/80 text-center">
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            {isAr
              ? 'محادثاتك وسجلات علاقاتك محمية ومحفوظة لحسابك فقط وفق قواعد خصوصية صارمة.'
              : 'Your relationship logs are private and securely isolated to your account only.'}
          </p>
        </div>
      </div>
    </div>
  );
};
