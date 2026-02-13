import { useState, useEffect, useCallback, useId } from "react";
import { 
  Link as LinkIcon, 
  Plus, 
  Folder, 
  FolderOpen, 
  Trash2, 
  ExternalLink,
  Loader2,
  Globe,
  Edit2,
  X,
  Check,
  Search,
  Calendar,
  ArrowUpDown,
  Sparkles,
  Grid3x3,
  List,
  Clock,
  Star,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/components/ui/use-mobile";

interface LinkCategory {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdAt: string;
}

interface Link {
  id: string;
  userId: string;
  categoryId: string;
  url: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  image: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface LinkCenterProps {
  isDark?: boolean;
}

const StatBadge = ({ 
  icon: Icon, 
  value, 
  label, 
  gradient, 
  isDark 
}: { 
  icon: any; 
  value: number | string; 
  label: string; 
  gradient: string; 
  isDark: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
      isDark ? 'bg-slate-800/80' : 'bg-white/80'
    } backdrop-blur-sm`}
  >
    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient}`}>
      <Icon className="w-3.5 h-3.5 text-white" />
    </div>
    <div>
      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  </motion.div>
);

const LinkRing = ({ 
  percentage, 
  size = 56, 
  strokeWidth = 4,
  isDark 
}: { 
  percentage: number; 
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
}) => {
  const uniqueId = useId();
  const gradientId = `linkGradient-${uniqueId}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? '#374151' : '#e5e7eb'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeDasharray={circumference}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <TrendingUp className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
      </div>
    </div>
  );
};

export function LinkCenter({ isDark = false }: LinkCenterProps) {
  const [categories, setCategories] = useState<LinkCategory[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [categoryLinkCounts, setCategoryLinkCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "name">("date");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/link-categories", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        if (data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0].id);
        }
        const counts: Record<string, number> = {};
        for (const cat of data) {
          try {
            const linksRes = await fetch(`/api/links?categoryId=${cat.id}`, { credentials: "include" });
            if (linksRes.ok) {
              const linksData = await linksRes.json();
              counts[cat.id] = linksData.length;
            }
          } catch {
            counts[cat.id] = 0;
          }
        }
        setCategoryLinkCounts(counts);
      }
    } catch (error) {
      console.error("Error loading link categories:", error);
    }
  }, [selectedCategory]);

  const loadLinks = useCallback(async () => {
    if (!selectedCategory) return;
    try {
      const response = await fetch(`/api/links?categoryId=${selectedCategory}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setLinks(data);
      }
    } catch (error) {
      console.error("Error loading links:", error);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadCategories();
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadLinks();
    }
  }, [selectedCategory, loadLinks]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const response = await fetch("/api/link-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (response.ok) {
        const category = await response.json();
        setCategories([...categories, category]);
        setNewCategoryName("");
        setShowAddCategory(false);
        if (!selectedCategory) {
          setSelectedCategory(category.id);
        }
      }
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/link-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
        setEditingCategory(null);
      }
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingCategoryId(id);
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/link-categories/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (response.ok) {
          const remaining = categories.filter(c => c.id !== id);
          setCategories(remaining);
          setCategoryLinkCounts(prev => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
          if (selectedCategory === id) {
            setSelectedCategory(remaining.length > 0 ? remaining[0].id : null);
          }
        }
      } catch (error) {
        console.error("Error deleting category:", error);
      }
      setDeletingCategoryId(null);
    }, 300);
  };

  const handleCreateLink = async () => {
    if (!newLinkUrl.trim() || !selectedCategory) return;
    
    let url = newLinkUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    setIsFetchingMetadata(true);
    setIsCreatingLink(true);

    try {
      const metadataResponse = await fetch("/api/links/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      
      let metadata = { title: null, description: null, favicon: null, image: null };
      if (metadataResponse.ok) {
        metadata = await metadataResponse.json();
      }
      setIsFetchingMetadata(false);

      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          categoryId: selectedCategory,
          url,
          title: metadata.title,
          description: metadata.description,
          favicon: metadata.favicon,
          image: metadata.image,
        }),
      });

      if (response.ok) {
        const link = await response.json();
        setLinks([link, ...links]);
        setCategoryLinkCounts(prev => ({
          ...prev,
          [selectedCategory]: (prev[selectedCategory] || 0) + 1
        }));
        setNewLinkUrl("");
        setShowAddLink(false);
      }
    } catch (error) {
      console.error("Error creating link:", error);
    } finally {
      setIsFetchingMetadata(false);
      setIsCreatingLink(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    setDeletingLinkId(id);
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/links/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (response.ok) {
          setLinks(links.filter(l => l.id !== id));
          if (selectedCategory) {
            setCategoryLinkCounts(prev => ({
              ...prev,
              [selectedCategory]: Math.max((prev[selectedCategory] || 1) - 1, 0)
            }));
          }
        }
      } catch (error) {
        console.error("Error deleting link:", error);
      }
      setDeletingLinkId(null);
    }, 300);
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredLinks = links
    .filter((link) => {
      if (dateFilter !== "all") {
        const now = new Date();
        const linkDate = new Date(link.createdAt);
        if (dateFilter === "today") {
          if (linkDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (linkDate < weekAgo) return false;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (linkDate < monthAgo) return false;
        }
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (link.title?.toLowerCase().includes(query)) ||
          link.url.toLowerCase().includes(query) ||
          (link.description?.toLowerCase().includes(query))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return (a.title || getDomain(a.url)).localeCompare(b.title || getDomain(b.url));
    });

  const totalLinks = Object.values(categoryLinkCounts).reduce((sum, count) => sum + count, 0);
  const totalCategories = categories.length;
  const todayLinks = links.filter(l => {
    const today = new Date();
    const linkDate = new Date(l.createdAt);
    return linkDate.toDateString() === today.toDateString();
  }).length;

  if (isLoading) {
    return (
      <div className={`flex w-full h-full border-l border-t ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 border-gray-200'}`} data-testid="loading-link-center">
        {/* Left Sidebar Skeleton */}
        <div className={`w-full md:w-80 flex-shrink-0 flex flex-col overflow-hidden md:border-r ${isDark ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50' : 'bg-gradient-to-b from-white/90 to-gray-50/90 border-gray-200'}`}>
          <div className={`p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              <div className="flex-1">
                <div className={`h-4 w-24 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse mb-2`} />
                <div className={`h-3 w-16 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className={`h-12 flex-1 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              <div className={`h-12 flex-1 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
            </div>
          </div>
          <div className="p-3">
            <div className={`h-4 w-16 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse mb-3`} />
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                <div className={`w-8 h-8 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
                <div className="flex-1">
                  <div className={`h-3 w-20 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
                </div>
                <div className={`h-4 w-6 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              </div>
            ))}
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="hidden md:block flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className={`h-8 w-32 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
            <div className="flex gap-2">
              <div className={`h-9 w-64 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              <div className={`h-9 w-24 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`rounded-xl p-4 ${isDark ? 'bg-slate-800/50' : 'bg-white/80'}`}>
                <div className={`h-32 rounded-lg mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
                <div className={`h-4 w-3/4 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse mb-2`} />
                <div className={`h-3 w-1/2 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'} animate-pulse`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full h-full border-l border-t ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 border-gray-200'}`} data-testid="link-center">
      {isMobile ? (
        <AnimatePresence mode="wait">
          {selectedCategory ? (
            <motion.div key="links-mobile" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"tween",duration:0.25}} className="flex-1 flex flex-col overflow-hidden">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <button onClick={() => setSelectedCategory(null)} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/60' : 'text-gray-600 hover:bg-gray-100'}`} data-testid="button-mobile-back-to-link-categories">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Назад</span>
                </button>
              </div>
              <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isDark ? 'bg-slate-900' : ''}`}>
                {selectedCategory ? (
                  <>
                    <div className={`relative border-b border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200/70'}`}>
                      <div className="absolute inset-0 overflow-hidden">
                        <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/5' : 'bg-indigo-400/10'}`} />
                      </div>

                      <div className={`relative px-6 py-4 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-xl`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                              <FolderOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {categories.find(c => c.id === selectedCategory)?.name || "Ссылки"}
                              </h3>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {filteredLinks.length} ссылок
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02, y: -1 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setShowAddLink(true)}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 text-white font-semibold flex items-center gap-2 text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-shadow"
                              data-testid="button-add-link"
                            >
                              <Plus className="w-4 h-4" />
                              Добавить
                            </motion.button>
                          </div>
                        </div>

                        <div className="relative">
                          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                          <input
                            type="text"
                            placeholder="Поиск ссылок..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 backdrop-blur-sm focus:outline-none transition-all text-sm ${
                              isDark 
                                ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:border-indigo-500' 
                                : 'border-gray-200 bg-white focus:border-indigo-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      {filteredLinks.length === 0 ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="h-full flex items-center justify-center"
                        >
                          <div className="text-center">
                            <div className={`p-6 rounded-3xl inline-block mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                              <LinkIcon className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                            </div>
                            <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                              {searchQuery ? "Ничего не найдено" : "Нет ссылок"}
                            </p>
                            <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                              {searchQuery ? "Попробуйте изменить запрос" : "Добавьте первую ссылку"}
                            </p>
                            {!searchQuery && (
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddLink(true)}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30"
                              >
                                <Plus className="w-4 h-4 inline mr-2" />
                                Добавить ссылку
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ) : viewMode === "grid" ? (
                        <div className="grid grid-cols-1 gap-4">
                          <AnimatePresence mode="popLayout">
                            {filteredLinks.map((link, index) => {
                              const isDeleting = deletingLinkId === link.id;
                              
                              return (
                                <motion.div
                                  key={link.id}
                                  layout
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ 
                                    opacity: isDeleting ? 0 : 1, 
                                    scale: isDeleting ? 0.8 : 1,
                                    y: isDeleting ? 20 : 0
                                  }}
                                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                  transition={{ 
                                    type: "spring", 
                                    stiffness: 500, 
                                    damping: 40,
                                    delay: index * 0.02
                                  }}
                                  className={`group relative rounded-2xl overflow-hidden cursor-pointer ${
                                    isDark 
                                      ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-indigo-500/40' 
                                      : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-indigo-300/60 shadow-sm'
                                  }`}
                                  onClick={() => window.open(link.url, "_blank")}
                                  data-testid={`link-card-${link.id}`}
                                >
                                  <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500`} />

                                  {link.image ? (
                                    <div className={`relative h-32 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                      <img
                                        src={link.image}
                                        alt={link.title || "Preview"}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                    </div>
                                  ) : (
                                    <div className={`h-24 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-violet-50'}`}>
                                      <Globe className={`w-10 h-10 ${isDark ? 'text-slate-500' : 'text-indigo-300'}`} />
                                    </div>
                                  )}

                                  <div className="p-4">
                                    <div className="flex items-start gap-3 mb-2">
                                      {link.favicon ? (
                                        <img
                                          src={link.favicon}
                                          alt=""
                                          className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <Globe className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <h4 className={`font-semibold truncate text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                          {link.title || getDomain(link.url)}
                                        </h4>
                                        <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                                          {getDomain(link.url)}
                                        </p>
                                      </div>
                                    </div>

                                    {link.description && (
                                      <p className={`text-xs line-clamp-2 mb-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                        {link.description}
                                      </p>
                                    )}

                                    <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                                      <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                        <Clock className="w-3 h-3" />
                                        <span>{formatDate(link.createdAt)}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(link.url, "_blank");
                                          }}
                                          className={`p-1.5 rounded-lg transition-all ${
                                            isDark ? 'hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'
                                          }`}
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </motion.button>
                                        <motion.button
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteLink(link.id);
                                          }}
                                          className={`p-1.5 rounded-lg transition-all ${
                                            isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                                          }`}
                                          data-testid={`button-delete-link-${link.id}`}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </motion.button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <AnimatePresence mode="popLayout">
                            {filteredLinks.map((link, index) => {
                              const isDeleting = deletingLinkId === link.id;
                              
                              return (
                                <motion.div
                                  key={link.id}
                                  layout
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ 
                                    opacity: isDeleting ? 0 : 1, 
                                    x: isDeleting ? 50 : 0,
                                    scale: isDeleting ? 0.95 : 1
                                  }}
                                  exit={{ opacity: 0, x: 50, scale: 0.95 }}
                                  transition={{ 
                                    type: "spring", 
                                    stiffness: 500, 
                                    damping: 40,
                                    delay: index * 0.02
                                  }}
                                  className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                                    isDark 
                                      ? 'bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-indigo-500/40' 
                                      : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-indigo-300/60 shadow-sm'
                                  }`}
                                  onClick={() => window.open(link.url, "_blank")}
                                  data-testid={`link-card-list-${link.id}`}
                                >
                                  <div className="w-1 h-12 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                                  
                                  {link.favicon ? (
                                    <img
                                      src={link.favicon}
                                      alt=""
                                      className="w-10 h-10 rounded-xl flex-shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-indigo-50'}`}>
                                      <Globe className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-indigo-500'}`} />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <h4 className={`font-semibold truncate text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {link.title || getDomain(link.url)}
                                    </h4>
                                    <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                                      {getDomain(link.url)} · {formatDate(link.createdAt)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(link.url, "_blank");
                                      }}
                                      className={`p-2 rounded-xl transition-all ${
                                        isDark ? 'hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'
                                      }`}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLink(link.id);
                                      }}
                                      className={`p-2 rounded-xl transition-all ${
                                        isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                                      }`}
                                      data-testid={`button-delete-link-list-${link.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </motion.button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center"
                    >
                      <div className={`p-6 rounded-3xl inline-block mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                        <Folder className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                      </div>
                      <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        Выберите папку
                      </p>
                      <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        Создайте папку для организации ссылок
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAddCategory(true)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Создать папку
                      </motion.button>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="categories-mobile" initial={{opacity:0}} animate={{opacity:1}} exit={{x:"-30%",opacity:0}} transition={{type:"tween",duration:0.2}} className="flex-1 flex flex-col overflow-hidden">
              <div className={`w-full flex-shrink-0 flex flex-col overflow-hidden ${isDark ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50' : 'bg-gradient-to-b from-white/90 to-gray-50/90 backdrop-blur-xl border-gray-200'}`}>
        <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
            <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-violet-600/10' : 'bg-violet-400/20'}`} />
          </div>
          
          <div className="relative p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'}`}
                />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Link Center
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Коллекция ссылок
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <LinkRing percentage={Math.min((totalLinks / 50) * 100, 100)} isDark={isDark} />
              <div className="flex-1 grid grid-cols-2 gap-2">
                <StatBadge icon={LinkIcon} value={totalLinks} label="Ссылок" gradient="from-indigo-500 to-violet-600" isDark={isDark} />
                <StatBadge icon={Folder} value={totalCategories} label="Папок" gradient="from-violet-500 to-purple-600" isDark={isDark} />
              </div>
            </div>

            {todayLinks > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}
              >
                <Sparkles className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  +{todayLinks} сегодня
                </span>
              </motion.div>
            )}
          </div>
        </div>

        <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Папки</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddCategory(true)}
            className={`p-2 rounded-xl transition-all ${
              isDark 
                ? 'bg-slate-700/50 hover:bg-slate-700 text-indigo-400' 
                : 'bg-white/60 hover:bg-white text-indigo-600 shadow-sm'
            }`}
            title="Создать папку"
            data-testid="button-add-category"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          <AnimatePresence mode="popLayout">
            {categories.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center py-8 px-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
              >
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Создайте первую папку</p>
              </motion.div>
            ) : (
              categories.map((category, index) => {
                const isSelected = selectedCategory === category.id;
                const isDeleting = deletingCategoryId === category.id;
                const categoryLinks = categoryLinkCounts[category.id] || 0;
                
                return (
                  <motion.div
                    key={category.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: isDeleting ? 0 : 1, 
                      x: isDeleting ? -50 : 0,
                      scale: isDeleting ? 0.9 : 1
                    }}
                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 500, 
                      damping: 40,
                      delay: index * 0.03
                    }}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? isDark 
                          ? "bg-gradient-to-r from-indigo-600/30 to-violet-600/20 ring-1 ring-indigo-500/50 shadow-lg" 
                          : "bg-gradient-to-r from-indigo-50 to-violet-50 ring-1 ring-indigo-300 shadow-md"
                        : isDark 
                          ? "hover:bg-slate-700/50" 
                          : "hover:bg-white/60"
                    }`}
                    whileHover={{ x: 4 }}
                    data-testid={`category-${category.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected 
                          ? isDark ? 'bg-indigo-500/30' : 'bg-indigo-100'
                          : isDark ? 'bg-slate-700/50' : 'bg-gray-100'
                      }`}>
                        {isSelected ? (
                          <FolderOpen className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                        ) : (
                          <Folder className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      
                      {editingCategory === category.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className={`flex-1 px-2 py-1 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-gray-300 text-gray-900'}`}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateCategory(category.id, editingCategoryName);
                              if (e.key === "Escape") setEditingCategory(null);
                            }}
                            data-testid="input-edit-category"
                          />
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleUpdateCategory(category.id, editingCategoryName)}
                            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"
                            data-testid="button-save-category"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                              {category.name}
                            </div>
                            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {categoryLinks} ссылок
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(category.id);
                                setEditingCategoryName(category.name);
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'
                              }`}
                              data-testid={`button-edit-category-${category.id}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category.id);
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                              }`}
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </motion.button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <>
          <div className={`w-full md:w-80 flex-shrink-0 flex flex-col overflow-hidden border-r ${isDark ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50' : 'bg-gradient-to-b from-white/90 to-gray-50/90 backdrop-blur-xl border-gray-200'}`}>
            <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
              <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
                <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-violet-600/10' : 'bg-violet-400/20'}`} />
              </div>
              
              <div className="relative p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                      <LinkIcon className="w-5 h-5 text-white" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'}`}
                    />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Link Center
                    </h2>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Коллекция ссылок
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <LinkRing percentage={Math.min((totalLinks / 50) * 100, 100)} isDark={isDark} />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <StatBadge icon={LinkIcon} value={totalLinks} label="Ссылок" gradient="from-indigo-500 to-violet-600" isDark={isDark} />
                    <StatBadge icon={Folder} value={totalCategories} label="Папок" gradient="from-violet-500 to-purple-600" isDark={isDark} />
                  </div>
                </div>

                {todayLinks > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}
                  >
                    <Sparkles className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className={`text-xs font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      +{todayLinks} сегодня
                    </span>
                  </motion.div>
                )}
              </div>
            </div>

            <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Папки</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddCategory(true)}
                className={`p-2 rounded-xl transition-all ${
                  isDark 
                    ? 'bg-slate-700/50 hover:bg-slate-700 text-indigo-400' 
                    : 'bg-white/60 hover:bg-white text-indigo-600 shadow-sm'
                }`}
                title="Создать папку"
                data-testid="button-add-category"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {categories.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-center py-8 px-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
                  >
                    <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Создайте первую папку</p>
                  </motion.div>
                ) : (
                  categories.map((category, index) => {
                    const isSelected = selectedCategory === category.id;
                    const isDeleting = deletingCategoryId === category.id;
                    const categoryLinks = categoryLinkCounts[category.id] || 0;
                    
                    return (
                      <motion.div
                        key={category.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: isDeleting ? 0 : 1, 
                          x: isDeleting ? -50 : 0,
                          scale: isDeleting ? 0.9 : 1
                        }}
                        exit={{ opacity: 0, x: -50, scale: 0.9 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 500, 
                          damping: 40,
                          delay: index * 0.03
                        }}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`group p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? isDark 
                              ? "bg-gradient-to-r from-indigo-600/30 to-violet-600/20 ring-1 ring-indigo-500/50 shadow-lg" 
                              : "bg-gradient-to-r from-indigo-50 to-violet-50 ring-1 ring-indigo-300 shadow-md"
                            : isDark 
                              ? "hover:bg-slate-700/50" 
                              : "hover:bg-white/60"
                        }`}
                        whileHover={{ x: 4 }}
                        data-testid={`category-${category.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected 
                              ? isDark ? 'bg-indigo-500/30' : 'bg-indigo-100'
                              : isDark ? 'bg-slate-700/50' : 'bg-gray-100'
                          }`}>
                            {isSelected ? (
                              <FolderOpen className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                            ) : (
                              <Folder className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                            )}
                          </div>
                          
                          {editingCategory === category.id ? (
                            <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => setEditingCategoryName(e.target.value)}
                                className={`flex-1 px-2 py-1 rounded-lg text-sm ${isDark ? 'bg-slate-700 text-white border border-slate-600' : 'bg-white border border-gray-300 text-gray-900'}`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdateCategory(category.id, editingCategoryName);
                                  if (e.key === "Escape") setEditingCategory(null);
                                }}
                                data-testid="input-edit-category"
                              />
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleUpdateCategory(category.id, editingCategoryName)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400"
                                data-testid="button-save-category"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                  {category.name}
                                </div>
                                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                  {categoryLinks} ссылок
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingCategory(category.id);
                                    setEditingCategoryName(category.name);
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'
                                  }`}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCategory(category.id);
                                  }}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                  }`}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </motion.button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${isDark ? 'bg-slate-900' : ''}`}>
            {selectedCategory ? (
              <>
                <div className={`relative border-b border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200/70'}`}>
                  <div className="absolute inset-0 overflow-hidden">
                    <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/5' : 'bg-indigo-400/10'}`} />
                  </div>

                  <div className={`relative px-6 py-4 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-xl`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                          <FolderOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {categories.find(c => c.id === selectedCategory)?.name || "Ссылки"}
                          </h3>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {filteredLinks.length} ссылок
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}>
                          <Calendar className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                          <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as any)}
                            className={`text-sm font-medium focus:outline-none bg-transparent ${
                              isDark ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            <option value="all">Все время</option>
                            <option value="today">Сегодня</option>
                            <option value="week">7 дней</option>
                            <option value="month">30 дней</option>
                          </select>
                        </div>
                        
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className={`px-3 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                            isDark 
                              ? 'bg-slate-800 border border-slate-700 text-white' 
                              : 'bg-white border border-gray-200 text-gray-700'
                          }`}
                        >
                          <option value="date">По дате</option>
                          <option value="name">По имени</option>
                        </select>

                        <div className={`flex rounded-xl p-1 ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded-lg transition-all ${
                              viewMode === "grid"
                                ? isDark ? "bg-indigo-500/20 text-indigo-400 shadow-sm" : "bg-indigo-50 text-indigo-600 shadow-sm"
                                : isDark ? "text-slate-400 hover:text-indigo-400" : "text-gray-500 hover:text-indigo-600"
                            }`}
                          >
                            <Grid3x3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded-lg transition-all ${
                              viewMode === "list"
                                ? isDark ? "bg-indigo-500/20 text-indigo-400 shadow-sm" : "bg-indigo-50 text-indigo-600 shadow-sm"
                                : isDark ? "text-slate-400 hover:text-indigo-400" : "text-gray-500 hover:text-indigo-600"
                            }`}
                          >
                            <List className="w-4 h-4" />
                          </motion.button>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAddLink(true)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 text-white font-semibold flex items-center gap-2 text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-shadow"
                          data-testid="button-add-link"
                        >
                          <Plus className="w-4 h-4" />
                          Добавить
                        </motion.button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                      <input
                        type="text"
                        placeholder="Поиск ссылок..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 backdrop-blur-sm focus:outline-none transition-all text-sm ${
                          isDark 
                            ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:border-indigo-500' 
                            : 'border-gray-200 bg-white focus:border-indigo-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {filteredLinks.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full flex items-center justify-center"
                    >
                      <div className="text-center">
                        <div className={`p-6 rounded-3xl inline-block mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                          <LinkIcon className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                        </div>
                        <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                          {searchQuery ? "Ничего не найдено" : "Нет ссылок"}
                        </p>
                        <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                          {searchQuery ? "Попробуйте изменить запрос" : "Добавьте первую ссылку"}
                        </p>
                        {!searchQuery && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowAddLink(true)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30"
                          >
                            <Plus className="w-4 h-4 inline mr-2" />
                            Добавить ссылку
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      <AnimatePresence mode="popLayout">
                        {filteredLinks.map((link, index) => {
                          const isDeleting = deletingLinkId === link.id;
                          
                          return (
                            <motion.div
                              key={link.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ 
                                opacity: isDeleting ? 0 : 1, 
                                scale: isDeleting ? 0.8 : 1,
                                y: isDeleting ? 20 : 0
                              }}
                              exit={{ opacity: 0, scale: 0.8, y: 20 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 500, 
                                damping: 40,
                                delay: index * 0.02
                              }}
                              whileHover={{ y: -4, boxShadow: isDark 
                                ? "0 20px 40px -12px rgba(99, 102, 241, 0.15)" 
                                : "0 20px 40px -12px rgba(99, 102, 241, 0.2)" 
                              }}
                              className={`group relative rounded-2xl overflow-hidden cursor-pointer ${
                                isDark 
                                  ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-indigo-500/40' 
                                  : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-indigo-300/60 shadow-sm'
                              }`}
                              onClick={() => window.open(link.url, "_blank")}
                              data-testid={`link-card-${link.id}`}
                            >
                              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500`} />

                              {link.image ? (
                                <div className={`relative h-32 overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                                  <img
                                    src={link.image}
                                    alt={link.title || "Preview"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                </div>
                              ) : (
                                <div className={`h-24 flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-indigo-50 to-violet-50'}`}>
                                  <Globe className={`w-10 h-10 ${isDark ? 'text-slate-500' : 'text-indigo-300'}`} />
                                </div>
                              )}

                              <div className="p-4">
                                <div className="flex items-start gap-3 mb-2">
                                  {link.favicon ? (
                                    <img
                                      src={link.favicon}
                                      alt=""
                                      className="w-5 h-5 rounded flex-shrink-0 mt-0.5"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Globe className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className={`font-semibold truncate text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      {link.title || getDomain(link.url)}
                                    </h4>
                                    <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                                      {getDomain(link.url)}
                                    </p>
                                  </div>
                                </div>

                                {link.description && (
                                  <p className={`text-xs line-clamp-2 mb-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                    {link.description}
                                  </p>
                                )}

                                <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                                  <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDate(link.createdAt)}</span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(link.url, "_blank");
                                      }}
                                      className={`p-1.5 rounded-lg transition-all ${
                                        isDark ? 'hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'
                                      }`}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLink(link.id);
                                      }}
                                      className={`p-1.5 rounded-lg transition-all ${
                                        isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                                      }`}
                                      data-testid={`button-delete-link-${link.id}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {filteredLinks.map((link, index) => {
                          const isDeleting = deletingLinkId === link.id;
                          
                          return (
                            <motion.div
                              key={link.id}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ 
                                opacity: isDeleting ? 0 : 1, 
                                x: isDeleting ? 50 : 0,
                                scale: isDeleting ? 0.95 : 1
                              }}
                              exit={{ opacity: 0, x: 50, scale: 0.95 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 500, 
                                damping: 40,
                                delay: index * 0.02
                              }}
                              whileHover={{ x: 4 }}
                              className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                                isDark 
                                  ? 'bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-indigo-500/40' 
                                  : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-indigo-300/60 shadow-sm'
                              }`}
                              onClick={() => window.open(link.url, "_blank")}
                              data-testid={`link-card-list-${link.id}`}
                            >
                              <div className="w-1 h-12 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                              
                              {link.favicon ? (
                                <img
                                  src={link.favicon}
                                  alt=""
                                  className="w-10 h-10 rounded-xl flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-indigo-50'}`}>
                                  <Globe className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-indigo-500'}`} />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <h4 className={`font-semibold truncate text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                  {link.title || getDomain(link.url)}
                                </h4>
                                <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                                  {getDomain(link.url)} · {formatDate(link.createdAt)}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(link.url, "_blank");
                                  }}
                                  className={`p-2 rounded-xl transition-all ${
                                    isDark ? 'hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400' : 'hover:bg-indigo-50 text-gray-500 hover:text-indigo-600'
                                  }`}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteLink(link.id);
                                  }}
                                  className={`p-2 rounded-xl transition-all ${
                                    isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                                  }`}
                                  data-testid={`button-delete-link-list-${link.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <div className={`p-6 rounded-3xl inline-block mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                    <Folder className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                  </div>
                  <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    Выберите папку
                  </p>
                  <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    Создайте папку для организации ссылок
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddCategory(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/30"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Создать папку
                  </motion.button>
                </motion.div>
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {showAddCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddCategory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`rounded-3xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white shadow-2xl'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Новая папка</h3>
              </div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название папки..."
                className={`w-full rounded-xl px-4 py-3 focus:outline-none border-2 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400'}`}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                data-testid="input-new-category"
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddCategory(false)}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Отмена
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-create-category"
                >
                  Создать
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => !isCreatingLink && setShowAddLink(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`rounded-3xl p-6 w-full max-w-md mx-4 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white shadow-2xl'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
                  <LinkIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Добавить ссылку</h3>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>URL сайта</label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full rounded-xl px-4 py-3 focus:outline-none border-2 transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400'}`}
                  autoFocus
                  disabled={isCreatingLink}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateLink()}
                  data-testid="input-new-link"
                />
              </div>

              {isFetchingMetadata && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-2 mb-4 px-4 py-3 rounded-xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}
                >
                  <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <span className={`text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    Загрузка информации...
                  </span>
                </motion.div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => !isCreatingLink && setShowAddLink(false)}
                  disabled={isCreatingLink}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Отмена
                </button>
                <motion.button
                  whileHover={{ scale: isCreatingLink ? 1 : 1.02 }}
                  whileTap={{ scale: isCreatingLink ? 1 : 0.98 }}
                  onClick={handleCreateLink}
                  disabled={!newLinkUrl.trim() || isCreatingLink}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  data-testid="button-create-link"
                >
                  {isCreatingLink ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Добавить"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
