import { useState, useRef, useEffect, useId } from "react";
import { Plus, X, Edit2, Trash2, Check, DollarSign, GripVertical, Sparkles, ImagePlus, Target, TrendingUp, ChevronLeft, ChevronRight, Images, Loader2 } from "lucide-react";
import Lottie from "lottie-react";
import targetAnimation from "@assets/Target_1765996582107.json";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { motion, AnimatePresence } from "framer-motion";
import type { Goal } from "../App";
import type { Identifier } from "dnd-core";

interface GoalsDeskProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, "id" | "createdAt">) => void;
  onUpdateGoal: (goalId: string, goal: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onReorderGoals: (reorderedGoals: Goal[]) => void;
  isDark?: boolean;
}

const ItemType = "GOAL_CARD";

interface DraggableGoalCardProps {
  goal: Goal;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onView: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
  isDeleting?: boolean;
}

interface DragItem {
  id: string;
  index: number;
}

const GoalProgressRing = ({ 
  percentage, 
  size = 72, 
  strokeWidth = 5,
  isDark 
}: { 
  percentage: number; 
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
}) => {
  const uniqueId = useId();
  const gradientId = `goalGradient-${uniqueId}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
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
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeDasharray={circumference}
          style={{
            filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.5))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

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
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${
      isDark ? 'bg-slate-800/80' : 'bg-white/80'
    } backdrop-blur-sm shadow-lg`}
  >
    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  </motion.div>
);

function DraggableGoalCard({
  goal,
  index,
  moveCard,
  onEdit,
  onDelete,
  onView,
  onToggleComplete,
  isDark = false,
  isDeleting = false,
}: DraggableGoalCardProps & { isDark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const images = goal.images && goal.images.length > 0 
    ? goal.images 
    : goal.imageUrl 
      ? [goal.imageUrl] 
      : [];

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: (): DragItem => {
      return { id: goal.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: isDeleting ? 0 : isDragging ? 0.6 : 1, 
        scale: isDeleting ? 0.8 : 1,
        y: isDeleting ? 20 : 0
      }}
      exit={{ opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
      whileHover={{ y: -6, boxShadow: isDark 
        ? "0 25px 50px -12px rgba(168, 85, 247, 0.2)" 
        : "0 25px 50px -12px rgba(99, 102, 241, 0.25)" 
      }}
      data-handler-id={handlerId}
      className={`group relative rounded-2xl overflow-hidden cursor-move ${
        isDark 
          ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60' 
          : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 shadow-lg'
      } ${goal.completed ? "ring-2 ring-emerald-500/50" : ""}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        goal.completed 
          ? 'from-emerald-400 via-green-500 to-teal-500' 
          : 'from-purple-500 via-indigo-500 to-cyan-500'
      }`} />

      <div className={`absolute top-3 left-3 z-10 p-1.5 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity ${isDark ? 'bg-slate-800/90' : 'bg-white/90'} backdrop-blur-sm`}>
        <GripVertical className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
      </div>

      <div 
        className="relative overflow-hidden aspect-[4/3] cursor-pointer"
        onClick={() => onView(goal)}
      >
        {images.length > 0 ? (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <ImageWithFallback
                  src={images[currentImageIndex]}
                  alt={goal.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </motion.div>
            </AnimatePresence>
            
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isDark ? 'bg-slate-800/80' : 'bg-white/90'} backdrop-blur-sm`}
                >
                  <ChevronLeft className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-700'}`} />
                </button>
                <button
                  onClick={nextImage}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isDark ? 'bg-slate-800/80' : 'bg-white/90'} backdrop-blur-sm`}
                >
                  <ChevronRight className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-700'}`} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex 
                          ? 'bg-white w-4' 
                          : 'bg-white/50 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-purple-50 to-indigo-50'}`}>
            <Target className={`w-12 h-12 ${isDark ? 'text-slate-500' : 'text-indigo-300'}`} />
          </div>
        )}
        
        {goal.completed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]"
          >
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full p-4 shadow-xl shadow-emerald-500/30"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
          </motion.div>
        )}

        <div className={`absolute bottom-3 left-3 px-3 py-1.5 rounded-xl flex items-center gap-2 ${isDark ? 'bg-slate-900/90' : 'bg-white/95'} backdrop-blur-sm shadow-lg`}>
          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>#{index + 1}</span>
          {images.length > 1 && (
            <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Images className="w-3 h-3" />
              <span>{images.length}</span>
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(goal);
            }}
            className={`p-2.5 rounded-xl shadow-lg ${isDark ? 'bg-slate-800/90 hover:bg-slate-700' : 'bg-white/95 hover:bg-white'} backdrop-blur-sm`}
          >
            <Edit2 className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(goal.id);
            }}
            className={`p-2.5 rounded-xl shadow-lg ${isDark ? 'bg-slate-800/90 hover:bg-red-500/20' : 'bg-white/95 hover:bg-red-50'} backdrop-blur-sm`}
          >
            <Trash2 className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          </motion.button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className={`font-semibold truncate mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{goal.title}</h4>
        
        <div className="flex items-center justify-between gap-2">
          {goal.price ? (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
              <DollarSign className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                {goal.price.toLocaleString()}
              </span>
            </div>
          ) : (
            <div />
          )}
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(goal);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              goal.completed
                ? isDark 
                  ? "bg-slate-700 text-slate-300 hover:bg-slate-600" 
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                : "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
            }`}
          >
            {goal.completed ? "Отменить" : "Выполнено"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function GoalsDesk({ goals, onAddGoal, onUpdateGoal, onDeleteGoal, onReorderGoals, isDark = false }: GoalsDeskProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [viewingGoal, setViewingGoal] = useState<Goal | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    images: [] as string[],
    price: "",
    completed: false,
  });
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  const [localGoals, setLocalGoals] = useState<Goal[]>(goals);

  useEffect(() => {
    setLocalGoals(goals);
  }, [goals]);

  const completedGoals = localGoals.filter(g => g.completed).length;
  const totalGoals = localGoals.length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  const handleOpenModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      const goalImages = goal.images && goal.images.length > 0 
        ? goal.images 
        : goal.imageUrl 
          ? [goal.imageUrl] 
          : [];
      setFormData({
        title: goal.title,
        description: goal.description || "",
        imageUrl: goal.imageUrl || "",
        images: goalImages,
        price: goal.price?.toString() || "",
        completed: goal.completed,
      });
    } else {
      setEditingGoal(null);
      setFormData({ title: "", description: "", imageUrl: "", images: [], price: "", completed: false });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
    setFormData({ title: "", description: "", imageUrl: "", images: [], price: "", completed: false });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || (formData.images.length === 0 && !formData.imageUrl)) return;

    const goalData = {
      title: formData.title,
      description: formData.description,
      imageUrl: formData.images[0] || formData.imageUrl,
      images: formData.images.length > 0 ? formData.images : (formData.imageUrl ? [formData.imageUrl] : []),
      price: formData.price ? parseFloat(formData.price) : undefined,
      completed: formData.completed,
    };

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, goalData);
    } else {
      onAddGoal(goalData);
    }
    handleCloseModal();
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];
    
    try {
      for (const file of Array.from(files)) {
        const uploadData = new FormData();
        uploadData.append("image", file);
        
        try {
          const response = await fetch("/api/upload/goal-image", {
            method: "POST",
            credentials: "include",
            body: uploadData,
          });
          
          if (response.ok) {
            const result = await response.json();
            newImages.push(result.url);
          } else {
            const url = URL.createObjectURL(file);
            newImages.push(url);
          }
        } catch {
          const url = URL.createObjectURL(file);
          newImages.push(url);
        }
      }
      
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, ...newImages],
        imageUrl: prev.images.length === 0 && newImages.length > 0 ? newImages[0] : prev.imageUrl
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, idx) => idx !== indexToRemove);
      return {
        ...prev,
        images: newImages,
        imageUrl: newImages.length > 0 ? newImages[0] : ""
      };
    });
  };

  const handleToggleComplete = (goal: Goal) => {
    onUpdateGoal(goal.id, { completed: !goal.completed });
  };

  const handleDeleteGoal = (goalId: string) => {
    setDeletingGoalId(goalId);
    setTimeout(() => {
      onDeleteGoal(goalId);
      setDeletingGoalId(null);
    }, 300);
  };

  const handleViewGoal = (goal: Goal) => {
    setViewingGoal(goal);
    setViewingImageIndex(0);
  };

  const moveCard = (dragIndex: number, hoverIndex: number) => {
    const updatedGoals = [...localGoals];
    const [draggedItem] = updatedGoals.splice(dragIndex, 1);
    updatedGoals.splice(hoverIndex, 0, draggedItem);
    setLocalGoals(updatedGoals);
    onReorderGoals(updatedGoals);
  };

  const viewingImages = viewingGoal?.images && viewingGoal.images.length > 0 
    ? viewingGoal.images 
    : viewingGoal?.imageUrl 
      ? [viewingGoal.imageUrl] 
      : [];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex-1 flex flex-col overflow-hidden border-t border-l ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-purple-50/30 border-gray-200'}`}>
        <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/70'}`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
            <div className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-cyan-600/5' : 'bg-cyan-400/10'}`} />
          </div>

          <div className={`relative p-4 md:p-6 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-xl`}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative">
                  <div className="p-2.5 md:p-3 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-cyan-500 shadow-xl shadow-purple-500/30">
                    <Target className="w-5 md:w-7 h-5 md:h-7 text-white" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'}`}
                  />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    My Goals Desk
                  </h2>
                  <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} hidden md:block`}>
                    Визуализируйте и отслеживайте свои цели
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOpenModal()}
                className="px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 text-white text-sm md:text-base font-semibold flex items-center gap-2 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/40 transition-shadow"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden md:inline">Добавить цель</span>
                <span className="md:hidden">Новая</span>
              </motion.button>
            </div>

            <div className="flex items-center gap-4">
              <GoalProgressRing percentage={completionRate} isDark={isDark} />
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                <StatBadge icon={Target} value={totalGoals} label="Всего целей" gradient="from-purple-500 to-indigo-600" isDark={isDark} />
                <StatBadge icon={Check} value={completedGoals} label="Выполнено" gradient="from-emerald-500 to-green-600" isDark={isDark} />
                <StatBadge icon={TrendingUp} value={totalGoals - completedGoals} label="В процессе" gradient="from-cyan-500 to-blue-600" isDark={isDark} />
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-3 md:p-6 ${isDark ? '' : ''}`}>
          {localGoals.length === 0 ? (
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse`} data-testid="loading-goals-desk">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800/50' : 'bg-white/80'}`}>
                  <div className={`aspect-[4/3] ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  <div className="p-4">
                    <div className={`h-4 rounded w-3/4 mb-3 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                    <div className={`h-3 rounded w-1/2 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <AnimatePresence mode="popLayout">
                {localGoals.map((goal, index) => (
                  <DraggableGoalCard
                    key={goal.id}
                    goal={goal}
                    index={index}
                    moveCard={moveCard}
                    onEdit={handleOpenModal}
                    onDelete={handleDeleteGoal}
                    onView={handleViewGoal}
                    onToggleComplete={handleToggleComplete}
                    isDark={isDark}
                    isDeleting={deletingGoalId === goal.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <AnimatePresence>
          {viewingGoal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 ${isDark ? 'bg-slate-900/95' : 'bg-white/95'}`}
              onClick={() => setViewingGoal(null)}
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setViewingGoal(null)}
                className={`absolute top-6 right-6 p-3 rounded-full transition-colors z-10 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <X className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-900'}`} />
              </motion.button>

              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative max-w-6xl max-h-[90vh] w-full flex flex-col md:flex-row gap-6 items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 flex items-center justify-center relative">
                  {viewingImages.length > 0 && (
                    <>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={viewingImageIndex}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ImageWithFallback
                            src={viewingImages[viewingImageIndex]}
                            alt={viewingGoal.title}
                            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                          />
                        </motion.div>
                      </AnimatePresence>
                      
                      {viewingImages.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingImageIndex(prev => (prev - 1 + viewingImages.length) % viewingImages.length);
                            }}
                            className={`absolute left-4 p-3 rounded-full ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white/90 hover:bg-white'} shadow-xl`}
                          >
                            <ChevronLeft className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-700'}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingImageIndex(prev => (prev + 1) % viewingImages.length);
                            }}
                            className={`absolute right-4 p-3 rounded-full ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white/90 hover:bg-white'} shadow-xl`}
                          >
                            <ChevronRight className={`w-6 h-6 ${isDark ? 'text-white' : 'text-gray-700'}`} />
                          </button>
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            {viewingImages.map((_: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingImageIndex(idx);
                                }}
                                className={`w-3 h-3 rounded-full transition-all ${
                                  idx === viewingImageIndex 
                                    ? 'bg-purple-500 w-6' 
                                    : isDark ? 'bg-slate-600 hover:bg-slate-500' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="w-full md:w-96 flex flex-col gap-4">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 animate-pulse transition duration-1000"></div>
                    <button
                      onClick={() => {
                        alert(`Анализ цели: ${viewingGoal.title}`);
                      }}
                      className="relative w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-4 px-6 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div className="relative">
                          <Sparkles className="w-6 h-6 animate-pulse" />
                          <div className="absolute inset-0 animate-ping opacity-75">
                            <Sparkles className="w-6 h-6" />
                          </div>
                        </div>
                        <span className="font-medium">Ассистент ваших целей</span>
                        <div className="relative">
                          <Sparkles className="w-6 h-6 animate-pulse" />
                          <div className="absolute inset-0 animate-ping opacity-75">
                            <Sparkles className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                      <p className="text-xs mt-2 text-white/90">
                        AI-анализ вашего прогресса и рекомендации
                      </p>
                    </button>
                  </div>

                  <div className={`rounded-2xl p-6 shadow-xl ${isDark ? 'bg-slate-800/90 border border-slate-700' : 'bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-xl border border-indigo-200/50'}`}>
                    <div className="space-y-4">
                      <div>
                        <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{viewingGoal.title}</h3>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>
                          {viewingGoal.description}
                        </p>
                      </div>

                      {viewingGoal.price && (
                        <div className={`flex items-center gap-2 py-3 px-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-white/60 border border-indigo-100'}`}>
                          <DollarSign className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {viewingGoal.price.toLocaleString()}
                          </span>
                          <span className={`text-sm ml-auto ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Стоимость</span>
                        </div>
                      )}

                      <div className="pt-2">
                        <Button
                          onClick={() => {
                            handleToggleComplete(viewingGoal);
                            setViewingGoal(null);
                          }}
                          className={`w-full ${
                            viewingGoal.completed
                              ? isDark ? "bg-slate-700 hover:bg-slate-600" : "bg-gray-600 hover:bg-gray-700"
                              : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                          } text-white shadow-lg`}
                        >
                          {viewingGoal.completed ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Выполнено
                            </>
                          ) : (
                            "Отметить выполненным"
                          )}
                        </Button>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => {
                            setViewingGoal(null);
                            handleOpenModal(viewingGoal);
                          }}
                          variant="outline"
                          className={`flex-1 ${isDark ? 'border-slate-600 bg-slate-700/50 text-white hover:bg-slate-600' : 'border-indigo-300 bg-white/60 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-400'}`}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Изменить
                        </Button>
                        <Button
                          onClick={() => {
                            handleDeleteGoal(viewingGoal.id);
                            setViewingGoal(null);
                          }}
                          variant="outline"
                          className={`flex-1 ${isDark ? 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border-red-300 bg-white/60 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400'}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className={`sm:max-w-[500px] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white/95 backdrop-blur-xl border-white/40'}`}>
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                {editingGoal ? "Редактировать цель" : "Создать новую цель"}
              </DialogTitle>
              <DialogDescription className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {editingGoal ? "Обновите данные вашей цели" : "Введите данные вашей цели"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Название цели
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Введите название..."
                  className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white/60 border-white/40'} focus:ring-purple-500`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Описание
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Опишите вашу цель..."
                  className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white/60 border-white/40'} focus:ring-purple-500 min-h-[80px]`}
                />
              </div>

              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Стоимость (опционально)
                </label>
                <div className="relative">
                  <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0.00"
                    className={`${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white/60 border-white/40'} focus:ring-purple-500 pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Галерея изображений
                </label>
                <div className="space-y-3">
                  <label className={`cursor-pointer block ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    <div className={`flex items-center justify-center gap-3 px-4 py-6 rounded-xl border-2 border-dashed transition-all ${
                      isDark 
                        ? 'border-slate-600 hover:border-purple-500 bg-slate-800/50' 
                        : 'border-gray-300 hover:border-purple-400 bg-gradient-to-r from-indigo-50/50 to-purple-50/50'
                    }`}>
                      {isUploading ? (
                        <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      ) : (
                        <ImagePlus className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                      )}
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        {isUploading ? "Загрузка..." : "Нажмите чтобы загрузить изображения"}
                      </span>
                    </div>
                  </label>
                  
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square">
                          <ImageWithFallback
                            src={img}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {idx === 0 && (
                            <div className={`absolute bottom-1 left-1 px-2 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-purple-500' : 'bg-purple-600'} text-white`}>
                              Главная
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  variant="outline"
                  className={`flex-1 ${isDark ? 'border-slate-600 hover:bg-slate-800' : 'border-white/40 hover:bg-white/60'}`}
                >
                  Отмена
                </Button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-purple-500/30"
                >
                  {editingGoal ? "Сохранить" : "Создать"}
                </motion.button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}
