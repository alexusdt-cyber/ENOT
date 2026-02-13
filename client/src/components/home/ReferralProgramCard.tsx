import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, ArrowRight, Gift, Users, Coins, Target, Clock, X, Bell } from "lucide-react";
import { usePageVisibility } from "../../hooks/usePageVisibility";

const CARD_BACKGROUND_IMAGE = "/bg-enot.webp";

type RewardType = "gem" | "coin";
type TabType = "daily" | "weekly" | "monthly";
type ModeType = "rewards" | "tasks";

interface RewardItem {
  day: number;
  amount: number;
  type: RewardType;
  gemIcon?: string;
  claimed: boolean;
  isMystery?: boolean;
  isToday?: boolean;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  type: "update" | "promo" | "event";
  viewed: boolean;
}

interface ReferralProgramCardProps {
  isDark?: boolean;
  onClaimReward?: (day: number) => void;
  onInvite?: () => void;
  onDismissNews?: (id: string) => void;
}

const defaultDailyRewards: RewardItem[] = [
  { day: 1, amount: 5, type: "gem", gemIcon: "/attached_assets/rock-1_1770279073359.png", claimed: true, isToday: false },
  { day: 2, amount: 10, type: "coin", claimed: true, isToday: false },
  { day: 3, amount: 5, type: "gem", gemIcon: "/attached_assets/rock-2_1770279073360.png", claimed: true, isToday: false },
  { day: 4, amount: 15, type: "coin", claimed: false, isToday: true },
  { day: 5, amount: 5, type: "gem", gemIcon: "/attached_assets/rock-3_1770279073358.png", claimed: false, isToday: false },
  { day: 6, amount: 20, type: "coin", claimed: false, isToday: false },
  { day: 7, amount: 50, type: "coin", claimed: false, isMystery: true, isToday: false },
];

const defaultWeeklyRewards: RewardItem[] = [
  { day: 1, amount: 50, type: "coin", claimed: true, isToday: false },
  { day: 2, amount: 25, type: "gem", gemIcon: "/attached_assets/rock-1_1770279073359.png", claimed: true, isToday: false },
  { day: 3, amount: 75, type: "coin", claimed: true, isToday: false },
  { day: 4, amount: 30, type: "gem", gemIcon: "/attached_assets/rock-2_1770279073360.png", claimed: false, isToday: true },
  { day: 5, amount: 100, type: "coin", claimed: false, isToday: false },
  { day: 6, amount: 40, type: "gem", gemIcon: "/attached_assets/rock-3_1770279073358.png", claimed: false, isToday: false },
  { day: 7, amount: 150, type: "coin", claimed: false, isMystery: true, isToday: false },
  { day: 8, amount: 60, type: "coin", claimed: false, isToday: false },
  { day: 9, amount: 35, type: "gem", gemIcon: "/attached_assets/rock-1_1770279073359.png", claimed: false, isToday: false },
  { day: 10, amount: 80, type: "coin", claimed: false, isToday: false },
  { day: 11, amount: 45, type: "gem", gemIcon: "/attached_assets/rock-2_1770279073360.png", claimed: false, isToday: false },
  { day: 12, amount: 200, type: "coin", claimed: false, isMystery: true, isToday: false },
];

const defaultMonthlyRewards: RewardItem[] = [
  { day: 1, amount: 200, type: "coin", claimed: true, isToday: false },
  { day: 2, amount: 100, type: "gem", gemIcon: "/attached_assets/rock-3_1770279073358.png", claimed: true, isToday: false },
  { day: 3, amount: 300, type: "coin", claimed: false, isToday: true },
  { day: 4, amount: 150, type: "gem", gemIcon: "/attached_assets/rock-1_1770279073359.png", claimed: false, isToday: false },
  { day: 5, amount: 400, type: "coin", claimed: false, isToday: false },
  { day: 6, amount: 200, type: "gem", gemIcon: "/attached_assets/rock-2_1770279073360.png", claimed: false, isToday: false },
  { day: 7, amount: 500, type: "coin", claimed: false, isMystery: true, isToday: false },
];

const defaultNews: NewsItem[] = [
  { id: "news1", title: "Новое обновление!", description: "Добавлены еженедельные награды", type: "update", viewed: false },
  { id: "news2", title: "Акция x2 бонусов", description: "До конца недели удвоенные награды", type: "promo", viewed: false },
];

function useCountdown(targetDate: Date, isVisible: boolean) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    
    if (!isVisible) return;
    
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate, isVisible]);

  return timeLeft;
}

function getNextReset(type: TabType): Date {
  const now = new Date();
  if (type === "daily") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  } else if (type === "weekly") {
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  } else {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }
}

export function ReferralProgramCard({
  isDark = true,
  onClaimReward,
  onInvite,
  onDismissNews,
}: ReferralProgramCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [activeMode, setActiveMode] = useState<ModeType>("rewards");
  const [currentPage, setCurrentPage] = useState(0);
  const [news, setNews] = useState<NewsItem[]>(defaultNews);
  const [currentSlide, setCurrentSlide] = useState(0);

  const unviewedNews = news.filter(n => !n.viewed);
  const totalSlides = 1 + unviewedNews.length;

  const handleDismissNews = (id: string) => {
    setNews(prev => prev.map(n => n.id === id ? { ...n, viewed: true } : n));
    onDismissNews?.(id);
    if (currentSlide > 0) {
      setCurrentSlide(prev => Math.max(0, prev - 1));
    }
  };

  const getRewards = () => {
    switch (activeTab) {
      case "daily": return defaultDailyRewards;
      case "weekly": return defaultWeeklyRewards;
      case "monthly": return defaultMonthlyRewards;
    }
  };

  const rewards = getRewards();
  const itemsPerPage = 7;
  const totalPages = Math.ceil(rewards.length / itemsPerPage);
  const todayReward = rewards.find(r => r.isToday && !r.claimed);
  
  const isPageVisible = usePageVisibility();
  const resetDate = useMemo(() => getNextReset(activeTab), [activeTab]);
  const timeLeft = useCountdown(resetDate, isPageVisible);

  const getResetLabel = () => {
    switch (activeTab) {
      case "daily": return "До обновления";
      case "weekly": return "До сброса недели";
      case "monthly": return "До сброса месяца";
    }
  };

  const formatTime = () => {
    if (activeTab === "daily") {
      return `${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`;
    } else if (activeTab === "weekly") {
      return `${timeLeft.days}д ${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}`;
    } else {
      return `${timeLeft.days}д ${timeLeft.hours}ч`;
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "daily", label: "Ежедневно" },
    { id: "weekly", label: "Еженедельно" },
    { id: "monthly", label: "Ежемесячно" },
  ];

  const getNewsTypeColor = (type: NewsItem["type"]) => {
    switch (type) {
      case "update": return isDark ? "from-blue-600 to-indigo-600" : "from-blue-500 to-indigo-500";
      case "promo": return isDark ? "from-amber-600 to-orange-600" : "from-amber-500 to-orange-500";
      case "event": return isDark ? "from-purple-600 to-pink-600" : "from-purple-500 to-pink-500";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-3xl h-full
        ${isDark 
          ? 'bg-slate-900/80 border border-white/10' 
          : 'bg-white/80 border border-gray-200/50'
        }
        backdrop-blur-xl shadow-2xl
      `}
      data-testid="referral-program-card"
    >
      {/* Background Image - fills entire block, positioned bottom-right */}
      {CARD_BACKGROUND_IMAGE && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img 
            src={CARD_BACKGROUND_IMAGE} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: 'bottom right',
            }}
          />
          {/* Gradient overlay for better text readability */}
          <div className={`absolute inset-0 ${
            isDark 
              ? 'bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-900/40' 
              : 'bg-gradient-to-br from-white/95 via-white/80 to-white/40'
          }`} />
        </div>
      )}
      
      <div className="relative z-10 h-full flex flex-col p-5">
        {/* Header with Slide Navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {currentSlide === 0 ? "БОНУСЫ И ЗАДАНИЯ" : "НОВОСТИ"}
          </h2>
          
          {/* Slide Navigation */}
          {totalSlides > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                disabled={currentSlide === 0}
                className={`p-1.5 rounded-lg transition-all ${
                  currentSlide === 0
                    ? isDark ? 'text-white/20' : 'text-gray-300'
                    : isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalSlides }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentSlide === idx
                        ? 'bg-indigo-500 w-4'
                        : isDark ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={() => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1))}
                disabled={currentSlide >= totalSlides - 1}
                className={`p-1.5 rounded-lg transition-all ${
                  currentSlide >= totalSlides - 1
                    ? isDark ? 'text-white/20' : 'text-gray-300'
                    : isDark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {unviewedNews.length > 0 && (
                <div className="flex items-center gap-1 ml-2 px-2 py-1 rounded-full bg-red-500/20">
                  <Bell className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] font-bold text-red-400">{unviewedNews.length}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {currentSlide === 0 ? (
            <motion.div
              key="main-content"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
            >
              {/* Mode Toggle: Rewards / Tasks */}
              <div className={`
                flex rounded-xl p-1 mb-3
                ${isDark ? 'bg-slate-800/80' : 'bg-gray-100'}
              `}>
                <button
                  onClick={() => setActiveMode("rewards")}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all
                    ${activeMode === "rewards"
                      ? isDark 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-white text-indigo-600 shadow-md'
                      : isDark 
                        ? 'text-white/60 hover:text-white/80' 
                        : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <Gift className="w-3.5 h-3.5" />
                  Награды
                </button>
                <button
                  onClick={() => setActiveMode("tasks")}
                  className={`
                    flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all
                    ${activeMode === "tasks"
                      ? isDark 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-white text-indigo-600 shadow-md'
                      : isDark 
                        ? 'text-white/60 hover:text-white/80' 
                        : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <Target className="w-3.5 h-3.5" />
                  Задания
                </button>
              </div>

              {/* Tab Switcher */}
              <div className={`
                flex rounded-lg overflow-hidden mb-3
                ${isDark ? 'bg-slate-800/60 border border-white/10' : 'bg-gray-50 border border-gray-200'}
              `}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setCurrentPage(0); }}
                    className={`
                      flex-1 py-2 text-[11px] font-semibold transition-all
                      ${activeTab === tab.id
                        ? isDark 
                          ? 'bg-indigo-500/30 text-white border-b-2 border-indigo-400' 
                          : 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                        : isDark 
                          ? 'text-white/50 hover:text-white/70 hover:bg-white/5' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className={`
                flex-1 rounded-xl p-3
                ${isDark ? 'bg-slate-800/40' : 'bg-gray-50/80'}
              `}>
                <AnimatePresence mode="wait">
                  {activeMode === "rewards" ? (
                    <motion.div
                      key={`rewards-${activeTab}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="h-full flex flex-col"
                    >
                      {/* Rewards Grid */}
                      <div className="flex gap-1.5 mb-2">
                        {rewards.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((reward) => (
                          <motion.div
                            key={reward.day}
                            whileHover={{ scale: 1.03 }}
                            onClick={() => reward.isToday && !reward.claimed && onClaimReward?.(reward.day)}
                            className={`
                              flex-1 flex flex-col items-center py-2 px-1 rounded-lg cursor-pointer transition-all
                              ${reward.claimed 
                                ? isDark 
                                  ? 'bg-emerald-600/20 border border-emerald-500/30' 
                                  : 'bg-emerald-50 border border-emerald-200'
                                : reward.isToday
                                  ? isDark 
                                    ? 'bg-indigo-600/20 border-2 border-indigo-400' 
                                    : 'bg-indigo-50 border-2 border-indigo-400'
                                  : isDark 
                                    ? 'bg-slate-700/30 border border-white/5' 
                                    : 'bg-white border border-gray-200'
                              }
                            `}
                          >
                            <span className={`text-[9px] mb-1 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
                              {activeTab === "daily" ? `День ${reward.day}` : `#${reward.day}`}
                            </span>
                            
                            <div className="w-6 h-6 flex items-center justify-center mb-1">
                              {reward.claimed ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              ) : reward.isMystery ? (
                                <Gift className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                              ) : reward.type === "gem" && reward.gemIcon ? (
                                <img src={reward.gemIcon} alt="gem" className="w-5 h-5 object-contain" />
                              ) : (
                                <Coins className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                              )}
                            </div>
                            
                            <span className={`text-[9px] font-semibold ${
                              reward.claimed 
                                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                : reward.isMystery
                                  ? isDark ? 'text-amber-400' : 'text-amber-600'
                                  : isDark ? 'text-white/70' : 'text-gray-600'
                            }`}>
                              {reward.isMystery ? '???' : `+${reward.amount}`}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Timer */}
                      <div className={`
                        flex items-center justify-center gap-2 py-1.5 rounded-lg mb-2
                        ${isDark ? 'bg-slate-700/40' : 'bg-gray-100'}
                      `}>
                        <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                        <span className={`text-[10px] ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                          {getResetLabel()}:
                        </span>
                        <span className={`text-[11px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {formatTime()}
                        </span>
                      </div>

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between mt-auto">
                        <motion.button
                          onClick={() => todayReward && onClaimReward?.(todayReward.day)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={!todayReward}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs
                            ${todayReward
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                              : isDark 
                                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Забрать
                        </motion.button>

                        {/* Pagination */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                            disabled={currentPage === 0}
                            className={`p-1 rounded ${isDark ? 'text-white/40 hover:text-white disabled:opacity-30' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                            {currentPage + 1}/{totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className={`p-1 rounded ${isDark ? 'text-white/40 hover:text-white disabled:opacity-30' : 'text-gray-400 hover:text-gray-600 disabled:opacity-30'}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`tasks-${activeTab}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="h-full flex flex-col gap-2"
                    >
                      {/* Task Items based on activeTab */}
                      {(activeTab === "daily" ? [
                        { id: 1, title: "Пригласи 1 друга", reward: 10, type: "coin" as const, completed: true },
                        { id: 2, title: "Сделай 3 заметки", reward: 5, type: "gem" as const, gemIcon: "/attached_assets/rock-1_1770279073359.png", completed: false, isActive: true },
                        { id: 3, title: "Выполни 5 задач", reward: 15, type: "coin" as const, completed: false },
                      ] : activeTab === "weekly" ? [
                        { id: 1, title: "Пригласи 5 друзей", reward: 50, type: "coin" as const, completed: true },
                        { id: 2, title: "Создай 20 заметок", reward: 30, type: "gem" as const, gemIcon: "/attached_assets/rock-2_1770279073360.png", completed: false, isActive: true },
                        { id: 3, title: "Выполни 30 задач", reward: 75, type: "coin" as const, completed: false },
                      ] : [
                        { id: 1, title: "Пригласи 20 друзей", reward: 200, type: "coin" as const, completed: true },
                        { id: 2, title: "Создай 100 заметок", reward: 100, type: "gem" as const, gemIcon: "/attached_assets/rock-3_1770279073358.png", completed: false, isActive: true },
                        { id: 3, title: "Выполни 150 задач", reward: 300, type: "coin" as const, completed: false },
                      ]).map((task) => (
                        <div
                          key={task.id}
                          className={`
                            flex items-center gap-3 p-2.5 rounded-lg transition-all
                            ${task.completed 
                              ? isDark ? 'bg-emerald-600/15 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                              : task.isActive
                                ? isDark ? 'bg-indigo-600/15 border border-indigo-500/30' : 'bg-indigo-50 border border-indigo-200'
                                : isDark ? 'bg-slate-700/20 border border-white/5' : 'bg-white border border-gray-200'
                            }
                          `}
                        >
                          <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                            ${task.completed 
                              ? 'bg-emerald-500' 
                              : isDark ? 'bg-slate-600' : 'bg-gray-200'
                            }
                          `}>
                            {task.completed ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <span className={`text-[10px] font-bold ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                {task.id}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              task.completed 
                                ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                                : isDark ? 'text-white/90' : 'text-gray-800'
                            }`}>
                              {task.title}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                              +{task.reward}
                            </span>
                            {task.type === "gem" && task.gemIcon ? (
                              <img src={task.gemIcon} alt="gem" className="w-4 h-4 object-contain" />
                            ) : (
                              <Coins className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Timer for Tasks too */}
                      <div className={`
                        flex items-center justify-center gap-2 py-1.5 rounded-lg mt-auto
                        ${isDark ? 'bg-slate-700/40' : 'bg-gray-100'}
                      `}>
                        <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                        <span className={`text-[10px] ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                          {getResetLabel()}:
                        </span>
                        <span className={`text-[11px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {formatTime()}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Invite Button */}
              <motion.button
                onClick={onInvite}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="
                  mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm
                  bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600
                  text-white shadow-lg hover:shadow-xl transition-shadow
                "
              >
                <Users className="w-4 h-4" />
                ПРИГЛАСИТЬ ДРУГА
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key={`news-${currentSlide}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col"
            >
              {unviewedNews[currentSlide - 1] && (
                <>
                  {/* News Card */}
                  <div className={`
                    flex-1 rounded-2xl p-6 relative overflow-hidden
                    bg-gradient-to-br ${getNewsTypeColor(unviewedNews[currentSlide - 1].type)}
                  `}>
                    {/* Close Button */}
                    <button
                      onClick={() => handleDismissNews(unviewedNews[currentSlide - 1].id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>

                    {/* News Content */}
                    <div className="h-full flex flex-col justify-center items-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                        <Bell className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {unviewedNews[currentSlide - 1].title}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {unviewedNews[currentSlide - 1].description}
                      </p>
                    </div>
                  </div>

                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
