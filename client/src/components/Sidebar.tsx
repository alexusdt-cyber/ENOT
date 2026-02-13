import { useId, useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  FileText,
  CheckSquare,
  Target,
  Wallet,
  Map,
  FolderOpen,
  Link,
  Plus,
  Sparkles,
  LayoutGrid,
  Send,
  ArrowDownToLine,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  activeView: "home" | "notes" | "tasks" | "goals" | "files" | "roadmap" | "links" | "crypto" | "apps";
  onViewChange: (view: "home" | "notes" | "tasks" | "goals" | "files" | "roadmap" | "links" | "crypto" | "apps") => void;
  onCreateNote: () => void;
  isDark?: boolean;
}

const menuItems = [
  { icon: Home, label: "Главная", shortLabel: "Home", view: "home", color: "from-violet-500 to-purple-600", glow: "violet" },
  { icon: LayoutGrid, label: "Приложения", shortLabel: "Apps", view: "apps", color: "from-fuchsia-500 to-pink-500", glow: "fuchsia" },
  { icon: FileText, label: "Заметки", shortLabel: "Notes", view: "notes", color: "from-blue-500 to-cyan-500", glow: "cyan" },
  { icon: CheckSquare, label: "Задачи", shortLabel: "Tasks", view: "tasks", color: "from-emerald-500 to-teal-500", glow: "emerald" },
  { icon: Target, label: "Мои цели", shortLabel: "Goals", view: "goals", color: "from-amber-500 to-orange-500", glow: "amber" },
  { icon: Link, label: "Ссылки", shortLabel: "Links", view: "links", color: "from-pink-500 to-rose-500", glow: "pink" },
  { icon: Wallet, label: "Кошельки", shortLabel: "Wallets", view: "crypto", color: "from-green-500 to-emerald-500", glow: "green" },
  { icon: Map, label: "Дорожная карта", shortLabel: "Roadmap", view: "roadmap", color: "from-indigo-500 to-violet-500", glow: "indigo" },
  { icon: FolderOpen, label: "Файлы", shortLabel: "Files", view: "files", color: "from-sky-500 to-blue-500", glow: "sky" },
];

export function Sidebar({
  activeView,
  onViewChange,
  onCreateNote,
  isDark = false,
}: SidebarProps) {
  const gradientId = useId();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [rippleEffect, setRippleEffect] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  // Fetch user balances
  const { data: userBalances = [] } = useQuery<Array<{
    id: number;
    userId: string;
    balanceId: number;
    sum: string;
    statSum: string;
    status: number;
    balance: {
      id: number;
      name: string;
      status: number;
      rate: string;
    };
  }>>({
    queryKey: ["/api/balances"],
    queryFn: async () => {
      const res = await fetch("/api/balances", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  // Calculate ENOTE balance and USDT equivalent
  const { enoteBalance, usdtValue } = useMemo(() => {
    const enoteEntry = userBalances.find(ub => ub.balance.name === "ENOTE");
    if (!enoteEntry) {
      return { enoteBalance: "0.000000", usdtValue: "0.00" };
    }
    const sum = parseFloat(enoteEntry.sum) || 0;
    const rate = parseFloat(enoteEntry.balance.rate) || 0;
    return {
      enoteBalance: sum.toFixed(6),
      usdtValue: (sum * rate).toFixed(2),
    };
  }, [userBalances]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setWalletExpanded(false);
      }
    };
    if (walletExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [walletExpanded]);

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`w-72 h-full flex flex-col flex-shrink-0 relative overflow-hidden ${
        isDark 
          ? 'bg-slate-900/80 border-r border-slate-700/50' 
          : 'bg-white/40 backdrop-blur-2xl border-r border-gray-200/60'
      }`}
    >
      {/* Animated Aurora Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${gradientId}-aurora1`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#6366f1" : "#818cf8"}>
                <animate attributeName="stop-color" values={isDark ? "#6366f1;#8b5cf6;#6366f1" : "#818cf8;#a78bfa;#818cf8"} dur="8s" repeatCount="indefinite" />
              </stop>
              <stop offset="50%" stopColor={isDark ? "#0ea5e9" : "#38bdf8"}>
                <animate attributeName="stop-color" values={isDark ? "#0ea5e9;#06b6d4;#0ea5e9" : "#38bdf8;#22d3ee;#38bdf8"} dur="6s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor={isDark ? "#8b5cf6" : "#c4b5fd"}>
                <animate attributeName="stop-color" values={isDark ? "#8b5cf6;#6366f1;#8b5cf6" : "#c4b5fd;#818cf8;#c4b5fd"} dur="10s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
            <linearGradient id={`${gradientId}-aurora2`} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#06b6d4" : "#67e8f9"}>
                <animate attributeName="stop-color" values={isDark ? "#06b6d4;#0ea5e9;#06b6d4" : "#67e8f9;#38bdf8;#67e8f9"} dur="7s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor={isDark ? "#a855f7" : "#d8b4fe"}>
                <animate attributeName="stop-color" values={isDark ? "#a855f7;#8b5cf6;#a855f7" : "#d8b4fe;#c4b5fd;#d8b4fe"} dur="9s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <motion.ellipse 
            rx="60%" ry="40%"
            fill={`url(#${gradientId}-aurora1)`}
            initial={{ cx: "20%", cy: "30%", opacity: 0.2 }}
            animate={{ 
              cx: ["20%", "40%", "20%"],
              cy: ["30%", "50%", "30%"],
              opacity: [0.15, 0.25, 0.15]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.ellipse 
            rx="50%" ry="35%"
            fill={`url(#${gradientId}-aurora2)`}
            initial={{ cx: "80%", cy: "70%", opacity: 0.15 }}
            animate={{ 
              cx: ["80%", "60%", "80%"],
              cy: ["70%", "50%", "70%"],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* Glass Overlay */}
      <div className={`absolute inset-0 pointer-events-none ${
        isDark ? 'bg-gradient-to-b from-slate-900/50 to-slate-900/80' : 'bg-gradient-to-b from-white/20 to-white/40'
      }`} />

      {/* Create Note Button - Premium Floating Design */}
      <div className="relative z-10 p-5">
        <motion.button
          onClick={onCreateNote}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`group w-full relative overflow-hidden py-3.5 px-5 rounded-2xl font-semibold text-white shadow-xl transition-all duration-300 ${
            isDark 
              ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 shadow-indigo-500/30 hover:shadow-indigo-500/50' 
              : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 shadow-indigo-400/40 hover:shadow-indigo-500/60'
          }`}
          data-testid="button-new-note"
        >
          {/* Shimmer Effect */}
          <motion.div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
          
          <div className="relative flex items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <span className="tracking-wide">Новая заметка</span>
            <Plus className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* Premium Divider */}
      <div className="relative z-10 px-5">
        <div className={`h-px ${isDark ? 'bg-gradient-to-r from-transparent via-slate-600 to-transparent' : 'bg-gradient-to-r from-transparent via-gray-300 to-transparent'}`} />
      </div>

      {/* Navigation Menu - Floating Glass Dock Style */}
      <nav className="relative z-10 flex-1 py-4 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
        <div className="space-y-1.5">
          <AnimatePresence>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.view === activeView;
              const isHovered = hoveredItem === item.label;
              
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  onClick={() => item.view && onViewChange(item.view as any)}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  disabled={!item.view}
                  className={`group relative w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                    !item.view ? 'cursor-default' : 'cursor-pointer'
                  } ${
                    isActive
                      ? isDark 
                        ? 'bg-white/10 backdrop-blur-xl shadow-lg shadow-indigo-500/10' 
                        : 'bg-white/70 backdrop-blur-xl shadow-lg shadow-indigo-500/20'
                      : isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-white/50'
                  }`}
                  data-testid={`nav-${item.view || item.label.toLowerCase()}`}
                >
                  {/* Active Indicator - Luminous Left Border */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        exit={{ opacity: 0, scaleY: 0 }}
                        className={`absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b ${item.color}`}
                        style={{
                          boxShadow: isDark 
                            ? `0 0 12px 2px rgba(99, 102, 241, 0.4)` 
                            : `0 0 10px 1px rgba(99, 102, 241, 0.3)`,
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Hover Glow Effect */}
                  <AnimatePresence>
                    {isHovered && !isActive && item.view && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.color} opacity-5`}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon with Dynamic Glow */}
                  <motion.div
                    animate={{
                      scale: isHovered && item.view ? 1.1 : 1,
                      y: isHovered && item.view ? -1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={`relative flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                        : isDark
                          ? 'bg-slate-800/80 group-hover:bg-slate-700/80'
                          : 'bg-white/60 group-hover:bg-white/90 shadow-sm'
                    }`}
                    style={{
                      boxShadow: isActive 
                        ? isDark 
                          ? `0 4px 20px -4px rgba(99, 102, 241, 0.5)`
                          : `0 4px 16px -4px rgba(99, 102, 241, 0.4)`
                        : undefined
                    }}
                  >
                    <Icon className={`w-4.5 h-4.5 transition-colors duration-300 ${
                      isActive 
                        ? 'text-white' 
                        : isDark 
                          ? 'text-slate-400 group-hover:text-slate-200' 
                          : 'text-gray-600 group-hover:text-gray-900'
                    }`} />
                    
                    {/* Pulsing Dot for Active State */}
                    {isActive && (
                      <motion.div
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white"
                        animate={{
                          scale: [1, 1.2, 1],
                          opacity: [0.8, 1, 0.8],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  {/* Label */}
                  <div className="flex-1 text-left">
                    <motion.span
                      animate={{
                        x: isHovered && item.view ? 2 : 0,
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className={`block text-sm font-medium transition-colors duration-300 ${
                        isActive
                          ? isDark ? 'text-white' : 'text-gray-900'
                          : isDark 
                            ? 'text-slate-400 group-hover:text-slate-200' 
                            : 'text-gray-600 group-hover:text-gray-900'
                      }`}
                    >
                      {item.label}
                    </motion.span>
                  </div>

                  {/* Magnetic Lift Arrow on Hover */}
                  <AnimatePresence>
                    {isHovered && item.view && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className={`${isDark ? 'text-slate-400' : 'text-gray-400'}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </nav>

      {/* Premium Wallet Widget */}
      <div className="relative z-10 p-4" ref={walletRef}>
        <style>{`
          @keyframes pulse-ring-wallet {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.4); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
          @keyframes pulse-ring-wallet-2 {
            0% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.6); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
          @keyframes pulse-ring-wallet-3 {
            0% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.8); opacity: 0; }
            100% { transform: scale(1); opacity: 0; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%) rotate(25deg); }
            100% { transform: translateX(100%) rotate(25deg); }
          }
          @keyframes ripple-click {
            0% { transform: scale(0); opacity: 1; }
            100% { transform: scale(4); opacity: 0; }
          }
        `}</style>
        
        {/* FAB Action Buttons */}
        <AnimatePresence>
          {walletExpanded && (
            <div className="absolute left-0 right-0 bottom-[calc(100%+2px)] flex justify-center gap-6 pointer-events-none">
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0 }}
                className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/40' 
                    : 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-emerald-400/50'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setWalletExpanded(false); }}
                data-testid="fab-receive"
                title="Получить"
              >
                <ArrowDownToLine className="w-5 h-5 text-white" />
              </motion.button>
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.05 }}
                className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-xl ${
                  isDark 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40' 
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/50'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setWalletExpanded(false); }}
                data-testid="fab-send"
                title="Отправить"
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            scale: walletExpanded ? 1.02 : 1,
            y: walletExpanded ? -4 : 0
          }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 25 }}
          onClick={() => {
            setRippleEffect(true);
            setTimeout(() => setRippleEffect(false), 600);
            setWalletExpanded(!walletExpanded);
          }}
          className={`relative p-4 rounded-2xl backdrop-blur-xl cursor-pointer overflow-hidden transition-shadow duration-300 ${
            isDark 
              ? 'bg-gradient-to-br from-slate-800/90 via-emerald-900/40 to-slate-800/90 border border-emerald-500/30' 
              : 'bg-gradient-to-br from-white/90 via-emerald-50/60 to-white/90 border border-emerald-300/50'
          } ${walletExpanded ? (isDark ? 'shadow-lg shadow-emerald-500/20' : 'shadow-lg shadow-emerald-400/30') : ''}`}
          data-testid="button-wallet-toggle"
        >
          {/* Click ripple effect */}
          <AnimatePresence>
            {rippleEffect && (
              <motion.div
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 4, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full pointer-events-none ${
                  isDark ? 'bg-emerald-400/40' : 'bg-emerald-500/30'
                }`}
              />
            )}
          </AnimatePresence>
          
          {/* Shimmer effect */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              animation: 'shimmer 3s infinite',
            }}
          />
          
          <div className="flex items-center gap-3 relative z-10">
            {/* Premium Wallet Icon with Pulse Waves */}
            <div className="relative">
              {/* Pulse waves */}
              <div 
                className={`absolute inset-0 rounded-xl ${isDark ? 'bg-emerald-500/30' : 'bg-emerald-400/30'}`}
                style={{ animation: 'pulse-ring-wallet 2s ease-out infinite' }}
              />
              <div 
                className={`absolute inset-0 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-400/20'}`}
                style={{ animation: 'pulse-ring-wallet-2 2s ease-out infinite 0.3s' }}
              />
              <div 
                className={`absolute inset-0 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-400/10'}`}
                style={{ animation: 'pulse-ring-wallet-3 2s ease-out infinite 0.6s' }}
              />
              
              {/* Premium wallet icon container */}
              <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden ${
                isDark 
                  ? 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 shadow-lg shadow-emerald-500/40' 
                  : 'bg-gradient-to-br from-emerald-400 via-green-400 to-teal-500 shadow-lg shadow-emerald-400/50'
              }`}>
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 pointer-events-none" />
                <Wallet className="w-5 h-5 text-white drop-shadow-md relative z-10" strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {enoteBalance} <span className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>ENOTE</span>
              </p>
              <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                ≈ {usdtValue} <span className="text-amber-500">USDT</span>
              </p>
            </div>
            
            {/* Expand indicator */}
            <motion.div
              animate={{ rotate: walletExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isDark ? 'bg-slate-700/50' : 'bg-gray-100'
              }`}
            >
              <svg className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
