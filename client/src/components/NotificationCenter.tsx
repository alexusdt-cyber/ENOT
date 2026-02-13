import { useState, useMemo, useId } from "react";
import { 
  X, 
  Bell, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Trash2,
  Clock,
  Target,
  FileText,
  CheckSquare,
  Map,
  Sparkles,
  Filter,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/components/ui/use-mobile";

interface NotificationFromAPI {
  id: string;
  userId: string;
  categoryId: string;
  typeId: string | null;
  title: string;
  body: string | null;
  status: "unread" | "read" | "archived";
  sourceType: string | null;
  sourceId: string | null;
  metadata: string | null;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
  category: {
    key: string;
    name: string;
    color: string;
  } | null;
}

interface NotificationCategory {
  id: string;
  key: string;
  name: string;
  color: string;
}

interface NotificationCenterProps {
  isDark?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons: Record<string, React.ElementType> = {
  tasks: CheckSquare,
  notes: FileText,
  roadmap: Map,
  goals: Target,
  default: Bell,
};

const categoryColors: Record<string, { gradient: string; glow: string; icon: string }> = {
  tasks: { gradient: "from-emerald-500 to-teal-500", glow: "emerald", icon: "text-emerald-400" },
  notes: { gradient: "from-blue-500 to-cyan-500", glow: "blue", icon: "text-blue-400" },
  roadmap: { gradient: "from-violet-500 to-purple-500", glow: "violet", icon: "text-violet-400" },
  goals: { gradient: "from-amber-500 to-orange-500", glow: "amber", icon: "text-amber-400" },
  default: { gradient: "from-indigo-500 to-violet-500", glow: "indigo", icon: "text-indigo-400" },
};

export function NotificationCenter({ isDark = false, isOpen, onClose }: NotificationCenterProps) {
  const gradientId = useId();
  const isMobile = useIsMobile();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [mobileShowNotifications, setMobileShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, isError } = useQuery<NotificationFromAPI[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    enabled: isOpen,
  });

  const { data: categories = [], isError: categoriesError } = useQuery<NotificationCategory[]>({
    queryKey: ["/api/notifications/categories"],
    queryFn: async () => {
      const response = await fetch("/api/notifications/categories", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      return response.json();
    },
    enabled: isOpen,
  });

  const hasError = isError || categoriesError;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const allCategories = useMemo(() => {
    return [
      { key: "all", name: "Все", color: "#6366f1" },
      ...categories.map(c => ({ key: c.key, name: c.name, color: c.color }))
    ];
  }, [categories]);

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === "all") {
      return notifications;
    }
    return notifications.filter(n => n.category?.key === selectedCategory);
  }, [notifications, selectedCategory]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.status === "unread").length;
  }, [notifications]);

  const getCategoryCount = (categoryKey: string) => {
    if (categoryKey === "all") return notifications.length;
    return notifications.filter(n => n.category?.key === categoryKey).length;
  };

  const handleMarkAsRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleView = (notification: NotificationFromAPI) => {
    if (notification.status === "unread") {
      markReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      onClose();
    }
  };

  const getNotificationIcon = (notification: NotificationFromAPI) => {
    const categoryKey = notification.category?.key || "default";
    const IconComponent = categoryIcons[categoryKey] || categoryIcons.default;
    const colors = categoryColors[categoryKey] || categoryColors.default;
    return <IconComponent className={`w-5 h-5 ${colors.icon}`} />;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes}м назад`;
    if (hours < 24) return `${hours}ч назад`;
    if (days < 7) return `${days}д назад`;
    
    return date.toLocaleDateString("ru-RU");
  };

  const renderCategoriesSidebar = () => (
    <div className={`w-56 flex-shrink-0 border-r overflow-y-auto ${
      isDark ? 'border-slate-700/50 bg-slate-800/30' : 'border-gray-200/50 bg-gray-50/50'
    }`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Категории
          </span>
        </div>
        <div className="space-y-2">
          {allCategories.map((cat, index) => {
            const isSelected = selectedCategory === cat.key;
            const count = getCategoryCount(cat.key);
            const colors = categoryColors[cat.key] || categoryColors.default;
            return (
              <motion.button
                key={cat.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCategory(cat.key)}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
                  isSelected
                    ? isDark
                      ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                      : 'bg-indigo-50 border border-indigo-200/50 shadow-lg shadow-indigo-500/10'
                    : isDark
                      ? 'hover:bg-slate-700/50 border border-transparent'
                      : 'hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm'
                }`}
                data-testid={`button-category-${cat.key}`}
              >
                <motion.div
                  animate={{ scale: isSelected ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? `bg-gradient-to-r ${colors.gradient}` : isDark ? 'bg-slate-600' : 'bg-gray-300'
                  }`}
                  style={{ boxShadow: isSelected ? `0 0 8px 2px rgba(99, 102, 241, 0.4)` : undefined }}
                />
                <span className={`flex-1 text-sm font-medium ${
                  isSelected ? (isDark ? 'text-white' : 'text-indigo-700') : (isDark ? 'text-slate-300' : 'text-gray-700')
                }`}>
                  {cat.name}
                </span>
                <motion.span
                  animate={{ scale: isSelected ? 1.05 : 1 }}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isSelected
                      ? isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-200 text-indigo-700'
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderNotificationsList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className={`w-12 h-12 rounded-full border-2 border-t-indigo-500 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}
          />
        </div>
      );
    }
    if (hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <AlertCircle className={`w-8 h-8 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            </div>
            <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Ошибка загрузки</p>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Не удалось загрузить уведомления</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                queryClient.invalidateQueries({ queryKey: ["/api/notifications/categories"] });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25"
              data-testid="button-retry-notifications"
            >
              <RotateCcw className="w-4 h-4" />
              Повторить
            </motion.button>
          </motion.div>
        </div>
      );
    }
    if (filteredNotifications.length === 0) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center ${
                isDark ? 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50' : 'bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200'
              }`}
            >
              <Sparkles className={`w-10 h-10 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
            </motion.div>
            <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>Нет уведомлений</p>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Здесь пока пусто</p>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.map((notification, index) => {
            const categoryKey = notification.category?.key || "default";
            const colors = categoryColors[categoryKey] || categoryColors.default;
            const isUnread = notification.status === "unread";
            return (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 50 }}
                transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                  isUnread
                    ? isDark
                      ? 'border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/15 shadow-lg shadow-indigo-500/5'
                      : 'border-indigo-200/50 bg-indigo-50/50 hover:bg-indigo-100/50 shadow-lg shadow-indigo-500/10'
                    : isDark
                      ? 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50'
                      : 'border-gray-200/50 bg-white hover:bg-gray-50'
                }`}
                onClick={() => handleView(notification)}
                data-testid={`notification-${notification.id}`}
              >
                {isUnread && (
                  <motion.div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b ${colors.gradient}`}
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ boxShadow: `0 0 10px 2px rgba(99, 102, 241, 0.3)` }}
                  />
                )}
                <div className="flex gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      isUnread ? `bg-gradient-to-br ${colors.gradient} shadow-lg` : isDark ? 'bg-slate-700' : 'bg-gray-100'
                    }`}
                    style={{ boxShadow: isUnread ? `0 4px 20px -4px rgba(99, 102, 241, 0.4)` : undefined }}
                  >
                    {isUnread ? <div className="text-white">{getNotificationIcon(notification)}</div> : getNotificationIcon(notification)}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isUnread && (
                            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                          )}
                          <h3 className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{notification.title}</h3>
                        </div>
                        {notification.body && (
                          <p className={`text-sm line-clamp-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{notification.body}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{formatTime(notification.createdAt)}</span>
                          {notification.category && (
                            <>
                              <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>•</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>{notification.category.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        {isUnread && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-emerald-400' : 'hover:bg-gray-100 text-gray-500 hover:text-emerald-600'}`}
                            data-testid={`button-mark-read-${notification.id}`}
                            title="Отметить как прочитанное"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400 hover:text-rose-400' : 'hover:bg-gray-100 text-gray-500 hover:text-rose-600'}`}
                          data-testid={`button-delete-${notification.id}`}
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                    {notification.actionUrl && (
                      <motion.button
                        whileHover={{ x: 3 }}
                        onClick={(e) => { e.stopPropagation(); handleView(notification); }}
                        className={`mt-3 inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                          isDark ? 'text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300' : 'text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700'
                        }`}
                        data-testid={`button-view-${notification.id}`}
                      >
                        Посмотреть
                        <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex"
      >
        {/* Backdrop with Blur */}
        <motion.div
          initial={{ backdropFilter: "blur(0px)" }}
          animate={{ backdropFilter: "blur(8px)" }}
          exit={{ backdropFilter: "blur(0px)" }}
          className={`flex-1 ${isDark ? 'bg-black/40' : 'bg-black/20'}`}
          onClick={onClose}
        />

        {/* Main Panel - Premium Glassmorphism */}
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 300,
            mass: 0.8
          }}
          className={`w-full max-w-2xl flex flex-col h-full relative overflow-hidden ${
            isDark 
              ? 'bg-slate-900/95 backdrop-blur-2xl border-l border-slate-700/50' 
              : 'bg-white/95 backdrop-blur-2xl border-l border-gray-200/50 shadow-2xl'
          }`}
        >
          {/* Animated Aurora Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id={`${gradientId}-notif-aurora1`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isDark ? "#6366f1" : "#818cf8"}>
                    <animate attributeName="stop-color" values={isDark ? "#6366f1;#ec4899;#6366f1" : "#818cf8;#f472b6;#818cf8"} dur="10s" repeatCount="indefinite" />
                  </stop>
                  <stop offset="100%" stopColor={isDark ? "#06b6d4" : "#22d3ee"}>
                    <animate attributeName="stop-color" values={isDark ? "#06b6d4;#8b5cf6;#06b6d4" : "#22d3ee;#a78bfa;#22d3ee"} dur="8s" repeatCount="indefinite" />
                  </stop>
                </linearGradient>
              </defs>
              <motion.circle 
                cx="80%" cy="20%" r="30%"
                fill={`url(#${gradientId}-notif-aurora1)`}
                initial={{ opacity: 0.1 }}
                animate={{ 
                  cx: ["80%", "70%", "80%"],
                  cy: ["20%", "30%", "20%"],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </div>

          {/* Header - Premium Glass Style */}
          <div className={`relative z-10 px-6 py-5 border-b ${
            isDark ? 'border-slate-700/50 bg-slate-900/50' : 'border-gray-200/50 bg-white/50'
          } backdrop-blur-xl`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Animated Bell Icon */}
                <motion.div 
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isDark 
                      ? 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/30' 
                      : 'bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200/50'
                  }`}
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Bell className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-rose-500/30"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                  )}
                  {/* Pulse Ring */}
                  {unreadCount > 0 && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-indigo-500"
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>

                <div>
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Уведомления
                  </h2>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {unreadCount > 0 
                      ? `${unreadCount} ${unreadCount === 1 ? 'новое' : 'новых'} уведомлений`
                      : 'Все прочитано'
                    }
                  </p>
                </div>
              </div>

              {/* Close Button - Premium Style */}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className={`p-2.5 rounded-xl transition-colors ${
                  isDark 
                    ? 'hover:bg-slate-700/50 text-slate-400 hover:text-white' 
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                }`}
                data-testid="button-close-notifications"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Content Area */}
          <div className="relative z-10 flex flex-1 overflow-hidden">
            {isMobile ? (
              <AnimatePresence mode="wait">
                {mobileShowNotifications ? (
                  <motion.div key="notif-list-mobile" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"tween",duration:0.25}} className="flex-1 flex flex-col overflow-hidden">
                    <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-900/80' : 'border-gray-200 bg-white/80'}`}>
                      <button onClick={() => setMobileShowNotifications(false)} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/60' : 'text-gray-600 hover:bg-gray-100'}`} data-testid="button-mobile-back-to-categories">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Назад</span>
                      </button>
                      <span className={`text-sm font-medium ml-auto ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {allCategories.find(c => c.key === selectedCategory)?.name || 'Все'}
                      </span>
                    </div>
                    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                      {renderNotificationsList()}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="categories-mobile" initial={{opacity:0}} animate={{opacity:1}} exit={{x:"-30%",opacity:0}} transition={{type:"tween",duration:0.2}} className="flex-1 flex flex-col overflow-hidden">
                    <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-800/30' : 'bg-gray-50/50'}`}>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Filter className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Категории
                          </span>
                        </div>
                        <div className="space-y-2">
                          {allCategories.map((cat, index) => {
                            const count = getCategoryCount(cat.key);
                            return (
                              <motion.button
                                key={cat.key}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => { setSelectedCategory(cat.key); setMobileShowNotifications(true); }}
                                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left ${
                                  isDark ? 'hover:bg-slate-700/50 border border-transparent' : 'hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm'
                                }`}
                                data-testid={`button-category-${cat.key}`}
                              >
                                <motion.div className={`w-2 h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color})` }} />
                                <span className={`flex-1 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                  {cat.name}
                                </span>
                                <motion.span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-200 text-gray-600'}`}>
                                  {count}
                                </motion.span>
                                <ArrowRight className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <>
                {renderCategoriesSidebar()}
                <div className={`flex-1 overflow-y-auto ${isDark ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                  {renderNotificationsList()}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
