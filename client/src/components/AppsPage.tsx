import { useState, useEffect, lazy, Suspense } from "react";
import {
  LayoutGrid,
  Star,
  Download,
  ExternalLink,
  Search,
  Loader2,
  Sparkles,
  Play,
  ChevronLeft,
  ChevronRight,
  Package,
  Trash2,
  Clock,
  Crown,
  Send,
  ArrowLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/components/ui/use-mobile";

const MyMemoryMap = lazy(() => import("./apps/MyMemoryMap"));
const MiniAppModal = lazy(() => import("./apps/MiniAppModal"));

interface AppCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  order: number | null;
  appType: string;
}

interface App {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  shortDescription: string | null;
  icon: string | null;
  screenshots: string[];
  developer: string | null;
  version: string | null;
  size: string | null;
  rating: number | null;
  downloads: number | null;
  price: number | null;
  launchUrl: string | null;
  featured: boolean | null;
  appType: string;
  launchMode: string;
  componentKey: string | null;
  origin: string | null;
  allowedPostMessageOrigins: string[] | null;
}

interface UserApp {
  id: string;
  userId: string;
  appId: string;
  addedAt: string;
  lastLaunchedAt: string | null;
  isFavorite: boolean | null;
  app: App;
}

interface AppReview {
  id: string;
  appId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface AppsPageProps {
  isDark?: boolean;
}

const RatingStars = ({ rating, size = 16, isDark }: { rating: number; size?: number; isDark: boolean }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`${star <= rating ? "fill-amber-400 text-amber-400" : isDark ? "text-slate-600" : "text-gray-300"}`}
        style={{ width: size, height: size }}
      />
    ))}
  </div>
);

const AppCardSkeleton = ({ isDark }: { isDark: boolean }) => (
  <div className={`p-4 rounded-xl ${isDark ? "bg-slate-800/60" : "bg-white/60"} animate-pulse`}>
    <div className="flex items-start gap-3">
      <div className={`w-12 h-12 rounded-xl ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-4 rounded ${isDark ? "bg-slate-700" : "bg-gray-200"} w-3/4`} />
        <div className={`h-3 rounded ${isDark ? "bg-slate-700" : "bg-gray-200"} w-full`} />
      </div>
    </div>
  </div>
);

export function AppsPage({ isDark = false }: AppsPageProps) {
  const isMobile = useIsMobile();
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [userApps, setUserApps] = useState<UserApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [storeSelectedCategory, setStoreSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [appMode, setAppMode] = useState<"internal" | "telegram" | "external">("internal");
  const [activeModalApp, setActiveModalApp] = useState<App | null>(null);
  const [screenshotViewerOpen, setScreenshotViewerOpen] = useState(false);
  const [screenshotViewerIndex, setScreenshotViewerIndex] = useState(0);
  const [screenshotViewerImages, setScreenshotViewerImages] = useState<string[]>([]);
  const [userHasReview, setUserHasReview] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState("");
  const [newReviewContent, setNewReviewContent] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedApp) {
      fetchReviews(selectedApp.id);
    }
  }, [selectedApp]);

  useEffect(() => {
    if (selectedApp && selectedApp.appType !== appMode) {
      setSelectedApp(null);
    }
    setStoreSearchQuery("");
    setStoreSelectedCategory("all");
  }, [appMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [categoriesRes, appsRes, userAppsRes] = await Promise.all([
        fetch("/api/app-categories", { credentials: "include" }),
        fetch("/api/apps", { credentials: "include" }),
        fetch("/api/user-apps", { credentials: "include" }),
      ]);
      
      if (categoriesRes.ok) {
        setCategories(await categoriesRes.json());
      }
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApps(appsData);
      }
      if (userAppsRes.ok) {
        setUserApps(await userAppsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch apps:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async (appId: string) => {
    setIsLoadingReviews(true);
    setUserHasReview(false);
    setNewReviewRating(5);
    setNewReviewTitle("");
    setNewReviewContent("");
    try {
      const [reviewsRes, myReviewRes] = await Promise.all([
        fetch(`/api/apps/${appId}/reviews`, { credentials: "include" }),
        fetch(`/api/apps/${appId}/my-review`, { credentials: "include" }),
      ]);
      if (reviewsRes.ok) {
        setReviews(await reviewsRes.json());
      }
      if (myReviewRes.ok) {
        const data = await myReviewRes.json();
        setUserHasReview(data.hasReview);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedApp || isSubmittingReview) return;
    
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/apps/${selectedApp.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating: newReviewRating,
          title: newReviewTitle || null,
          content: newReviewContent || null,
        }),
      });
      
      if (res.ok) {
        setUserHasReview(true);
        setNewReviewTitle("");
        setNewReviewContent("");
        fetchReviews(selectedApp.id);
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : 0;

  const handleAddApp = async (appId: string) => {
    try {
      const res = await fetch("/api/user-apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId }),
      });
      if (res.ok) {
        const newUserApp = await res.json();
        setUserApps([...userApps, { ...newUserApp, app: apps.find((a) => a.id === appId)! }]);
      }
    } catch (error) {
      console.error("Failed to add app:", error);
    }
  };

  const handleRemoveApp = async (appId: string) => {
    try {
      const res = await fetch(`/api/user-apps/${appId}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setUserApps(userApps.filter((ua) => ua.appId !== appId));
      }
    } catch (error) {
      console.error("Failed to remove app:", error);
    }
  };

  const handleLaunchApp = async (app: App) => {
    await fetch(`/api/user-apps/${app.id}/launch`, { method: "POST", credentials: "include" });
    
    if (app.launchMode === "modal" && app.componentKey) {
      setActiveModalApp(app);
    } else if (app.launchMode === "iframe" && app.launchUrl) {
      setActiveModalApp(app);
    } else if (app.launchUrl) {
      window.open(app.launchUrl, "_blank");
    }
  };

  const handleCloseModalApp = () => {
    setActiveModalApp(null);
  };

  const isAppAdded = (appId: string) => userApps.some((ua) => ua.appId === appId);

  // All apps of current mode (for store homepage)
  const modeApps = apps.filter((app) => app.appType === appMode);
  
  // User's added apps of current mode (for left panel)
  const userModeApps = userApps
    .filter((ua) => ua.app && ua.app.appType === appMode)
    .map((ua) => ua.app);
  
  // Filter user's added apps for left panel (search and category)
  const filteredUserApps = userModeApps.filter((app) => {
    const matchesCategory = selectedCategory === "all" || app.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Categories that have user's added apps (for left panel filter)
  const userAppCategories = categories.filter((cat) =>
    cat.appType === appMode && userModeApps.some((app) => app.categoryId === cat.id)
  );
  
  // All categories with apps (for store homepage)
  const allModeCategories = categories.filter((cat) =>
    cat.appType === appMode && modeApps.some((app) => app.categoryId === cat.id)
  );
  
  // Filtered store apps (by store search and store category)
  const filteredStoreApps = modeApps.filter((app) => {
    const matchesCategory = storeSelectedCategory === "all" || app.categoryId === storeSelectedCategory;
    const searchLower = storeSearchQuery.toLowerCase();
    const matchesSearch =
      !storeSearchQuery ||
      app.name.toLowerCase().includes(searchLower) ||
      (app.shortDescription ?? "").toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const formatDownloads = (downloads: number | null) => {
    if (!downloads) return "0";
    if (downloads >= 1000000) return `${(downloads / 1000000).toFixed(1)}M`;
    if (downloads >= 1000) return `${(downloads / 1000).toFixed(1)}K`;
    return downloads.toString();
  };

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedApp ? (
            <motion.div
              key="detail"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className={`flex-1 flex flex-col overflow-y-auto ${
                isDark ? "bg-slate-900" : "bg-white"
              }`}
            >
              <div className={`p-4 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelectedApp(null)}
                  className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg transition-colors ${
                    isDark
                      ? "text-slate-300 hover:bg-slate-700/60"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  data-testid="button-mobile-back-to-apps"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Назад</span>
                </motion.button>

                <div className="flex items-start gap-4 mb-6">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl flex-shrink-0 ${
                      isDark ? "bg-slate-800" : "bg-white border border-gray-100"
                    }`}
                  >
                    {selectedApp.icon || "\u{1F4F1}"}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h1 className={`text-xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {selectedApp.name}
                    </h1>
                    <p className={`text-sm mb-2 ${isDark ? "text-fuchsia-400" : "text-fuchsia-600"}`}>
                      {selectedApp.developer || "Неизвестный разработчик"}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <RatingStars rating={reviews.length > 0 ? averageRating : 0} size={14} isDark={isDark} />
                        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                          {reviews.length > 0 ? averageRating : 0}
                        </span>
                      </div>
                      <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        <Download className="w-3.5 h-3.5 inline mr-1" />
                        {formatDownloads(selectedApp.downloads)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mb-6">
                  {isAppAdded(selectedApp.id) ? (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleLaunchApp(selectedApp)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-medium shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2"
                        data-testid="button-mobile-launch-app"
                      >
                        <Play className="w-4 h-4" />
                        Запустить
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRemoveApp(selectedApp.id)}
                        className={`px-3 py-2.5 rounded-xl font-medium ${
                          isDark
                            ? "bg-slate-700 text-slate-300"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        data-testid="button-mobile-remove-app"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddApp(selectedApp.id)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-medium shadow-lg shadow-fuchsia-500/30 flex items-center justify-center gap-2"
                      data-testid="button-mobile-add-app"
                    >
                      <Download className="w-4 h-4" />
                      Добавить
                    </motion.button>
                  )}
                </div>

                <div className="mb-6">
                  <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Описание
                  </h2>
                  <div className={`p-4 rounded-xl border ${
                    isDark ? "border-slate-600/50 bg-slate-800/40" : "border-gray-200 bg-white/60"
                  }`}>
                    <p className={`leading-relaxed text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                      {selectedApp.description || "Описание отсутствует"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Галерея
                  </h2>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {(() => {
                      const screenshots = selectedApp.screenshots && selectedApp.screenshots.length > 0
                        ? selectedApp.screenshots
                        : [
                            `https://placehold.co/300x200/${isDark ? '334155' : 'e2e8f0'}/ffffff?text=Screenshot+1`,
                            `https://placehold.co/300x200/${isDark ? '334155' : 'e2e8f0'}/ffffff?text=Screenshot+2`,
                          ];
                      return screenshots.map((screenshot, index) => (
                        <img
                          key={index}
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          onClick={() => {
                            setScreenshotViewerImages(screenshots);
                            setScreenshotViewerIndex(index);
                            setScreenshotViewerOpen(true);
                          }}
                          className={`w-40 h-28 object-cover rounded-xl flex-shrink-0 cursor-pointer ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                        />
                      ));
                    })()}
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-3 p-3 rounded-xl mb-6 ${isDark ? "bg-slate-800/60" : "bg-white/60"}`}>
                  <div>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Версия</p>
                    <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      {selectedApp.version || "1.0"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Цена</p>
                    <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      {selectedApp.price ? `${selectedApp.price} ₽` : "Бесплатно"}
                    </p>
                  </div>
                </div>

                <div>
                  <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                    Отзывы {reviews.length > 0 && `(${reviews.length})`}
                  </h2>
                  {!userHasReview && (
                    <div className={`p-4 rounded-xl mb-4 border ${
                      isDark ? "bg-slate-800/60 border-slate-600/50" : "bg-white/60 border-gray-200"
                    }`}>
                      <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                        Оставить отзыв
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Ваша оценка:
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setNewReviewRating(star)}>
                              <Star className={`w-5 h-5 ${star <= newReviewRating ? "fill-amber-400 text-amber-400" : isDark ? "text-slate-600" : "text-gray-300"}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Заголовок (необязательно)"
                        value={newReviewTitle}
                        onChange={(e) => setNewReviewTitle(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg text-sm mb-2 ${
                          isDark ? "bg-slate-700 text-white placeholder-slate-400 border border-slate-600" : "bg-white text-gray-900 placeholder-gray-400 border border-gray-300"
                        } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                      />
                      <textarea
                        placeholder="Напишите ваш отзыв..."
                        value={newReviewContent}
                        onChange={(e) => setNewReviewContent(e.target.value)}
                        rows={3}
                        className={`w-full px-3 py-2 rounded-lg text-sm mb-3 resize-none ${
                          isDark ? "bg-slate-700 text-white placeholder-slate-400 border border-slate-600" : "bg-white text-gray-900 placeholder-gray-400 border border-gray-300"
                        } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                      />
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmitReview}
                        disabled={isSubmittingReview}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-sm font-medium shadow-lg shadow-fuchsia-500/30 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Отправить
                      </motion.button>
                    </div>
                  )}
                  {userHasReview && (
                    <div className={`p-3 rounded-lg mb-4 text-sm ${isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                      Вы уже оставили отзыв на это приложение
                    </div>
                  )}
                  {isLoadingReviews ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className={`text-center py-8 rounded-xl ${isDark ? "bg-slate-800/40" : "bg-white/40"}`}>
                      <Star className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Пока нет отзывов</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((review) => (
                        <div key={review.id} className={`p-3 rounded-xl ${isDark ? "bg-slate-800/60" : "bg-white/60"}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                              {review.user.avatarUrl ? (
                                <img src={review.user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                  {review.user.displayName?.charAt(0) || "U"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {review.user.displayName || "Пользователь"}
                                </span>
                                <RatingStars rating={review.rating} size={10} isDark={isDark} />
                              </div>
                              {review.title && <p className={`text-sm font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>{review.title}</p>}
                              {review.content && <p className={`text-xs ${isDark ? "text-slate-300" : "text-gray-600"}`}>{review.content}</p>}
                              <p className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ x: "-30%", opacity: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
              className={`flex-1 flex flex-col overflow-hidden ${
                isDark ? "bg-slate-900/95" : "bg-white/80 backdrop-blur-xl"
              }`}
            >
              <div className={`p-4 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className={`p-2 rounded-xl shadow-lg ${
                      appMode === "telegram"
                        ? "bg-gradient-to-br from-sky-500 to-blue-500 shadow-sky-500/30"
                        : appMode === "external"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                        : "bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/30"
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      {appMode === "telegram" ? "Telegram" : appMode === "external" ? "Web Apps" : "Приложения"}
                    </h1>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {appMode === "telegram" ? "Telegram мини-приложения" : appMode === "external" ? "Внешние приложения с SSO" : "Магазин приложений"}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
                    <Package className={`w-3.5 h-3.5 ${appMode === "telegram" ? "text-sky-500" : appMode === "external" ? "text-emerald-500" : "text-fuchsia-500"}`} />
                    <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{userModeApps.length}</span>
                  </div>
                </div>

                <div className={`flex rounded-xl p-1 mb-3 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
                  <button
                    onClick={() => { setAppMode("internal"); setSelectedCategory("all"); }}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                      appMode === "internal"
                        ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg"
                        : isDark ? "text-slate-400" : "text-gray-500"
                    }`}
                  >
                    Приложения
                  </button>
                  <button
                    onClick={() => { setAppMode("telegram"); setSelectedCategory("all"); }}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      appMode === "telegram"
                        ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg"
                        : isDark ? "text-slate-400" : "text-gray-500"
                    }`}
                  >
                    Telegram
                    <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                      appMode === "telegram" ? "bg-white/20 text-white" : isDark ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"
                    }`}>beta</span>
                  </button>
                  <button
                    onClick={() => { setAppMode("external"); setSelectedCategory("all"); }}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      appMode === "external"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                        : isDark ? "text-slate-400" : "text-gray-500"
                    }`}
                  >
                    Web Apps
                    <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                      appMode === "external" ? "bg-white/20 text-white" : isDark ? "bg-slate-700 text-slate-400" : "bg-gray-200 text-gray-500"
                    }`}>SSO</span>
                  </button>
                </div>

                <div className="relative mb-3">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                  <input
                    type="text"
                    placeholder="Поиск приложений..."
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm ${
                      isDark ? "bg-slate-800/80 text-white placeholder-slate-400 border border-slate-700" : "bg-white/80 text-gray-900 placeholder-gray-400 border border-gray-300"
                    } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                    data-testid="input-mobile-apps-search"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setStoreSelectedCategory("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                      storeSelectedCategory === "all"
                        ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                        : isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Все
                  </button>
                  {userModeApps.length > 0 && (
                    <button
                      onClick={() => setSelectedCategory(selectedCategory === "personal" ? "all" : "personal")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                        selectedCategory === "personal"
                          ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                          : isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      Личное
                    </button>
                  )}
                  {allModeCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setStoreSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                        storeSelectedCategory === cat.id
                          ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                          : isDark ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <AppCardSkeleton key={i} isDark={isDark} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selectedCategory === "personal" ? filteredUserApps : filteredStoreApps).map((app, index) => (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setSelectedApp(app)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          isDark ? "bg-slate-800/60 active:bg-slate-700/60" : "bg-white/60 active:bg-white/80"
                        }`}
                        data-testid={`card-mobile-app-${app.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isDark ? "bg-slate-700" : "bg-gray-100"}`}>
                            {app.icon || "\u{1F4F1}"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{app.name}</h3>
                              {app.featured && <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {app.shortDescription || "Без описания"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <RatingStars rating={app.rating || 0} size={12} isDark={isDark} />
                              <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                {formatDownloads(app.downloads)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
                        </div>
                      </motion.div>
                    ))}
                    {(selectedCategory === "personal" ? filteredUserApps : filteredStoreApps).length === 0 && (
                      <div className="text-center py-12">
                        <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          {storeSearchQuery ? "Ничего не найдено" : "Нет приложений"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {activeModalApp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex flex-col"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`flex-1 flex flex-col ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
              >
                <div className={`flex items-center justify-between p-3 border-b ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeModalApp.icon || "\u{1F4F1}"}</span>
                    <h2 className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{activeModalApp.name}</h2>
                  </div>
                  <button onClick={handleCloseModalApp} className={`p-2 rounded-lg ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} /></div>}>
                    {activeModalApp.componentKey === "my_memory_map" && <MyMemoryMap isDark={isDark} onClose={handleCloseModalApp} />}
                    {activeModalApp.launchMode === "iframe" && activeModalApp.origin && <MiniAppModal app={activeModalApp} isDark={isDark} onClose={handleCloseModalApp} />}
                  </Suspense>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {screenshotViewerOpen && screenshotViewerImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
              onClick={() => setScreenshotViewerOpen(false)}
            >
              <button onClick={() => setScreenshotViewerOpen(false)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 z-10">
                <X className="w-6 h-6 text-white" />
              </button>
              {screenshotViewerImages.length > 1 && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); setScreenshotViewerIndex(prev => prev === 0 ? screenshotViewerImages.length - 1 : prev - 1); }} className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 z-10">
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setScreenshotViewerIndex(prev => prev === screenshotViewerImages.length - 1 ? 0 : prev + 1); }} className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 z-10">
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}
              <motion.img
                key={screenshotViewerIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={screenshotViewerImages[screenshotViewerIndex]}
                alt={`Screenshot ${screenshotViewerIndex + 1}`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Apps List */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-96 flex-shrink-0 flex flex-col border-l border-t ${
          isDark
            ? "bg-slate-900/95 border-slate-700"
            : "bg-white/80 backdrop-blur-xl border-gray-200"
        }`}
      >
        {/* Header */}
        <div className={`p-5 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={`p-2.5 rounded-xl shadow-lg ${
                appMode === "telegram"
                  ? "bg-gradient-to-br from-sky-500 to-blue-500 shadow-sky-500/30"
                  : appMode === "external"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-fuchsia-500 to-pink-500 shadow-fuchsia-500/30"
              }`}
            >
              <LayoutGrid className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1">
              <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                {appMode === "telegram" ? "Telegram" : appMode === "external" ? "Web Apps" : "Приложения"}
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {appMode === "telegram" ? "Telegram мини-приложения" : appMode === "external" ? "Внешние приложения с SSO" : "Магазин приложений"}
              </p>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
              isDark ? "bg-slate-800" : "bg-gray-100"
            }`}>
              <Package className={`w-3.5 h-3.5 ${appMode === "telegram" ? "text-sky-500" : appMode === "external" ? "text-emerald-500" : "text-fuchsia-500"}`} />
              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                {userModeApps.length}
              </span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className={`flex rounded-xl p-1 mb-4 ${isDark ? "bg-slate-800" : "bg-gray-100"}`}>
            <button
              onClick={() => { setAppMode("internal"); setSelectedCategory("all"); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                appMode === "internal"
                  ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              data-testid="button-mode-internal"
            >
              Приложения
            </button>
            <button
              onClick={() => { setAppMode("telegram"); setSelectedCategory("all"); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                appMode === "telegram"
                  ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              data-testid="button-mode-telegram"
            >
              Telegram
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                appMode === "telegram"
                  ? "bg-white/20 text-white"
                  : isDark
                  ? "bg-slate-700 text-slate-400"
                  : "bg-gray-200 text-gray-500"
              }`}>
                beta
              </span>
            </button>
            <button
              onClick={() => { setAppMode("external"); setSelectedCategory("all"); }}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                appMode === "external"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                  : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              data-testid="button-mode-external"
            >
              Web Apps
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                appMode === "external"
                  ? "bg-white/20 text-white"
                  : isDark
                  ? "bg-slate-700 text-slate-400"
                  : "bg-gray-200 text-gray-500"
              }`}>
                SSO
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? "text-slate-400" : "text-gray-400"
              }`}
            />
            <input
              type="text"
              placeholder="Поиск приложений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm ${
                isDark
                  ? "bg-slate-800/80 text-white placeholder-slate-400 border border-slate-700"
                  : "bg-white/80 text-gray-900 placeholder-gray-400 border border-gray-300"
              } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
              data-testid="input-apps-search"
            />
          </div>

          {/* Categories - filters user's added apps */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                  : isDark
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              data-testid="button-category-all"
            >
              Все
            </button>
            {userAppCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  selectedCategory === cat.id
                    ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                    : isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                data-testid={`button-category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Apps List */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-5">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {[1, 2, 3, 4].map((i) => (
                  <AppCardSkeleton key={i} isDark={isDark} />
                ))}
              </motion.div>
            ) : filteredUserApps.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  {searchQuery ? "Ничего не найдено" : "Нет добавленных приложений"}
                </p>
                {!searchQuery && (
                  <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Найдите приложения в витрине справа
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="apps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {filteredUserApps.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedApp(app)}
                    className={`p-3 rounded-xl cursor-pointer transition-all group ${
                      selectedApp?.id === app.id
                        ? isDark
                          ? "bg-gradient-to-r from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/40"
                          : "bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-200"
                        : isDark
                        ? "bg-slate-800/60 hover:bg-slate-700/60 border border-transparent"
                        : "bg-white/60 hover:bg-white/80 border border-transparent"
                    }`}
                    data-testid={`card-app-${app.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                          isDark ? "bg-slate-700" : "bg-gray-100"
                        }`}
                      >
                        {app.icon || "📱"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-medium truncate ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {app.name}
                          </h3>
                          {app.featured && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <p
                          className={`text-xs truncate mt-0.5 ${
                            isDark ? "text-slate-400" : "text-gray-500"
                          }`}
                        >
                          {app.shortDescription || "Без описания"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <RatingStars rating={app.rating || 0} size={12} isDark={isDark} />
                          <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                            {formatDownloads(app.downloads)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 ${
                          isDark ? "text-slate-500" : "text-gray-400"
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Right Panel - App Detail */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex-1 overflow-y-auto border-t border-l border-r ${
          isDark
            ? "bg-slate-800/50 border-slate-700"
            : "bg-white/30 backdrop-blur-sm border-gray-200"
        }`}
      >
        <AnimatePresence mode="wait">
          {selectedApp ? (
            <motion.div
              key={selectedApp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-8 max-w-3xl mx-auto border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}
            >
              {/* Back Button */}
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedApp(null)}
                className={`flex items-center gap-2 mb-6 px-3 py-2 rounded-lg transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-700/60"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                data-testid="button-back-to-store"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Назад в магазин</span>
              </motion.button>

              {/* App Header */}
              <div className="flex items-start gap-6 mb-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-xl ${
                    isDark ? "bg-slate-800" : "bg-white"
                  }`}
                >
                  {selectedApp.icon || "📱"}
                </motion.div>
                <div className="flex-1">
                  <h1 className={`text-2xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedApp.name}
                  </h1>
                  <p className={`text-sm mb-3 ${isDark ? "text-fuchsia-400" : "text-fuchsia-600"}`}>
                    {selectedApp.developer || "Неизвестный разработчик"}
                  </p>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5">
                      <RatingStars rating={reviews.length > 0 ? averageRating : 0} isDark={isDark} />
                      <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {reviews.length > 0 ? averageRating : 0}
                      </span>
                      {reviews.length > 0 && (
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          ({reviews.length})
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      <Download className="w-4 h-4 inline mr-1" />
                      {formatDownloads(selectedApp.downloads)}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {isAppAdded(selectedApp.id) ? (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleLaunchApp(selectedApp)}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-medium shadow-lg shadow-fuchsia-500/30 flex items-center gap-2"
                          data-testid="button-launch-app"
                        >
                          <Play className="w-4 h-4" />
                          Запустить
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRemoveApp(selectedApp.id)}
                          className={`px-4 py-2.5 rounded-xl font-medium ${
                            isDark
                              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                          data-testid="button-remove-app"
                        >
                          Удалить
                        </motion.button>
                      </>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAddApp(selectedApp.id)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-medium shadow-lg shadow-fuchsia-500/30 flex items-center gap-2"
                        data-testid="button-add-app"
                      >
                        <Download className="w-4 h-4" />
                        Добавить
                      </motion.button>
                    )}
                    {selectedApp.launchUrl && (
                      <motion.a
                        href={selectedApp.launchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
                          isDark
                            ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        data-testid="link-external-app"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </motion.a>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Описание
                </h2>
                <div 
                  className={`p-4 rounded-xl border ${
                    isDark 
                      ? "border-slate-600/50 bg-slate-800/40" 
                      : "border-gray-200 bg-white/60"
                  }`}
                  data-testid="description-block"
                >
                  <p className={`leading-relaxed ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    {selectedApp.description || "Описание отсутствует"}
                  </p>
                </div>
              </div>

              {/* Gallery */}
              <div className="mb-8">
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Галерея
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {(() => {
                    const screenshots = selectedApp.screenshots && selectedApp.screenshots.length > 0 
                      ? selectedApp.screenshots 
                      : [
                          `https://placehold.co/300x200/${isDark ? '334155' : 'e2e8f0'}/ffffff?text=Screenshot+1`,
                          `https://placehold.co/300x200/${isDark ? '334155' : 'e2e8f0'}/ffffff?text=Screenshot+2`,
                          `https://placehold.co/300x200/${isDark ? '334155' : 'e2e8f0'}/ffffff?text=Screenshot+3`,
                        ];
                    return screenshots.map((screenshot, index) => (
                      <img
                        key={index}
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        onClick={() => {
                          setScreenshotViewerImages(screenshots);
                          setScreenshotViewerIndex(index);
                          setScreenshotViewerOpen(true);
                        }}
                        className={`w-48 h-32 object-cover rounded-xl flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity ${isDark ? "bg-slate-700" : "bg-gray-100"}`}
                      />
                    ));
                  })()}
                </div>
              </div>

              {/* Info */}
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl mb-8 ${isDark ? "bg-slate-800/60" : "bg-white/60"}`}>
                <div>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Версия</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedApp.version || "1.0"}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>Цена</p>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {selectedApp.price ? `${selectedApp.price} ₽` : "Бесплатно"}
                  </p>
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Отзывы {reviews.length > 0 && `(${reviews.length})`}
                </h2>
                
                {/* Review Form */}
                {!userHasReview && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl mb-4 border ${
                      isDark 
                        ? "bg-slate-800/60 border-slate-600/50" 
                        : "bg-white/60 border-gray-200"
                    }`}
                    data-testid="review-form"
                  >
                    <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                      Оставить отзыв
                    </h3>
                    
                    {/* Star Rating Selector */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Ваша оценка:
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewReviewRating(star)}
                            className="transition-transform hover:scale-110"
                            data-testid={`star-${star}`}
                          >
                            <Star
                              className={`w-5 h-5 cursor-pointer transition-colors ${
                                star <= newReviewRating 
                                  ? "fill-amber-400 text-amber-400" 
                                  : isDark ? "text-slate-600 hover:text-amber-300" : "text-gray-300 hover:text-amber-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Title Input */}
                    <input
                      type="text"
                      placeholder="Заголовок (необязательно)"
                      value={newReviewTitle}
                      onChange={(e) => setNewReviewTitle(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg text-sm mb-2 ${
                        isDark
                          ? "bg-slate-700 text-white placeholder-slate-400 border border-slate-600"
                          : "bg-white text-gray-900 placeholder-gray-400 border border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                      data-testid="input-review-title"
                    />
                    
                    {/* Content Textarea */}
                    <textarea
                      placeholder="Напишите ваш отзыв..."
                      value={newReviewContent}
                      onChange={(e) => setNewReviewContent(e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg text-sm mb-3 resize-none ${
                        isDark
                          ? "bg-slate-700 text-white placeholder-slate-400 border border-slate-600"
                          : "bg-white text-gray-900 placeholder-gray-400 border border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50`}
                      data-testid="input-review-content"
                    />
                    
                    {/* Submit Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-sm font-medium shadow-lg shadow-fuchsia-500/30 disabled:opacity-50 flex items-center gap-2"
                      data-testid="button-submit-review"
                    >
                      {isSubmittingReview ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Отправить
                    </motion.button>
                  </motion.div>
                )}
                
                {userHasReview && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${
                    isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    Вы уже оставили отзыв на это приложение
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {isLoadingReviews ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center py-8"
                    >
                      <Loader2 className={`w-6 h-6 animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                    </motion.div>
                  ) : reviews.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`text-center py-8 rounded-xl ${isDark ? "bg-slate-800/40" : "bg-white/40"}`}
                    >
                      <Star className={`w-8 h-8 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        Пока нет отзывов
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reviews"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {reviews.map((review) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl ${isDark ? "bg-slate-800/60" : "bg-white/60"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isDark ? "bg-slate-700" : "bg-gray-200"
                              }`}
                            >
                              {review.user.avatarUrl ? (
                                <img
                                  src={review.user.avatarUrl}
                                  alt=""
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                  {review.user.displayName?.charAt(0) || "U"}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {review.user.displayName || "Пользователь"}
                                </span>
                                <RatingStars rating={review.rating} size={12} isDark={isDark} />
                              </div>
                              {review.title && (
                                <p className={`font-medium mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {review.title}
                                </p>
                              )}
                              {review.content && (
                                <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                                  {review.content}
                                </p>
                              )}
                              <p className={`text-xs mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="store-homepage"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto"
            >
              {/* Store Homepage */}
              <div className="p-6 space-y-4">
                {/* Hero Banner */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative overflow-hidden rounded-2xl p-8 ${
                    appMode === "telegram"
                      ? "bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700"
                      : "bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700"
                  }`}
                >
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      {appMode === "telegram" ? (
                        <Send className="w-5 h-5 text-white/90" />
                      ) : (
                        <Crown className="w-5 h-5 text-amber-300" />
                      )}
                      <span className="text-white/90 text-sm font-medium">
                        {appMode === "telegram" ? "Telegram Apps" : "Premium Store"}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {appMode === "telegram" 
                        ? "Откройте мир Telegram мини-приложений"
                        : "Добро пожаловать в магазин"
                      }
                    </h2>
                    <p className="text-white/80 text-sm max-w-md">
                      {appMode === "telegram"
                        ? "Игры, финансы, продуктивность — всё в одном месте"
                        : "Откройте для себя лучшие приложения для повышения продуктивности"
                      }
                    </p>
                  </div>
                </motion.div>

                {/* Store Search and Categories */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-4"
                >
                  {/* Store Search */}
                  <div className="relative">
                    <Search
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                        isDark ? "text-slate-400" : "text-gray-400"
                      }`}
                    />
                    <input
                      type="text"
                      placeholder="Поиск в магазине..."
                      value={storeSearchQuery}
                      onChange={(e) => setStoreSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm ${
                        isDark
                          ? "bg-slate-800/80 text-white placeholder-slate-400 border border-slate-700"
                          : "bg-white/80 text-gray-900 placeholder-gray-400 border border-gray-300"
                      } focus:outline-none focus:ring-2 ${
                        appMode === "telegram" ? "focus:ring-sky-500/50" : "focus:ring-fuchsia-500/50"
                      }`}
                      data-testid="input-store-search"
                    />
                  </div>

                  {/* Store Categories */}
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setStoreSelectedCategory("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                        storeSelectedCategory === "all"
                          ? appMode === "telegram"
                            ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white"
                            : "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                          : isDark
                          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                          : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
                      }`}
                      data-testid="button-store-category-all"
                    >
                      Все
                    </button>
                    {allModeCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setStoreSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                          storeSelectedCategory === cat.id
                            ? appMode === "telegram"
                              ? "bg-gradient-to-r from-sky-500 to-blue-500 text-white"
                              : "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white"
                            : isDark
                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            : "bg-white/60 text-gray-600 hover:bg-white/80 border border-gray-200"
                        }`}
                        data-testid={`button-store-category-${cat.id}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Show filtered results when searching or filtering, otherwise show homepage sections */}
                {(storeSearchQuery || storeSelectedCategory !== "all") ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Search className={`w-5 h-5 ${appMode === "telegram" ? "text-sky-500" : "text-fuchsia-500"}`} />
                      <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                        {storeSearchQuery ? `Результаты поиска (${filteredStoreApps.length})` : `Все приложения (${filteredStoreApps.length})`}
                      </h3>
                    </div>
                    {filteredStoreApps.length === 0 ? (
                      <div className={`text-center py-12 rounded-xl ${isDark ? "bg-slate-800/40" : "bg-white/40"}`}>
                        <Package className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          Ничего не найдено
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredStoreApps.map((app, index) => (
                          <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => setSelectedApp(app)}
                            className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] ${
                              isDark 
                                ? "bg-slate-800/40 hover:bg-slate-800/60" 
                                : "bg-white/60 hover:bg-white/80"
                            }`}
                          >
                            <div className={`w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl ${
                              isDark ? "bg-slate-700" : "bg-gray-100"
                            }`}>
                              {app.icon || "📱"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold line-clamp-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                                {app.name}
                              </h4>
                              <p className={`text-xs line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                {app.shortDescription || app.developer}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {isAppAdded(app.id) ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleLaunchApp(app); }}
                                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-white"
                                >
                                  Open
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
                                    appMode === "telegram"
                                      ? "border-sky-500 text-sky-500 hover:bg-sky-50"
                                      : "border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-50"
                                  } ${isDark ? "hover:bg-slate-700" : ""}`}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {/* All Apps Grid - App Store horizontal style */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {modeApps.map((app, index) => (
                          <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => setSelectedApp(app)}
                            className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] ${
                              isDark 
                                ? "bg-slate-800/40 hover:bg-slate-800/60" 
                                : "bg-white/60 hover:bg-white/80"
                            }`}
                          >
                            <div className={`w-14 h-14 flex-shrink-0 rounded-2xl flex items-center justify-center text-2xl ${
                              isDark ? "bg-slate-700" : "bg-gray-100"
                            }`}>
                              {app.icon || "📱"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-semibold line-clamp-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                                {app.name}
                              </h4>
                              <p className={`text-xs line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                {app.shortDescription || app.developer}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {isAppAdded(app.id) ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleLaunchApp(app); }}
                                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-white"
                                  data-testid={`button-launch-${app.id}`}
                                >
                                  Open
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
                                    appMode === "telegram"
                                      ? "border-sky-500 text-sky-500 hover:bg-sky-50"
                                      : "border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-50"
                                  } ${isDark ? "hover:bg-slate-700" : ""}`}
                                  data-testid={`button-view-${app.id}`}
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modal App Overlay - Full Screen */}
      <AnimatePresence>
        {activeModalApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col"
          >
            {/* Full screen app container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`flex-1 flex flex-col ${isDark ? "bg-slate-900" : "bg-gray-50"}`}
            >
              {/* App Header */}
              <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-slate-700 bg-slate-800" : "border-gray-200 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeModalApp.icon || "📱"}</span>
                  <h2 className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {activeModalApp.name}
                  </h2>
                </div>
                <button
                  onClick={handleCloseModalApp}
                  className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
                  data-testid="button-close-modal-app"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* App Content */}
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className={`w-8 h-8 animate-spin ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                  </div>
                }>
                  {activeModalApp.componentKey === "my_memory_map" && (
                    <MyMemoryMap isDark={isDark} onClose={handleCloseModalApp} />
                  )}
                  {activeModalApp.launchMode === "iframe" && activeModalApp.origin && (
                    <MiniAppModal app={activeModalApp} isDark={isDark} onClose={handleCloseModalApp} />
                  )}
                </Suspense>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screenshot Viewer Modal */}
      <AnimatePresence>
        {screenshotViewerOpen && screenshotViewerImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
            onClick={() => setScreenshotViewerOpen(false)}
          >
            <button
              onClick={() => setScreenshotViewerOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            {screenshotViewerImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScreenshotViewerIndex(prev => 
                      prev === 0 ? screenshotViewerImages.length - 1 : prev - 1
                    );
                  }}
                  className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronLeft className="w-8 h-8 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setScreenshotViewerIndex(prev => 
                      prev === screenshotViewerImages.length - 1 ? 0 : prev + 1
                    );
                  }}
                  className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                >
                  <ChevronRight className="w-8 h-8 text-white" />
                </button>
              </>
            )}
            
            <motion.img
              key={screenshotViewerIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={screenshotViewerImages[screenshotViewerIndex]}
              alt={`Screenshot ${screenshotViewerIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            {screenshotViewerImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {screenshotViewerImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setScreenshotViewerIndex(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === screenshotViewerIndex ? "bg-white" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
