import { useState, useId } from "react";
import { Pin, MapPin, Plus, ChevronDown, Check, FolderOpen, Folder, Briefcase, Home, GraduationCap, Star, Heart, Bookmark, Zap, Target, Coffee, Music, Camera, Book, Lightbulb, Award, Trash2, Route, Flag } from "lucide-react";
import { RoadMap, Notebook, RoadmapCategory } from "../App";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  FolderOpen,
  Folder,
  Briefcase,
  Home,
  GraduationCap,
  Star,
  Heart,
  Bookmark,
  Zap,
  Target,
  Coffee,
  Music,
  Camera,
  Book,
  Lightbulb,
  Award,
  MapPin,
  Route,
  Flag,
};

const availableIcons = [
  { id: "MapPin", name: "Map Pin" },
  { id: "Route", name: "Route" },
  { id: "Flag", name: "Flag" },
  { id: "Briefcase", name: "Work" },
  { id: "Home", name: "Home" },
  { id: "GraduationCap", name: "Study" },
  { id: "Star", name: "Star" },
  { id: "Heart", name: "Heart" },
  { id: "Bookmark", name: "Bookmark" },
  { id: "Zap", name: "Zap" },
  { id: "Target", name: "Target" },
  { id: "Coffee", name: "Coffee" },
  { id: "Music", name: "Music" },
  { id: "Camera", name: "Camera" },
  { id: "Book", name: "Book" },
  { id: "Lightbulb", name: "Lightbulb" },
  { id: "Award", name: "Award" },
];

const availableColors = [
  "#6366f1",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
];

interface RoadMapListProps {
  roadmaps: RoadMap[];
  selectedRoadMap: RoadMap | null;
  onSelectRoadMap: (roadmap: RoadMap) => void;
  onTogglePin: (roadmapId: string) => void;
  searchQuery: string;
  notebooks: Notebook[];
  roadmapCategories?: RoadmapCategory[];
  onAddRoadmapCategory?: (name: string, icon?: string, color?: string) => Promise<RoadmapCategory | null>;
  onUpdateRoadmapCategory?: (roadmapId: string, categoryId: string | null) => void;
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  onDeleteRoadMap?: (roadmapId: string) => void;
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

const MiniProgressRing = ({ 
  progress, 
  size = 36, 
  strokeWidth = 3,
  isDark 
}: { 
  progress: number; 
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
}) => {
  const uniqueId = useId();
  const gradientId = `progressGradient-${uniqueId}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {progress === 100 ? (
              <>
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#10B981" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#A78BFA" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#7C3AED" />
              </>
            )}
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
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeDasharray={circumference}
          style={{
            filter: progress === 100 
              ? 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.6))' 
              : 'drop-shadow(0 0 4px rgba(139, 92, 246, 0.5))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[9px] font-bold ${
          progress === 100 
            ? 'text-emerald-500' 
            : isDark ? 'text-purple-400' : 'text-purple-600'
        }`}>
          {progress}%
        </span>
      </div>
    </div>
  );
};

export function RoadMapList({
  roadmaps,
  selectedRoadMap,
  onSelectRoadMap,
  onTogglePin,
  searchQuery,
  roadmapCategories = [],
  onAddRoadmapCategory,
  onUpdateRoadmapCategory,
  selectedCategory: externalSelectedCategory = "all",
  onCategoryChange,
  onDeleteRoadMap,
  isDark = false,
}: RoadMapListProps) {
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("MapPin");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [categoryMenuOpenFor, setCategoryMenuOpenFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeCategory = externalSelectedCategory;
  const handleCategoryChange = (categoryId: string) => {
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  };

  const allCategories = [
    { id: "all", name: "Все карты", icon: "Route", color: "#6366f1" },
    ...roadmapCategories.map((cat: any) => ({ 
      id: cat.id, 
      name: cat.name, 
      icon: cat.icon || "MapPin",
      color: cat.color || "#6366f1"
    }))
  ];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const getCategoryById = (categoryId?: string) => {
    if (!categoryId) return null;
    return roadmapCategories.find((c: any) => c.id === categoryId);
  };

  const filteredRoadMaps = roadmaps
    .filter((roadmap) => {
      if (searchQuery && !roadmap.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (activeCategory !== "all") {
        if (roadmap.categoryId !== activeCategory) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !onAddRoadmapCategory) return;
    
    const newCategory = await onAddRoadmapCategory(newCategoryName.trim(), newCategoryIcon, newCategoryColor);
    if (newCategory) {
      setNewCategoryName("");
      setNewCategoryIcon("MapPin");
      setNewCategoryColor("#6366f1");
      setIsCreateCategoryOpen(false);
    }
  };

  const handleAssignCategory = (roadmapId: string, categoryId: string | null) => {
    if (onUpdateRoadmapCategory) {
      onUpdateRoadmapCategory(roadmapId, categoryId);
    }
    setCategoryMenuOpenFor(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/roadmap-categories/${categoryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleDelete = (roadmapId: string) => {
    setDeletingId(roadmapId);
    setTimeout(() => {
      if (onDeleteRoadMap) {
        onDeleteRoadMap(roadmapId);
      }
      setDeletingId(null);
    }, 300);
  };

  const completedMilestones = roadmaps.reduce((acc, r) => acc + r.milestones.filter(m => m.completed).length, 0);
  const totalMilestones = roadmaps.reduce((acc, r) => acc + r.milestones.length, 0);
  const pinnedCount = roadmaps.filter(r => r.pinned).length;

  const isLightColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  };

  return (
    <div className={`w-full md:w-80 flex flex-col flex-shrink-0 border-l border-t overflow-hidden ${isDark ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50' : 'bg-gradient-to-b from-white/90 to-gray-50/90 backdrop-blur-xl border-gray-200'}`}>
      <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
          <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
        </div>
        
        <div className="relative p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30`}>
                <Route className="w-5 h-5 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"
              />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Дорожные карты
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Планируйте путь к цели
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatBadge icon={Route} value={roadmaps.length} label="Карт" gradient="from-indigo-500 to-purple-600" isDark={isDark} />
            <StatBadge icon={Flag} value={`${completedMilestones}/${totalMilestones}`} label="Этапов" gradient="from-emerald-400 to-green-500" isDark={isDark} />
            <StatBadge icon={Pin} value={pinnedCount} label="Закреп." gradient="from-amber-400 to-orange-500" isDark={isDark} />
          </div>
        </div>
      </div>

      <div className={`p-3 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex gap-2 min-w-max">
            {allCategories.map((category) => {
              const IconComponent = iconMap[category.icon] || MapPin;
              const isActive = activeCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCategoryChange(category.id)}
                  data-testid={`roadmap-category-filter-${category.id}`}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "shadow-lg"
                      : isDark 
                        ? "bg-slate-700/50 text-slate-200 hover:bg-slate-700 border border-slate-600/50" 
                        : "bg-white/60 text-gray-700 hover:bg-white border border-gray-200"
                  }`}
                  style={isActive ? {
                    backgroundColor: category.color,
                    color: isLightColor(category.color) ? '#1f2937' : '#ffffff',
                    boxShadow: `0 4px 14px ${category.color}40`
                  } : {}}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  {category.name}
                </motion.button>
              );
            })}
            
            {onAddRoadmapCategory && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCreateCategoryOpen(true)}
                data-testid="button-create-roadmap-category"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border-2 border-dashed ${
                  isDark 
                    ? 'border-slate-600 text-slate-300 hover:border-purple-500 hover:text-purple-400' 
                    : 'border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-500'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Создать
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredRoadMaps.map((roadmap, index) => {
            const category = getCategoryById(roadmap.categoryId);
            const isSelected = selectedRoadMap?.id === roadmap.id;
            const isDeleting = deletingId === roadmap.id;
            const completedCount = roadmap.milestones.filter(m => m.completed).length;
            const totalCount = roadmap.milestones.length;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            return (
              <motion.div
                key={roadmap.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ 
                  opacity: isDeleting ? 0 : 1, 
                  y: 0, 
                  scale: isDeleting ? 0.8 : 1,
                  x: isDeleting ? 100 : 0
                }}
                exit={{ opacity: 0, scale: 0.8, x: 100 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 500, 
                  damping: 40,
                  delay: index * 0.05
                }}
                onClick={() => onSelectRoadMap(roadmap)}
                className={`group relative p-4 rounded-2xl cursor-pointer transition-all overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-purple-500/40' 
                    : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-purple-300/60'
                } ${
                  isSelected
                    ? isDark ? "ring-1 ring-purple-500/60 border-purple-500/60" : "ring-1 ring-purple-400/60 border-purple-400"
                    : ""
                } ${isDark ? 'shadow-lg shadow-black/10' : 'shadow-md shadow-gray-200/50'}`}
                whileHover={{ 
                  y: -2,
                  boxShadow: isDark 
                    ? "0 20px 40px -12px rgba(139, 92, 246, 0.15)" 
                    : "0 20px 40px -12px rgba(139, 92, 246, 0.2)"
                }}
              >
                {progress > 0 && (
                  <div className={`absolute top-0 left-0 right-0 h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden rounded-t-2xl`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full ${
                        progress === 100 
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                          : 'bg-gradient-to-r from-purple-400 via-indigo-500 to-purple-600'
                      }`}
                      style={{
                        boxShadow: progress === 100 
                          ? '0 0 12px rgba(52, 211, 153, 0.6)' 
                          : '0 0 12px rgba(139, 92, 246, 0.5)'
                      }}
                    />
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(roadmap.id);
                  }}
                  className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10 ${
                    isDark ? 'bg-slate-700/80 hover:bg-red-500/30 text-slate-300 hover:text-red-400' : 'bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500'
                  }`}
                  data-testid={`delete-roadmap-${roadmap.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>

                <div className="flex items-center gap-2 mb-3">
                  <Popover open={categoryMenuOpenFor === roadmap.id} onOpenChange={(open) => setCategoryMenuOpenFor(open ? roadmap.id : null)}>
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                          isDark ? 'bg-slate-700/70 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        data-testid={`button-roadmap-category-${roadmap.id}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ 
                            backgroundColor: category?.color || "#6B7280",
                            boxShadow: `0 0 6px ${category?.color || "#6B7280"}60`
                          }}
                        />
                        <span>{category?.name || "Без категории"}</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-52 p-2 rounded-2xl z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`} align="start">
                      <div className="space-y-1">
                        <motion.button 
                          whileHover={{ x: 4 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCategory(roadmap.id, null);
                          }}
                          className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                            isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="w-3 h-3 rounded-full bg-gray-400" />
                          <span>Без категории</span>
                          {!roadmap.categoryId && <Check className="w-4 h-4 ml-auto text-emerald-500" />}
                        </motion.button>
                        {roadmapCategories.length > 0 && <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />}
                        {roadmapCategories.map((cat: any) => {
                          const CatIcon = iconMap[cat.icon || "MapPin"] || MapPin;
                          return (
                            <motion.button 
                              key={cat.id}
                              whileHover={{ x: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignCategory(roadmap.id, cat.id);
                              }}
                              className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                                isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.color || "#6366f1" }}
                              />
                              <span style={{ color: cat.color || "#6366f1" }}>
                                <CatIcon className="w-4 h-4" />
                              </span>
                              <span>{cat.name}</span>
                              {roadmap.categoryId === cat.id && <Check className="w-4 h-4 ml-auto text-emerald-500" />}
                            </motion.button>
                          );
                        })}
                        {onAddRoadmapCategory && (
                          <>
                            {roadmapCategories.length > 0 && <div className={`h-px ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />}
                            <motion.button 
                              whileHover={{ x: 4 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryMenuOpenFor(null);
                                setIsCreateCategoryOpen(true);
                              }}
                              className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Создать категорию</span>
                            </motion.button>
                          </>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={`flex-1 font-semibold line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {roadmap.title}
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(roadmap.id);
                    }}
                    className={`p-1.5 rounded-lg transition-all opacity-60 group-hover:opacity-100 ${
                      isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                    }`}
                    title={roadmap.pinned ? "Открепить" : "Закрепить"}
                  >
                    <Pin className={`w-3.5 h-3.5 ${roadmap.pinned ? (isDark ? "text-amber-400 fill-amber-400" : "text-amber-600 fill-amber-600") : (isDark ? "text-slate-300" : "text-gray-500")}`} />
                  </motion.button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600'
                  }`}>
                    <Flag className="w-3 h-3" />
                    <span>{roadmap.milestones.length} этап{roadmap.milestones.length === 1 ? "" : roadmap.milestones.length > 1 && roadmap.milestones.length < 5 ? "а" : "ов"}</span>
                  </div>
                  {totalCount > 0 && (
                    <MiniProgressRing progress={progress} isDark={isDark} />
                  )}
                </div>

                <div className={`flex flex-col gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <div>Создано: {formatDate(roadmap.createdAt)}</div>
                  {roadmap.targetDate && (
                    <div className={`flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      <Target className="w-3 h-3" />
                      Цель: {formatDate(roadmap.targetDate)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {roadmaps.length === 0 && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`p-4 rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800/50' : 'bg-white/50'}`}>
                <div className={`flex items-center gap-3 mb-3 animate-pulse`}>
                  <div className={`w-6 h-6 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className={`flex-1 h-4 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
                <div className={`h-5 rounded mb-3 w-3/4 animate-pulse ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <div className={`space-y-2 animate-pulse`}>
                  <div className={`h-3 rounded ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className={`h-3 rounded w-2/3 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredRoadMaps.length === 0 && roadmaps.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center py-12 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
          >
            <div className={`p-4 rounded-2xl inline-block mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
              <Route className={`w-12 h-12 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Дорожные карты не найдены
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Создайте первую карту для планирования
            </p>
          </motion.div>
        )}
      </div>

      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className={`sm:max-w-md rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Категории дорожных карт
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "manage")} className="w-full">
            <TabsList className={`grid w-full grid-cols-2 rounded-xl p-1 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
              <TabsTrigger value="create" className="rounded-lg">Создать</TabsTrigger>
              <TabsTrigger value="manage" className="rounded-lg">Управление</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-5 py-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Название
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Введите название категории"
                  className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-purple-500' 
                      : 'bg-white border-gray-200 focus:border-purple-400'
                  }`}
                  data-testid="input-new-category-name"
                />
              </div>
              
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Иконка
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map((icon) => {
                    const IconComponent = iconMap[icon.id] || MapPin;
                    return (
                      <motion.button
                        key={icon.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setNewCategoryIcon(icon.id)}
                        className={`p-2.5 rounded-xl transition-all ${
                          newCategoryIcon === icon.id
                            ? "ring-2 ring-offset-2"
                            : isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        style={newCategoryIcon === icon.id ? { 
                          backgroundColor: `${newCategoryColor}20`,
                          boxShadow: `0 0 0 2px ${newCategoryColor}`
                        } : {}}
                        title={icon.name}
                      >
                        <span style={{ color: newCategoryColor }}><IconComponent className="w-5 h-5" /></span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className={`text-sm font-medium mb-2 block ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Цвет
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <motion.button
                      key={color}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-10 h-10 rounded-xl transition-all ${
                        newCategoryColor === color
                          ? "ring-2 ring-offset-2"
                          : ""
                      }`}
                      style={{ 
                        backgroundColor: color,
                        boxShadow: newCategoryColor === color ? `0 4px 14px ${color}50` : undefined
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateCategoryOpen(false)}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Отмена
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit-category"
                >
                  Создать
                </motion.button>
              </div>
            </TabsContent>
            
            <TabsContent value="manage" className="py-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {roadmapCategories.length === 0 ? (
                  <p className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    Нет созданных категорий
                  </p>
                ) : (
                  roadmapCategories.map((cat: any) => {
                    const CatIcon = iconMap[cat.icon || "MapPin"] || MapPin;
                    return (
                      <motion.div
                        key={cat.id}
                        layout
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isDark ? 'bg-slate-800' : 'bg-gray-50'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color || "#6366f1" }}
                        />
                        <span style={{ color: cat.color || "#6366f1" }}>
                          <CatIcon className="w-5 h-5" />
                        </span>
                        <span className={`flex-1 font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                          {cat.name}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteCategory(cat.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
