import { useState, useRef, useCallback } from "react";
import { Task, TaskCategory } from "../App";
import { Plus, Trash2, Calendar as CalendarIcon, Flag, ChevronRight, X, GripVertical, Clock, ArrowUpDown, Sticker, Sparkles, Target, CheckCircle2, ListTodo, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { SimpleCalendar } from "./ui/simple-calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface TaskManagerProps {
  tasks: Task[];
  taskCategories: TaskCategory[];
  onToggleTask: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onCreateTask: (title: string, priority: "low" | "medium" | "high", categoryId: string, sticker?: string, dueDate?: Date) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskSticker: (taskId: string, sticker: string | undefined) => void;
  onAddTaskCategory: (name: string, color: string) => TaskCategory | Promise<TaskCategory>;
  onReorderTasks: (reorderedTasks: Task[]) => void;
  isDark?: boolean;
}

const STICKER_OPTIONS = ["📝", "🎯", "💡", "🔥", "⭐", "🚀", "💪", "🎉", "📌", "✨", "🏆", "💎"];

const AnimatedCheckbox = ({ 
  checked, 
  onChange, 
  isDark,
  size = "md"
}: { 
  checked: boolean; 
  onChange: () => void; 
  isDark: boolean;
  size?: "sm" | "md";
}) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  
  const createParticles = () => {
    const colors = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#22d3ee', '#34d399'];
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 600);
  };

  const handleClick = () => {
    if (!checked) {
      createParticles();
    }
    onChange();
  };

  const sizeClasses = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="relative">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: 0, 
              scale: 1.5, 
              x: particle.x, 
              y: particle.y 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 pointer-events-none"
            style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              backgroundColor: particle.color,
              marginLeft: -3,
              marginTop: -3
            }}
          />
        ))}
      </AnimatePresence>
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.85 }}
        className={`${sizeClasses} rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
          checked
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-500 shadow-lg shadow-emerald-500/30'
            : isDark 
              ? 'border-slate-500 hover:border-indigo-400 bg-slate-700/50' 
              : 'border-gray-300 hover:border-indigo-400 bg-white'
        }`}
        data-testid="animated-checkbox"
      >
        <AnimatePresence mode="wait">
          {checked && (
            <motion.svg
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-3 h-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                d="M20 6L9 17l-5-5"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  gradient, 
  isDark 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  gradient: string; 
  isDark: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-2xl p-4 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50' 
        : 'bg-white/80 backdrop-blur-xl border border-gray-200/50 shadow-lg shadow-gray-200/20'
    }`}
  >
    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${gradient}`} />
    <div className="relative flex items-center gap-3">
      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      </div>
    </div>
  </motion.div>
);

export function TaskManager({
  tasks,
  taskCategories,
  onToggleTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskSticker,
  onAddTaskCategory,
  onReorderTasks,
  isDark = false,
}: TaskManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);
  const [formTime, setFormTime] = useState("");
  const [editingTimeTaskId, setEditingTimeTaskId] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState("");
  const [sortBy, setSortBy] = useState<"order" | "dueDate" | "priority">("order");
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    priority: "medium" as "low" | "medium" | "high",
    categoryId: taskCategories?.[0]?.id || "",
    dueDate: undefined as Date | undefined,
    sticker: undefined as string | undefined,
  });

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = "0.5";
      }
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = "1";
    }
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    dragNodeRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.preventDefault();
    if (draggedTaskId && draggedTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  }, [draggedTaskId]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    const targetTask = tasks.find(t => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask || draggedTask.completed || targetTask.completed) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(targetIndex, 0, draggedTask);

    onReorderTasks(newTasks);
    setDragOverTaskId(null);
  }, [draggedTaskId, tasks, onReorderTasks]);

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleOpenDialog = () => {
    setFormData({
      title: "",
      priority: "medium",
      categoryId: taskCategories?.[0]?.id || "",
      dueDate: undefined,
      sticker: undefined,
    });
    setFormTime("");
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    let finalDueDate = formData.dueDate;
    if (finalDueDate && formTime) {
      const [hours, minutes] = formTime.split(":").map(Number);
      finalDueDate = new Date(finalDueDate);
      finalDueDate.setHours(hours, minutes, 0, 0);
    }
    
    onCreateTask(formData.title, formData.priority, formData.categoryId, formData.sticker, finalDueDate);
    handleCloseDialog();
  };

  const getTimeFromDate = (date: Date | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    if (hours === 0 && minutes === 0) return null;
    if (hours === 23 && minutes === 59) return null;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const handleTimeEdit = (taskId: string, currentDate: Date | undefined) => {
    setEditingTimeTaskId(taskId);
    const time = currentDate ? getTimeFromDate(new Date(currentDate)) : null;
    setEditTimeValue(time || "12:00");
  };

  const handleSaveTime = (taskId: string, currentDate: Date | undefined) => {
    if (!editTimeValue) return;
    
    const [hours, minutes] = editTimeValue.split(":").map(Number);
    const newDate = currentDate ? new Date(currentDate) : new Date();
    newDate.setHours(hours, minutes, 0, 0);
    
    onUpdateTask(taskId, { dueDate: newDate });
    setEditingTimeTaskId(null);
    setEditTimeValue("");
  };

  const handleAddNewCategory = async () => {
    if (newCategoryName.trim()) {
      const result = onAddTaskCategory(newCategoryName, newCategoryColor);
      const newCat = result instanceof Promise ? await result : result;
      setFormData({ ...formData, categoryId: newCat.id });
      setShowNewCategoryDialog(false);
      setNewCategoryName("");
      setNewCategoryColor("#6366f1");
    }
  };

  const handleAddSubtaskSubmit = (taskId: string) => {
    const value = newSubtaskInputs[taskId];
    if (value?.trim()) {
      onAddSubtask(taskId, value);
      setNewSubtaskInputs(prev => ({ ...prev, [taskId]: "" }));
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setDeletingTaskId(taskId);
    setTimeout(() => {
      onDeleteTask(taskId);
      setDeletingTaskId(null);
    }, 300);
  };

  const getProgress = (task: Task) => {
    if (!task.subtasks || task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(st => st.completed).length;
    const total = task.subtasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  };

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case "high":
        return "from-red-500 to-rose-600";
      case "medium":
        return "from-amber-400 to-orange-500";
      case "low":
        return "from-emerald-400 to-green-500";
      default:
        return "from-slate-400 to-slate-500";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Высокий";
      case "medium":
        return "Средний";
      case "low":
        return "Низкий";
      default:
        return "—";
    }
  };

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const isLightColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  };

  const getCategoryById = (categoryId: string) => {
    return (taskCategories || []).find(cat => cat.id === categoryId);
  };

  const filteredTasks = selectedCategory 
    ? tasks.filter(t => t.categoryId === selectedCategory)
    : tasks;

  const sortTasks = (tasksToSort: Task[]) => {
    const sorted = [...tasksToSort];
    if (sortBy === "dueDate") {
      sorted.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === "priority") {
      sorted.sort((a, b) => priorityOrder[a.priority || "medium"] - priorityOrder[b.priority || "medium"]);
    } else {
      sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return sorted;
  };

  const activeTasks = sortTasks(filteredTasks.filter((task) => !task.completed));
  const completedTasks = sortTasks(filteredTasks.filter((task) => task.completed));

  const totalSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.length || 0), 0);
  const completedSubtasks = tasks.reduce((acc, t) => acc + (t.subtasks?.filter(s => s.completed).length || 0), 0);

  const renderTaskCard = (task: Task, isCompleted: boolean) => {
    const progress = getProgress(task);
    const isExpanded = expandedTasks.has(task.id);
    const category = getCategoryById(task.categoryId);
    const isDragOver = dragOverTaskId === task.id;
    const isDeleting = deletingTaskId === task.id;

    return (
      <motion.div
        key={task.id}
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
          layout: { duration: 0.3 }
        }}
        draggable={!isCompleted}
        onDragStart={!isCompleted ? (e: any) => handleDragStart(e, task.id) : undefined}
        onDragEnd={!isCompleted ? handleDragEnd : undefined}
        onDragOver={!isCompleted ? (e: any) => handleDragOver(e, task.id) : undefined}
        onDrop={!isCompleted ? (e: any) => handleDrop(e, task.id) : undefined}
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 ${
          isDark 
            ? 'bg-gradient-to-br from-slate-800/95 to-slate-900/95 border border-slate-700/60 hover:border-indigo-500/40' 
            : 'bg-white/95 backdrop-blur-xl border border-gray-200/80 hover:border-indigo-300/60'
        } ${
          isCompleted ? "opacity-70" : "cursor-grab active:cursor-grabbing"
        } ${isDragOver ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent" : ""} ${
          isDark ? 'shadow-xl shadow-black/20' : 'shadow-lg shadow-gray-200/50'
        }`}
        whileHover={{ 
          y: -2,
          boxShadow: isDark 
            ? "0 25px 50px -12px rgba(99, 102, 241, 0.15)" 
            : "0 25px 50px -12px rgba(99, 102, 241, 0.25)"
        }}
        data-testid={`task-card-${task.id}`}
      >
        {progress && (
          <div className={`absolute top-0 left-0 right-0 h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full ${
                progress.percentage === 100 
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                  : 'bg-gradient-to-r from-indigo-400 via-purple-500 to-indigo-600'
              }`}
              style={{
                boxShadow: progress.percentage === 100 
                  ? '0 0 12px rgba(52, 211, 153, 0.6)' 
                  : '0 0 12px rgba(99, 102, 241, 0.5)'
              }}
            />
          </div>
        )}

        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${getPriorityGradient(task.priority)}`}
          style={{ 
            boxShadow: task.priority === 'high' 
              ? '0 0 8px rgba(239, 68, 68, 0.5)' 
              : task.priority === 'medium' 
                ? '0 0 8px rgba(251, 191, 36, 0.5)'
                : '0 0 8px rgba(52, 211, 153, 0.5)'
          }}
        />

        <div className="flex items-start gap-3 p-4 pl-5">
          <div className="flex items-center gap-2 pt-0.5">
            {!isCompleted && (
              <motion.div 
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" 
                data-testid={`drag-handle-${task.id}`}
              >
                <GripVertical className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              </motion.div>
            )}
            {task.subtasks?.length > 0 && (
              <motion.button
                onClick={() => toggleExpand(task.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                data-testid={`expand-task-${task.id}`}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                </motion.div>
              </motion.button>
            )}
            <AnimatedCheckbox
              checked={task.completed}
              onChange={() => onToggleTask(task.id)}
              isDark={isDark}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <motion.h4 
                layout
                className={`leading-tight font-semibold text-[15px] ${
                  isDark 
                    ? (isCompleted ? "text-slate-500 line-through" : "text-white") 
                    : (isCompleted ? "text-gray-400 line-through" : "text-gray-900")
                }`}
              >
                {task.sticker && <span className="mr-2">{task.sticker}</span>}
                {task.title}
              </motion.h4>
              
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {task.dueDate && getTimeFromDate(new Date(task.dueDate)) && (
                  editingTimeTaskId === task.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={editTimeValue}
                        onChange={(e) => setEditTimeValue(e.target.value)}
                        className={`px-2 py-1 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'
                        }`}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTime(task.id, task.dueDate);
                          if (e.key === 'Escape') setEditingTimeTaskId(null);
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSaveTime(task.id, task.dueDate)}
                        className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg shadow-indigo-500/30"
                      >
                        <Plus className="w-3 h-3" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTimeEdit(task.id, task.dueDate)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                      }`}
                      data-testid={`time-badge-${task.id}`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{getTimeFromDate(new Date(task.dueDate))}</span>
                    </motion.button>
                  )
                )}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      className={`p-2 text-lg rounded-xl transition-all ${
                        !task.sticker 
                          ? isDark ? "text-slate-400 hover:bg-slate-700 hover:text-indigo-400" : "text-gray-400 hover:bg-gray-100 hover:text-indigo-500"
                          : isDark ? "hover:bg-slate-700" : "hover:bg-gray-100"
                      }`}
                      data-testid={`sticker-${task.id}`}
                    >
                      {task.sticker ? task.sticker : <Sticker className="w-5 h-5" />}
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-auto p-3 rounded-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`} align="end">
                    <div className="grid grid-cols-6 gap-2">
                      {STICKER_OPTIONS.map((sticker) => (
                        <motion.button
                          key={sticker}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onUpdateTaskSticker(task.id, sticker)}
                          className={`p-2 text-xl rounded-xl transition-colors ${
                            task.sticker === sticker 
                              ? (isDark ? "bg-indigo-600/40 ring-2 ring-indigo-500" : "bg-indigo-100 ring-2 ring-indigo-400") 
                              : (isDark ? "hover:bg-slate-700" : "hover:bg-gray-100")
                          }`}
                        >
                          {sticker}
                        </motion.button>
                      ))}
                    </div>
                    {task.sticker && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onUpdateTaskSticker(task.id, undefined)}
                        className={`w-full mt-3 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                          isDark 
                            ? "text-red-400 hover:bg-red-500/20 border-red-800 hover:border-red-600" 
                            : "text-red-500 hover:bg-red-50 border-red-200 hover:border-red-300"
                        }`}
                      >
                        Удалить стикер
                      </motion.button>
                    )}
                  </PopoverContent>
                </Popover>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteTask(task.id)}
                  className={`p-2 rounded-xl transition-all ${
                    isDark 
                      ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/20' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  data-testid={`delete-task-${task.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {category && (
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shadow-sm"
                  style={{ 
                    backgroundColor: category.color,
                    color: isLightColor(category.color) ? '#1f2937' : '#ffffff',
                    boxShadow: `0 4px 14px ${category.color}40`
                  }}
                  data-testid={`category-badge-${task.id}`}
                >
                  {category.name}
                </motion.span>
              )}

              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium ${
                  task.priority === 'high' 
                    ? isDark ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-50 text-red-600 border border-red-200'
                    : task.priority === 'medium'
                      ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-600 border border-amber-200'
                      : isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}
                data-testid={`priority-badge-${task.id}`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{getPriorityLabel(task.priority)}</span>
              </motion.div>

              {progress ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => !isExpanded && toggleExpand(task.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30' 
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                  data-testid={`progress-badge-${task.id}`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>{progress.completed}/{progress.total}</span>
                  <div className={`w-8 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'} overflow-hidden`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentage}%` }}
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    />
                  </div>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleExpand(task.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                    isDark 
                      ? 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:border-indigo-500/50' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-indigo-300'
                  }`}
                  data-testid={`add-subtask-quick-${task.id}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Подзадачи</span>
                </motion.button>
              )}

              {task.dueDate && (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium ${
                    isDark 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-purple-50 text-purple-600 border border-purple-200'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{format(new Date(task.dueDate), "d MMM", { locale: ru })}</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {task.subtasks?.length > 0 && (
                <div className={`px-4 pb-4 pl-14 space-y-2 border-t pt-4 ${
                  isDark 
                    ? 'border-slate-700/50 bg-slate-900/50' 
                    : 'border-gray-100 bg-gray-50/50'
                }`}>
                  <AnimatePresence initial={false}>
                    {(task.subtasks || []).map((subtask) => (
                      <motion.div
                        key={subtask.id}
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl group/subtask transition-all ${
                          isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white/80'
                        }`}
                      >
                        <AnimatedCheckbox
                          checked={subtask.completed}
                          onChange={() => onToggleSubtask(task.id, subtask.id)}
                          isDark={isDark}
                          size="sm"
                        />
                        <span className={`flex-1 text-sm font-medium transition-all ${
                          subtask.completed 
                            ? (isDark ? "line-through text-slate-500" : "line-through text-gray-400") 
                            : (isDark ? "text-slate-200" : "text-gray-700")
                        }`}>
                          {subtask.title}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDeleteSubtask(task.id, subtask.id)}
                          className={`p-1.5 opacity-0 group-hover/subtask:opacity-100 rounded-lg transition-all ${
                            isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                          }`}
                          data-testid={`delete-subtask-${subtask.id}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className={`px-4 pt-3 pb-4 pl-14 ${isDark ? 'bg-slate-900/30' : 'bg-gray-50/30'}`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Добавить подзадачу..."
                    value={newSubtaskInputs[task.id] || ""}
                    onChange={(e) => setNewSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddSubtaskSubmit(task.id);
                      }
                    }}
                    className={`flex-1 px-4 py-2.5 text-sm rounded-xl border-2 focus:outline-none transition-all ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        : "bg-white border-gray-200 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    }`}
                    data-testid={`add-subtask-input-${task.id}`}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddSubtaskSubmit(task.id)}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
                    data-testid={`add-subtask-button-${task.id}`}
                  >
                    <Plus className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (tasks.length === 0 && (taskCategories || []).length === 0) {
    return (
      <div className={`flex flex-col flex-1 w-full h-full overflow-hidden border-l border-t ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 border-gray-200'}`} data-testid="empty-task-manager">
        {/* Header */}
        <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
            <div className={`absolute -bottom-24 -left-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
          </div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30`}>
                    <Target className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Менеджер задач
                  </h1>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Управляйте своими целями эффективно
                  </p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenDialog}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
                data-testid="create-first-task-button"
              >
                <Plus className="w-5 h-5" />
                Новая задача
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Empty State Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
            }`}>
              <Target className={`w-12 h-12 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
            </div>
            <h2 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Пока нет задач
            </h2>
            <p className={`mb-8 text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Создайте первую задачу, чтобы начать<br />
              управлять своими целями эффективно
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenDialog}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
              data-testid="create-task-empty-button"
            >
              <Plus className="w-5 h-5" />
              Создать первую задачу
            </motion.button>
          </div>
        </div>
        
        {/* Create Task Dialog - full version */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className={`sm:max-w-lg rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
            <DialogHeader>
              <DialogTitle className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Новая задача
              </DialogTitle>
              <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                Создайте новую задачу для отслеживания
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Название задачи
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Введите название..."
                  className={`rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                  data-testid="input-task-title-empty"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Категория
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(taskCategories || []).map((cat) => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, categoryId: cat.id })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        formData.categoryId === cat.id ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{
                        backgroundColor: cat.color,
                        color: isLightColor(cat.color) ? '#1f2937' : '#ffffff'
                      }}
                      data-testid={`select-category-empty-${cat.id}`}
                    >
                      {cat.name}
                    </motion.button>
                  ))}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewCategoryDialog(true)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 border-dashed transition-all ${
                      isDark ? 'border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-500'
                    }`}
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Новая
                  </motion.button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Приоритет
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'low', label: 'Низкий', gradient: 'from-emerald-400 to-green-500' },
                    { value: 'medium', label: 'Средний', gradient: 'from-amber-400 to-orange-500' },
                    { value: 'high', label: 'Высокий', gradient: 'from-red-500 to-rose-600' }
                  ].map((p) => (
                    <motion.button
                      key={p.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFormData({ ...formData, priority: p.value as any })}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        formData.priority === p.value
                          ? `bg-gradient-to-r ${p.gradient} text-white shadow-lg`
                          : isDark
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}
                      data-testid={`priority-empty-${p.value}`}
                    >
                      <Flag className="w-4 h-4 inline mr-1.5" />
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Дата
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className={`w-full justify-start rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.dueDate ? format(formData.dueDate, "d MMMM", { locale: ru }) : "Выберите дату"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-auto p-0 rounded-2xl ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
                      <SimpleCalendar
                        selected={formData.dueDate}
                        onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    Время
                  </label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className={`rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Стикер
                </label>
                <div className="flex gap-2 flex-wrap">
                  {STICKER_OPTIONS.map((sticker) => (
                    <motion.button
                      key={sticker}
                      type="button"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setFormData({ ...formData, sticker: formData.sticker === sticker ? undefined : sticker })}
                      className={`p-2.5 text-xl rounded-xl transition-all ${
                        formData.sticker === sticker
                          ? isDark ? 'bg-indigo-600/40 ring-2 ring-indigo-500' : 'bg-indigo-100 ring-2 ring-indigo-400'
                          : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      {sticker}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  className={`flex-1 rounded-xl h-12 ${isDark ? 'border-slate-700 hover:bg-slate-800' : ''}`}
                >
                  Отмена
                </Button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
                  data-testid="button-submit-task-empty"
                >
                  Создать задачу
                </motion.button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* New Category Dialog for empty state */}
        <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
          <DialogContent className={`sm:max-w-md rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
            <DialogHeader>
              <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>Новая категория</DialogTitle>
              <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                Создайте категорию для организации задач
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название категории"
                className={`rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
              />
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Цвет
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6'].map((color) => (
                    <motion.button
                      key={color}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-10 h-10 rounded-xl transition-all ${newCategoryColor === color ? 'ring-2 ring-offset-2' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewCategoryDialog(false)}
                  className={`flex-1 rounded-xl ${isDark ? 'border-slate-700' : ''}`}
                >
                  Отмена
                </Button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddNewCategory}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold"
                >
                  Создать
                </motion.button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 w-full h-full overflow-hidden border-l border-t ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 border-gray-200'}`} data-testid="task-manager">
      
      <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
          <div className={`absolute -bottom-24 -left-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-purple-600/10' : 'bg-purple-400/20'}`} />
        </div>
        
        <div className="relative p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`p-2.5 md:p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30`}>
                  <Target className="w-5 md:w-7 h-5 md:h-7 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"
                />
              </div>
              <div>
                <h1 className={`text-lg md:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Менеджер задач
                </h1>
                <p className={`text-xs md:text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'} hidden md:block`}>
                  Управляйте своими целями эффективно
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenDialog}
              className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white text-sm md:text-base font-semibold shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
              data-testid="button-create-task"
            >
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline">Новая задача</span>
              <span className="md:hidden">Новая</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <StatCard icon={ListTodo} label="Всего задач" value={tasks.length} gradient="from-indigo-500 to-purple-600" isDark={isDark} />
            <StatCard icon={Zap} label="Активных" value={activeTasks.length} gradient="from-amber-400 to-orange-500" isDark={isDark} />
            <StatCard icon={CheckCircle2} label="Выполнено" value={completedTasks.length} gradient="from-emerald-400 to-green-500" isDark={isDark} />
            <StatCard icon={Target} label="Подзадач" value={`${completedSubtasks}/${totalSubtasks}` as any} gradient="from-pink-500 to-rose-500" isDark={isDark} />
          </div>
        </div>
      </div>

      <div className={`px-4 md:px-6 py-3 md:py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap overflow-x-auto">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              data-testid="filter-all-categories"
            >
              Все
            </motion.button>
            {(taskCategories || []).map((cat) => (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'shadow-lg'
                    : isDark
                      ? 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
                style={selectedCategory === cat.id ? {
                  backgroundColor: cat.color,
                  color: isLightColor(cat.color) ? '#1f2937' : '#ffffff',
                  boxShadow: `0 4px 14px ${cat.color}50`
                } : {
                  color: isDark ? '#e2e8f0' : '#374151'
                }}
                data-testid={`filter-category-${cat.id}`}
              >
                {cat.name}
              </motion.button>
            ))}
          </div>

          <div className="ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                  data-testid="button-sort"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Сортировка
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className={`w-48 p-2 rounded-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`} align="end">
                {[
                  { value: "order", label: "По порядку" },
                  { value: "dueDate", label: "По дате" },
                  { value: "priority", label: "По приоритету" }
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ x: 4 }}
                    onClick={() => setSortBy(option.value as any)}
                    className={`w-full px-3 py-2.5 text-left rounded-xl text-sm font-medium transition-all ${
                      sortBy === option.value
                        ? isDark ? 'bg-indigo-600/30 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                        : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="space-y-8">
          {activeTasks.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <Zap className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Активные задачи
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {activeTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {activeTasks.map((task) => renderTaskCard(task, false))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {completedTasks.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                  <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Выполненные
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {completedTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {completedTasks.map((task) => renderTaskCard(task, true))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div className={`p-6 rounded-3xl mb-6 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                <Target className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Нет задач
              </h3>
              <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Создайте первую задачу, чтобы начать
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenDialog}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-xl shadow-indigo-500/30"
              >
                <Plus className="w-5 h-5" />
                Создать задачу
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-lg rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Новая задача
            </DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              Создайте новую задачу для отслеживания
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Название задачи
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Введите название..."
                className={`rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                data-testid="input-task-title"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Категория
              </label>
              <div className="flex gap-2 flex-wrap">
                {(taskCategories || []).map((cat) => (
                  <motion.button
                    key={cat.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, categoryId: cat.id })}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.categoryId === cat.id ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      backgroundColor: cat.color,
                      color: isLightColor(cat.color) ? '#1f2937' : '#ffffff'
                    }}
                    data-testid={`select-category-${cat.id}`}
                  >
                    {cat.name}
                  </motion.button>
                ))}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowNewCategoryDialog(true)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 border-dashed transition-all ${
                    isDark ? 'border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-500'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Новая
                </motion.button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Приоритет
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'low', label: 'Низкий', gradient: 'from-emerald-400 to-green-500' },
                  { value: 'medium', label: 'Средний', gradient: 'from-amber-400 to-orange-500' },
                  { value: 'high', label: 'Высокий', gradient: 'from-red-500 to-rose-600' }
                ].map((p) => (
                  <motion.button
                    key={p.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFormData({ ...formData, priority: p.value as any })}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      formData.priority === p.value
                        ? `bg-gradient-to-r ${p.gradient} text-white shadow-lg`
                        : isDark
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}
                    data-testid={`priority-${p.value}`}
                  >
                    <Flag className="w-4 h-4 inline mr-1.5" />
                    {p.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Дата
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className={`w-full justify-start rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? format(formData.dueDate, "d MMMM", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-auto p-0 rounded-2xl ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
                    <SimpleCalendar
                      selected={formData.dueDate}
                      onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Время
                </label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className={`rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Стикер
              </label>
              <div className="flex gap-2 flex-wrap">
                {STICKER_OPTIONS.map((sticker) => (
                  <motion.button
                    key={sticker}
                    type="button"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setFormData({ ...formData, sticker: formData.sticker === sticker ? undefined : sticker })}
                    className={`p-2.5 text-xl rounded-xl transition-all ${
                      formData.sticker === sticker
                        ? isDark ? 'bg-indigo-600/40 ring-2 ring-indigo-500' : 'bg-indigo-100 ring-2 ring-indigo-400'
                        : isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    {sticker}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className={`flex-1 rounded-xl h-12 ${isDark ? 'border-slate-700 hover:bg-slate-800' : ''}`}
              >
                Отмена
              </Button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
                data-testid="button-submit-task"
              >
                Создать задачу
              </motion.button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className={`sm:max-w-md rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={isDark ? 'text-white' : 'text-gray-900'}>Новая категория</DialogTitle>
            <DialogDescription className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              Создайте категорию для организации задач
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Название категории"
              className={`rounded-xl h-12 ${isDark ? 'bg-slate-800 border-slate-700' : ''}`}
            />
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                Цвет
              </label>
              <div className="flex gap-2 flex-wrap">
                {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6'].map((color) => (
                  <motion.button
                    key={color}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setNewCategoryColor(color)}
                    className={`w-10 h-10 rounded-xl transition-all ${newCategoryColor === color ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewCategoryDialog(false)}
                className={`flex-1 rounded-xl ${isDark ? 'border-slate-700' : ''}`}
              >
                Отмена
              </Button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddNewCategory}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold"
              >
                Создать
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
