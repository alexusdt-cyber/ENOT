import { useState, useEffect, useCallback, useId } from "react";
import { useLogin, useRegister } from "../lib/api";
import { Mail, Lock, User, AlertCircle, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { motion, AnimatePresence } from "framer-motion";
import raccoonPreloader from "@assets/favicon_1766262180866.png";

interface AuthPageProps {
  onSuccess: () => void;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    auth_date: number;
    hash: string;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

function isTelegramWebApp(): boolean {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return false;
    if (tg.initData && tg.initData.length > 0) return true;
    if (tg.initDataUnsafe?.user?.id) return true;
    return false;
  } catch {
    return false;
  }
}

const PremiumPreloader = ({ isDark }: { isDark: boolean }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Raccoon with Glow Animation */}
      <div className="relative">
        {/* Outer Glow Ring */}
        <motion.div
          className={`absolute inset-0 rounded-full ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-400/30'}`}
          style={{ transform: 'scale(1.4)' }}
          animate={{
            scale: [1.4, 1.6, 1.4],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Middle Glow Ring */}
        <motion.div
          className={`absolute inset-0 rounded-full ${isDark ? 'bg-purple-500/30' : 'bg-purple-400/40'}`}
          style={{ transform: 'scale(1.2)' }}
          animate={{
            scale: [1.2, 1.35, 1.2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        
        {/* Raccoon Image */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [0, 3, -3, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10"
        >
          <img 
            src={raccoonPreloader} 
            alt="Loading" 
            className="w-24 h-24 rounded-full shadow-2xl"
            style={{
              boxShadow: isDark 
                ? '0 0 40px rgba(99, 102, 241, 0.4), 0 0 80px rgba(139, 92, 246, 0.2)'
                : '0 0 40px rgba(99, 102, 241, 0.3), 0 0 60px rgba(139, 92, 246, 0.15)'
            }}
          />
        </motion.div>
        
        {/* Orbiting Sparkles */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <motion.div 
            className={`absolute -top-2 left-1/2 w-2 h-2 rounded-full ${isDark ? 'bg-cyan-400' : 'bg-cyan-500'}`}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <motion.div 
            className={`absolute top-1/2 -right-2 w-1.5 h-1.5 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'}`}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div 
            className={`absolute -bottom-1 left-1/4 w-1 h-1 rounded-full ${isDark ? 'bg-pink-400' : 'bg-pink-500'}`}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
          />
        </motion.div>
      </div>
      
      {/* Loading Text with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <motion.p 
          className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Авторизация через Telegram...
        </motion.p>
        
        {/* Animated Dots */}
        <div className="flex justify-center gap-1 mt-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`}
              animate={{
                y: [0, -8, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export function AuthPage({ onSuccess }: AuthPageProps) {
  const gradientId = useId();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [telegramLoading, setTelegramLoading] = useState(() => isTelegramWebApp());
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null);
  const [isTgWebApp, setIsTgWebApp] = useState(() => isTelegramWebApp());
  const [webAppAuthAttempted, setWebAppAuthAttempted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  useEffect(() => {
    const checkTelegramWebApp = () => {
      const isTg = isTelegramWebApp();
      if (isTg) {
        setIsTgWebApp(true);
        setTelegramLoading(true);
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.ready();
          window.Telegram.WebApp.expand();
        }
        return true;
      }
      return false;
    };

    if (!checkTelegramWebApp()) {
      const timer = setTimeout(checkTelegramWebApp, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (isTgWebApp && !webAppAuthAttempted) {
      const initData = window.Telegram?.WebApp?.initData;
      if (initData && initData.length > 0) {
        setWebAppAuthAttempted(true);
        setTelegramLoading(true);
        
        fetch("/api/auth/telegram/webapp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        })
          .then(async (response) => {
            const data = await response.json();
            if (response.ok) {
              onSuccess();
            } else {
              setError(data.error || "Ошибка авторизации через Telegram");
              setTelegramLoading(false);
            }
          })
          .catch(() => {
            setError("Ошибка авторизации через Telegram");
            setTelegramLoading(false);
          });
      } else {
        setError("Не удалось получить данные Telegram");
        setTelegramLoading(false);
      }
    }
  }, [isTgWebApp, webAppAuthAttempted, onSuccess]);

  useEffect(() => {
    if (!isTgWebApp) {
      fetch("/api/auth/telegram/config")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.botUsername) {
            setTelegramBotUsername(data.botUsername);
          }
        })
        .catch(() => {});
    }
  }, [isTgWebApp]);

  const handleTelegramAuth = useCallback(async (user: TelegramUser) => {
    setTelegramLoading(true);
    setError("");
    
    try {
      const response = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Ошибка авторизации через Telegram");
      }
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Ошибка авторизации через Telegram");
    } finally {
      setTelegramLoading(false);
    }
  }, [onSuccess]);

  useEffect(() => {
    window.onTelegramAuth = handleTelegramAuth;
    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  useEffect(() => {
    if (telegramBotUsername) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", telegramBotUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      
      const container = document.getElementById("telegram-login-container");
      if (container) {
        container.innerHTML = "";
        container.appendChild(script);
      }
      
      return () => {
        if (container) {
          container.innerHTML = "";
        }
      };
    }
  }, [telegramBotUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({ email, password, username });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  // Telegram WebApp Preloader Screen
  if (isTgWebApp) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-colors"
        style={{
          backgroundImage: `url('${isDark ? '/password-bg-pattern-dark.svg' : '/password-bg-pattern.svg'}')`,
          backgroundRepeat: 'repeat'
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`relative w-full max-w-md p-10 backdrop-blur-2xl rounded-3xl shadow-2xl border overflow-hidden ${
            isDark 
              ? 'bg-slate-900/80 border-slate-700/50 shadow-indigo-500/10' 
              : 'bg-white/80 border-white/50 shadow-indigo-500/20'
          }`}
        >
          {/* Aurora Background Effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
            <motion.div
              className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/20' : 'bg-indigo-400/30'}`}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl ${isDark ? 'bg-purple-600/20' : 'bg-purple-400/30'}`}
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
          </div>

          <div className="relative z-10 text-center">
            <motion.img 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              src={isDark ? "/assets/logo-dark.png" : "/assets/logo.png"}
              alt="eNote" 
              className="h-16 mx-auto mb-8"
            />
            
            <AnimatePresence mode="wait">
              {telegramLoading && !error ? (
                <PremiumPreloader isDark={isDark} />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-3 p-4 rounded-xl text-sm ${
                        isDark 
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}
                      data-testid="error-message"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center transition-colors p-4"
      style={{
        backgroundImage: `url('${isDark ? '/password-bg-pattern-dark.svg' : '/password-bg-pattern.svg'}')`,
        backgroundRepeat: 'repeat'
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${
          isDark 
            ? 'bg-slate-900/80 border border-slate-700/50 shadow-indigo-500/10' 
            : 'bg-white/80 border border-white/50 shadow-indigo-500/20'
        } backdrop-blur-2xl`}
      >
        {/* Aurora Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id={`${gradientId}-auth-aurora`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isDark ? "#6366f1" : "#818cf8"}>
                  <animate attributeName="stop-color" values={isDark ? "#6366f1;#a855f7;#6366f1" : "#818cf8;#c084fc;#818cf8"} dur="8s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor={isDark ? "#06b6d4" : "#22d3ee"}>
                  <animate attributeName="stop-color" values={isDark ? "#06b6d4;#8b5cf6;#06b6d4" : "#22d3ee;#a78bfa;#22d3ee"} dur="6s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            <motion.ellipse 
              rx="50%" ry="40%"
              fill={`url(#${gradientId}-auth-aurora)`}
              initial={{ cx: "70%", cy: "20%", opacity: 1 }}
              animate={{ 
                cx: ["70%", "30%", "70%"],
                cy: ["20%", "80%", "20%"],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 p-8">
          {/* Header with Logo */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <img 
              src={isDark ? "/assets/logo-dark.png" : "/assets/logo.png"}
              alt="eNote" 
              className="h-14 mx-auto mb-4"
            />
            <AnimatePresence mode="wait">
              <motion.p 
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`text-lg font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}
              >
                {mode === "login" ? "Добро пожаловать!" : "Создайте аккаунт"}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Mode Toggle - Premium Pills */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`flex p-1.5 rounded-2xl mb-6 ${isDark ? 'bg-slate-800/80' : 'bg-gray-100/80'}`}
          >
            {(["login", "register"] as const).map((m) => (
              <motion.button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`relative flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors ${
                  mode === m
                    ? 'text-white'
                    : isDark ? 'text-slate-400 hover:text-slate-300' : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`tab-${m}`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {m === "login" ? "Вход" : "Регистрация"}
                </span>
              </motion.button>
            ))}
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`relative group ${focusedField === 'username' ? 'ring-2 ring-indigo-500/50 rounded-xl' : ''}`}>
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                      focusedField === 'username' 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                        : isDark ? 'bg-slate-700' : 'bg-gray-100'
                    }`}>
                      <User className={`w-4 h-4 ${focusedField === 'username' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                    </div>
                    <input
                      type="text"
                      placeholder="Имя пользователя"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      className={`w-full pl-16 pr-4 py-4 rounded-xl border-2 focus:outline-none transition-all ${
                        isDark 
                          ? 'border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-500 focus:border-indigo-500/50' 
                          : 'border-gray-200 bg-white/60 text-gray-900 placeholder-gray-400 focus:border-indigo-400'
                      }`}
                      data-testid="input-username"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`relative group ${focusedField === 'email' ? 'ring-2 ring-indigo-500/50 rounded-xl' : ''}`}
            >
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                focusedField === 'email' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                  : isDark ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <Mail className={`w-4 h-4 ${focusedField === 'email' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`} />
              </div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                className={`w-full pl-16 pr-4 py-4 rounded-xl border-2 focus:outline-none transition-all ${
                  isDark 
                    ? 'border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-500 focus:border-indigo-500/50' 
                    : 'border-gray-200 bg-white/60 text-gray-900 placeholder-gray-400 focus:border-indigo-400'
                }`}
                data-testid="input-email"
              />
            </motion.div>

            {/* Password Field */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className={`relative group ${focusedField === 'password' ? 'ring-2 ring-indigo-500/50 rounded-xl' : ''}`}
            >
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                focusedField === 'password' 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
                  : isDark ? 'bg-slate-700' : 'bg-gray-100'
              }`}>
                <Lock className={`w-4 h-4 ${focusedField === 'password' ? 'text-white' : isDark ? 'text-slate-400' : 'text-gray-500'}`} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                minLength={6}
                className={`w-full pl-16 pr-12 py-4 rounded-xl border-2 focus:outline-none transition-all ${
                  isDark 
                    ? 'border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-500 focus:border-indigo-500/50' 
                    : 'border-gray-200 bg-white/60 text-gray-900 placeholder-gray-400 focus:border-indigo-400'
                }`}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={`flex items-center gap-3 p-4 rounded-xl text-sm ${
                    isDark 
                      ? 'bg-red-900/30 text-red-400 border border-red-500/30' 
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                  data-testid="error-message"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              style={{ backgroundSize: '200% 100%' }}
              data-testid="button-submit"
            >
              {/* Shimmer Effect */}
              <motion.div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                }}
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
              
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <>
                    {mode === "login" ? "Войти" : "Создать аккаунт"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          {/* Mode Toggle Link */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className={`text-sm transition-colors ${
                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}
              data-testid="button-toggle-mode"
            >
              {mode === "login"
                ? "Нет аккаунта? Зарегистрируйтесь"
                : "Уже есть аккаунт? Войдите"}
            </button>
          </motion.div>

          {/* Social Login Divider */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}></div>
              </div>
              <div className="relative flex justify-center">
                <span className={`px-4 text-sm ${isDark ? 'bg-slate-900/80 text-slate-500' : 'bg-white/80 text-gray-500'}`}>
                  Или продолжить через
                </span>
              </div>
            </div>

            {/* Google Button */}
            <motion.a
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              href="/api/auth/google"
              className={`mt-4 w-full py-3.5 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-3 ${
                isDark 
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-700/80 hover:border-slate-600' 
                  : 'border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300 hover:shadow-md'
              }`}
              style={{ textDecoration: 'none', color: '#4b5563' }}
              data-testid="button-google"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Продолжить с Google
            </motion.a>

            {/* Telegram Button */}
            {telegramBotUsername ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-3 flex justify-center"
              >
                {telegramLoading ? (
                  <div className={`py-3 px-6 rounded-xl border-2 font-medium flex items-center justify-center gap-2 ${
                    isDark ? 'border-slate-700 bg-slate-800/60 text-slate-200' : 'border-gray-200 bg-white/60 text-gray-600'
                  }`}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5" />
                    </motion.div>
                    Авторизация...
                  </div>
                ) : (
                  <div id="telegram-login-container"></div>
                )}
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                type="button"
                disabled
                className={`mt-3 w-full py-3.5 rounded-xl border-2 font-medium cursor-not-allowed flex items-center justify-center gap-3 ${
                  isDark 
                    ? 'border-slate-700/50 bg-slate-800/30 text-slate-600' 
                    : 'border-gray-200 bg-gray-100/50 text-gray-400'
                }`}
                data-testid="button-telegram-disabled"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram (не настроен)
              </motion.button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
