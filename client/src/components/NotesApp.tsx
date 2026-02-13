import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../hooks/useTheme";
import { useIsMobile } from "./ui/use-mobile";
import { Sidebar } from "./Sidebar";
import { NoteList } from "./NoteList";
import { NoteEditor } from "./NoteEditor";
import { TaskManager } from "./TaskManager";
import { GoalsDesk } from "./GoalsDesk";
import { FileManager, FileItem, FolderItem } from "./FileManager";
import { RoadMapList } from "./RoadMapList";
import { RoadMapEditor } from "./RoadMapEditor";
import { EmptyState } from "./EmptyState";
import { LinkCenter } from "./LinkCenter";
import { CryptoWallets } from "./CryptoWallets";
import { NotificationCenter } from "./NotificationCenter";
import { AppsPage } from "./AppsPage";
import { GameHomePage } from "./home";
import { Gem, Bell, User, MapPin, LogOut, Loader2, Sun, Moon, Menu, X, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Coins } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BalanceItem {
  id: number;
  balanceId: number;
  title: string;
  sum: string;
}

function formatResourceNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

async function fetchBalances(): Promise<BalanceItem[]> {
  const res = await fetch("/api/balances", { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.filter((b: BalanceItem) => parseFloat(b.sum) > 0);
}
import { useNotesData } from "../hooks/useNotesData";
import { useLogout } from "../lib/api";
import { roadmapApi } from "../lib/roadmapApi";
import type { Task, TaskCategory, Goal, RoadMap, Milestone, Category } from "../App";

export function NotesApp() {
  const isMobile = useIsMobile();
  const {
    isLoading,
    user,
    notes,
    notebooks,
    categories: apiCategories,
    selectedNote,
    setSelectedNote,
    handleCreateNote,
    handleUpdateNote,
    handleDeleteNote,
    handleTogglePin,
    handleCreateCategory,
    isSaving,
  } = useNotesData();

  const localCategories: Category[] = useMemo(() => {
    if (!apiCategories || apiCategories.length === 0) return [];
    return apiCategories.map((cat: any) => ({
      id: cat.id.toString(),
      name: cat.name,
      icon: cat.color ? "Folder" : "Briefcase",
    }));
  }, [apiCategories]);

  const handleAddCategory = async (category: Category) => {
    await handleCreateCategory(category.name, "#6366f1");
  };

  const logoutMutation = useLogout();
  
  const [activeView, setActiveView] = useState<"home" | "notes" | "tasks" | "goals" | "files" | "roadmap" | "links" | "crypto" | "apps">("home");
  const [selectedRoadMap, setSelectedRoadMap] = useState<RoadMap | null>(null);
  const [searchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<string>("all");
  const [showResources, setShowResources] = useState(false);

  // Sync category when note is selected
  useEffect(() => {
    if (selectedNote && apiCategories) {
      const noteApiData = notes.find(n => n.id === selectedNote.id);
      if (noteApiData) {
        const category = apiCategories.find((c: any) => c.id === noteApiData.categoryId);
        if (category) {
          setSelectedNoteCategory(category.id);
        } else {
          setSelectedNoteCategory("all");
        }
      }
    }
  }, [selectedNote, apiCategories, notes]);
  const [selectedRoadmapCategory, setSelectedRoadmapCategory] = useState<string>("all");

  const { theme, toggleTheme } = useTheme();

  const { data: balances = [] } = useQuery({
    queryKey: ["balances"],
    queryFn: fetchBalances,
    staleTime: 30000,
  });
  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [_tasksLoading, setTasksLoading] = useState(false);

  const loadTaskData = useCallback(async () => {
    setTasksLoading(true);
    try {
      const [categoriesRes, tasksRes] = await Promise.all([
        fetch("/api/task-categories", { credentials: "include" }),
        fetch("/api/tasks", { credentials: "include" }),
      ]);
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setTaskCategories(categoriesData);
      }
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.map((t: any) => ({
          ...t,
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          subtasks: t.subtasks || [],
        })));
      }
    } catch (error) {
      console.error("Error loading task data:", error);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "tasks") {
      loadTaskData();
    }
  }, [activeView, loadTaskData]);

  const [goals, setGoals] = useState<Goal[]>([]);

  const loadGoals = useCallback(async () => {
    try {
      const response = await fetch("/api/goals", { credentials: "include" });
      if (response.ok) {
        const goalsData = await response.json();
        setGoals(goalsData.map((g: any) => ({
          ...g,
          createdAt: new Date(g.createdAt),
        })));
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  }, []);

  useEffect(() => {
    if (activeView === "goals") {
      loadGoals();
    }
  }, [activeView, loadGoals]);

  const [roadmaps, setRoadmaps] = useState<RoadMap[]>([]);
  const [roadmapCategories, setRoadmapCategories] = useState<any[]>([]);

  const loadRoadmaps = useCallback(async () => {
    try {
      const response = await fetch("/api/roadmaps", { credentials: "include" });
      if (response.ok) {
        const roadmapsData = await response.json();
        setRoadmaps(roadmapsData.map((r: any) => ({
          ...r,
          milestones: (r.milestones || []).map((m: any) => ({
            ...m,
            year: String(m.year),
            date: m.date ? new Date(m.date) : new Date(),
          })),
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          targetDate: r.targetDate ? new Date(r.targetDate) : undefined,
        })));
      }
    } catch (error) {
      console.error("Error loading roadmaps:", error);
    }
  }, []);

  const loadRoadmapCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/roadmap-categories", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setRoadmapCategories(data);
      }
    } catch (error) {
      console.error("Error loading roadmap categories:", error);
    }
  }, []);

  useEffect(() => {
    if (activeView === "roadmap") {
      loadRoadmaps();
      loadRoadmapCategories();
    }
  }, [activeView, loadRoadmaps, loadRoadmapCategories]);

  useEffect(() => {
    if (activeView === "roadmap" && roadmaps.length > 0 && !selectedRoadMap && !isMobile) {
      setSelectedRoadMap(roadmaps[0]);
    }
  }, [roadmaps, activeView, selectedRoadMap, isMobile]);


  const handleAddRoadmapCategory = async (name: string, icon?: string, color?: string) => {
    try {
      const response = await fetch("/api/roadmap-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, icon, color }),
      });
      if (response.ok) {
        const newCategory = await response.json();
        setRoadmapCategories([...roadmapCategories, newCategory]);
        return newCategory;
      }
    } catch (error) {
      console.error("Error creating roadmap category:", error);
    }
    return null;
  };

  const handleUpdateRoadmapCategory = async (roadmapId: string, categoryId: string | null) => {
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categoryId }),
      });
      if (response.ok) {
        const updatedData = await response.json();
        setRoadmaps(roadmaps.map(r => 
          r.id === roadmapId ? { ...r, ...updatedData } : r
        ));
      }
    } catch (error) {
      console.error("Error updating roadmap category:", error);
    }
  };

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch("/api/files/scan", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders.map((f: any) => ({
          ...f,
          type: "folder" as const,
          createdAt: new Date(f.createdAt),
        })));
        setFileItems(data.files.map((f: any) => ({
          ...f,
          type: "file" as const,
          uploadedAt: new Date(f.uploadedAt),
        })));
      }
    } catch (error) {
      console.error("Error loading files:", error);
    }
  }, []);

  useEffect(() => {
    if (activeView === "files") {
      loadFiles();
    }
  }, [activeView, loadFiles]);

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    const previousTasks = [...tasks];
    
    setTasks(tasks.map((t) => 
      t.id === taskId 
        ? { ...t, completed: newCompleted, subtasks: t.subtasks.map(st => ({ ...st, completed: newCompleted })) }
        : t
    ));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed: newCompleted }),
      });
      
      if (!response.ok) throw new Error("Failed to update task");
      
      await Promise.all(task.subtasks.map(subtask => 
        fetch(`/api/subtasks/${subtask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ completed: newCompleted }),
        })
      ));
    } catch (error) {
      console.error("Error toggling task:", error);
      setTasks(previousTasks);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const subtask = task?.subtasks.find(st => st.id === subtaskId);
    if (!task || !subtask) return;

    const newCompleted = !subtask.completed;
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: newCompleted } : st
    );
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
    const previousTasks = [...tasks];
    
    setTasks(tasks.map((t) => 
      t.id === taskId 
        ? { ...t, subtasks: updatedSubtasks, completed: allCompleted }
        : t
    ));

    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed: newCompleted }),
      });
      
      if (!response.ok) throw new Error("Failed to update subtask");
      
      if (allCompleted !== task.completed) {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ completed: allCompleted }),
        });
      }
    } catch (error) {
      console.error("Error toggling subtask:", error);
      setTasks(previousTasks);
    }
  };

  const handleAddSubtask = async (taskId: string, title: string) => {
    const previousTasks = [...tasks];
    const tempId = "temp-" + Date.now().toString();
    
    setTasks(tasks.map((task) =>
      task.id === taskId
        ? { ...task, subtasks: [...task.subtasks, { id: tempId, title, completed: false }], completed: false }
        : task
    ));

    try {
      const response = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) throw new Error("Failed to create subtask");
      
      const newSubtask = await response.json();
      setTasks(currentTasks => currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.map(st => st.id === tempId ? { ...newSubtask } : st), completed: false }
          : task
      ));
    } catch (error) {
      console.error("Error adding subtask:", error);
      setTasks(previousTasks);
    }
  };

  const handleDeleteSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const previousTasks = [...tasks];
    const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);
    const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
    
    setTasks(tasks.map((t) => 
      t.id === taskId 
        ? { ...t, subtasks: updatedSubtasks, completed: updatedSubtasks.length === 0 ? t.completed : allCompleted }
        : t
    ));

    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete subtask");
    } catch (error) {
      console.error("Error deleting subtask:", error);
      setTasks(previousTasks);
    }
  };

  const handleCreateTask = async (title: string, priority: "low" | "medium" | "high", categoryId: string, sticker?: string, dueDate?: Date) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, priority, categoryId, sticker: sticker || null, dueDate: dueDate?.toISOString() }),
      });
      
      if (!response.ok) throw new Error("Failed to create task");
      
      const newTask = await response.json();
      setTasks(currentTasks => [...currentTasks, { ...newTask, subtasks: [] }]);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = [...tasks];
    setTasks(tasks.filter((task) => task.id !== taskId));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete task");
    } catch (error) {
      console.error("Error deleting task:", error);
      setTasks(previousTasks);
    }
  };

  const handleUpdateTaskSticker = async (taskId: string, sticker: string | undefined) => {
    const previousTasks = [...tasks];
    setTasks(tasks.map((task) => task.id === taskId ? { ...task, sticker } : task));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sticker: sticker || null }),
      });
      if (!response.ok) throw new Error("Failed to update sticker");
    } catch (error) {
      console.error("Error updating task sticker:", error);
      setTasks(previousTasks);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const previousTasks = [...tasks];
    
    const normalizedUpdates: Partial<Task> = { ...updates };
    if (updates.dueDate !== undefined) {
      if (updates.dueDate) {
        normalizedUpdates.dueDate = updates.dueDate instanceof Date 
          ? new Date(updates.dueDate.getTime())
          : new Date(updates.dueDate);
      } else {
        normalizedUpdates.dueDate = undefined;
      }
    }
    
    setTasks(tasks.map((task) => task.id === taskId ? { ...task, ...normalizedUpdates } : task));

    try {
      const apiUpdates: Record<string, unknown> = {};
      if (updates.dueDate !== undefined) {
        if (updates.dueDate) {
          const dateObj = updates.dueDate instanceof Date ? updates.dueDate : new Date(updates.dueDate);
          apiUpdates.dueDate = dateObj.toISOString();
        } else {
          apiUpdates.dueDate = null;
        }
      }
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.priority !== undefined) apiUpdates.priority = updates.priority;
      if (updates.sticker !== undefined) apiUpdates.sticker = updates.sticker || null;
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(apiUpdates),
      });
      if (!response.ok) throw new Error("Failed to update task");
    } catch (error) {
      console.error("Error updating task:", error);
      setTasks(previousTasks);
    }
  };

  const handleAddTaskCategory = async (name: string, color: string): Promise<TaskCategory> => {
    const previousCategories = [...taskCategories];
    const tempCategory: TaskCategory = {
      id: "temp-" + Date.now().toString(),
      name,
      color,
    };
    setTaskCategories([...taskCategories, tempCategory]);

    try {
      const response = await fetch("/api/task-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color }),
      });
      
      if (!response.ok) throw new Error("Failed to create category");
      
      const newCategory = await response.json();
      setTaskCategories(cats => cats.map(c => c.id === tempCategory.id ? newCategory : c));
      return newCategory;
    } catch (error) {
      console.error("Error creating task category:", error);
      setTaskCategories(previousCategories);
      return tempCategory;
    }
  };

  const handleReorderTasks = async (reorderedTasks: Task[]) => {
    const previousTasks = [...tasks];
    setTasks(reorderedTasks);

    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ taskIds: reorderedTasks.map(t => t.id) }),
      });
      if (!response.ok) throw new Error("Failed to reorder tasks");
    } catch (error) {
      console.error("Error reordering tasks:", error);
      setTasks(previousTasks);
    }
  };

  const handleAddGoal = async (goalData: Omit<Goal, "id" | "createdAt">) => {
    const previousGoals = [...goals];
    const tempGoal: Goal = {
      id: "temp-" + Date.now().toString(),
      ...goalData,
      createdAt: new Date(),
    };
    setGoals([...goals, tempGoal]);

    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: goalData.title,
          description: goalData.description,
          imageUrl: goalData.imageUrl,
          price: goalData.price,
          completed: goalData.completed,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to create goal");
      
      const newGoal = await response.json();
      setGoals(g => g.map(goal => goal.id === tempGoal.id ? { ...newGoal, createdAt: new Date(newGoal.createdAt) } : goal));
    } catch (error) {
      console.error("Error creating goal:", error);
      setGoals(previousGoals);
    }
  };

  const handleUpdateGoal = async (goalId: string, goalData: Partial<Goal>) => {
    const previousGoals = [...goals];
    setGoals(goals.map((goal) => (goal.id === goalId ? { ...goal, ...goalData } : goal)));

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(goalData),
      });
      if (!response.ok) throw new Error("Failed to update goal");
    } catch (error) {
      console.error("Error updating goal:", error);
      setGoals(previousGoals);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const previousGoals = [...goals];
    setGoals(goals.filter((goal) => goal.id !== goalId));

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete goal");
    } catch (error) {
      console.error("Error deleting goal:", error);
      setGoals(previousGoals);
    }
  };

  const handleReorderGoals = async (reorderedGoals: Goal[]) => {
    const previousGoals = [...goals];
    setGoals(reorderedGoals);

    try {
      const response = await fetch("/api/goals/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ goalIds: reorderedGoals.map(g => g.id) }),
      });
      if (!response.ok) throw new Error("Failed to reorder goals");
    } catch (error) {
      console.error("Error reordering goals:", error);
      setGoals(previousGoals);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const response = await fetch("/api/files/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleUploadFiles = async (files: File[], folderId: string) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      
      const response = await fetch(`/api/files/upload?folderId=${encodeURIComponent(folderId)}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (response.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Error uploading files:", error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/filesystem/${encodeURIComponent(fileId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/files/folders/${encodeURIComponent(folderId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.ok) {
        await loadFiles();
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    setFileItems(fileItems.map((file) => (file.id === fileId ? { ...file, name: newName } : file)));
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    setFolders(folders.map((folder) => (folder.id === folderId ? { ...folder, name: newName } : folder)));
  };

  const handleCreateRoadMap = async () => {
    try {
      const newRoadMap = await roadmapApi.createRoadmap({
        title: "New Roadmap",
        notebook: notebooks[0]?.name || "Default",
      });
      setRoadmaps([newRoadMap, ...roadmaps]);
      setSelectedRoadMap(newRoadMap);
    } catch (error) {
      console.error("Error creating roadmap:", error);
    }
  };

  const handleUpdateRoadMap = async (updatedRoadMap: RoadMap) => {
    setRoadmaps(roadmaps.map((r) => (r.id === updatedRoadMap.id ? updatedRoadMap : r)));
    setSelectedRoadMap(updatedRoadMap);

    try {
      await roadmapApi.updateRoadmap(updatedRoadMap.id, {
        title: updatedRoadMap.title,
        notebook: updatedRoadMap.notebook,
        targetDate: updatedRoadMap.targetDate,
        pinned: updatedRoadMap.pinned,
      });
    } catch (error) {
      console.error("Error updating roadmap:", error);
    }
  };

  const handleDeleteRoadMap = async (roadmapId: string) => {
    const previousRoadmaps = [...roadmaps];
    setRoadmaps(roadmaps.filter((r) => r.id !== roadmapId));
    if (selectedRoadMap?.id === roadmapId) setSelectedRoadMap(null);

    try {
      await roadmapApi.deleteRoadmap(roadmapId);
    } catch (error) {
      console.error("Error deleting roadmap:", error);
      setRoadmaps(previousRoadmaps);
    }
  };

  const handleTogglePinRoadMap = async (roadmapId: string) => {
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) return;

    const newPinned = !roadmap.pinned;
    setRoadmaps(roadmaps.map((r) => (r.id === roadmapId ? { ...r, pinned: newPinned } : r)));

    try {
      await roadmapApi.updateRoadmap(roadmapId, { pinned: newPinned });
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  const handleAddMilestone = async (roadmapId: string) => {
    try {
      const milestone = await roadmapApi.createMilestone(roadmapId, {
        year: new Date().getFullYear(),
        title: "New Milestone",
        description: "",
        completed: false,
        date: new Date(),
      });

      setRoadmaps(roadmaps.map((r) =>
        r.id === roadmapId ? { ...r, milestones: [...r.milestones, milestone] } : r
      ));

      if (selectedRoadMap?.id === roadmapId) {
        setSelectedRoadMap({
          ...selectedRoadMap,
          milestones: [...selectedRoadMap.milestones, milestone],
        });
      }
    } catch (error) {
      console.error("Error adding milestone:", error);
    }
  };

  const handleUpdateMilestone = async (
    roadmapId: string,
    milestoneId: string,
    updates: Partial<Milestone>
  ) => {
    setRoadmaps(roadmaps.map((r) =>
      r.id === roadmapId
        ? { ...r, milestones: r.milestones.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m)) }
        : r
    ));

    if (selectedRoadMap?.id === roadmapId) {
      setSelectedRoadMap({
        ...selectedRoadMap,
        milestones: selectedRoadMap.milestones.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m)),
      });
    }

    try {
      await roadmapApi.updateMilestone(milestoneId, {
        year: updates.year !== undefined ? Number(updates.year) : undefined,
        title: updates.title,
        description: updates.description,
        completed: updates.completed,
        date: updates.date,
        images: updates.images,
      });
    } catch (error) {
      console.error("Error updating milestone:", error);
    }
  };

  const handleDeleteMilestone = async (roadmapId: string, milestoneId: string) => {
    setRoadmaps(roadmaps.map((r) =>
      r.id === roadmapId ? { ...r, milestones: r.milestones.filter((m) => m.id !== milestoneId) } : r
    ));

    if (selectedRoadMap?.id === roadmapId) {
      setSelectedRoadMap({
        ...selectedRoadMap,
        milestones: selectedRoadMap.milestones.filter((m) => m.id !== milestoneId),
      });
    }

    try {
      await roadmapApi.deleteMilestone(milestoneId);
    } catch (error) {
      console.error("Error deleting milestone:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full flex flex-col overflow-hidden ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'}`}>
      <header className={`h-16 border-b flex items-center justify-between px-4 md:px-6 flex-shrink-0 backdrop-blur-xl ${theme === 'dark' ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200/60 bg-white/40'}`}>
        <div className="flex items-center gap-4 md:gap-8">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/60 text-slate-400' : 'hover:bg-white/60 text-gray-600'}`}
            data-testid="button-mobile-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img 
            src={theme === 'dark' ? '/assets/logo-dark.png' : '/assets/logo.png'} 
            alt="eNote" 
            className="h-10"
          />
          {/* Unified Resources Button with Expandable Panel */}
          <motion.div
            className={`
              hidden md:flex items-center h-10 rounded-xl overflow-hidden cursor-pointer
              backdrop-blur-lg shadow-lg transition-colors
              ${theme === 'dark' 
                ? 'bg-slate-800/90 border border-slate-600 hover:bg-slate-700/90' 
                : 'bg-white/80 border border-gray-200/60 hover:bg-white/95'
              }
            `}
            onClick={() => setShowResources(!showResources)}
            data-testid="button-toggle-resources"
            layout
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Gem Icon - Always Visible */}
            <div className={`flex items-center justify-center px-3 h-full ${
              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
            }`}>
              <Gem className="w-5 h-5" />
            </div>

            {/* Resources - Animated Expand */}
            <AnimatePresence>
              {showResources && balances.length > 0 && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center overflow-hidden"
                >
                  {/* Separator after gem */}
                  <div className={`w-px h-6 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'}`} />
                  
                  {balances.map((balance, index) => (
                    <div key={balance.id} className="flex items-center">
                      <div className="flex items-center gap-1.5 px-2.5">
                        <span className={`text-[11px] font-semibold ${
                          theme === 'dark' ? 'text-white/90' : 'text-gray-700'
                        }`}>
                          {formatResourceNumber(parseFloat(balance.sum))}
                        </span>
                        <img 
                          src={`/balances/${balance.balanceId}.png`} 
                          alt={balance.title || "Balance"}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <Coins className={`w-5 h-5 hidden ${theme === 'dark' ? 'text-amber-400' : 'text-amber-500'}`} />
                      </div>
                      {index < balances.length - 1 && (
                        <div className={`w-px h-5 flex-shrink-0 ${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-300'}`} />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {isSaving && (
            <div className={`hidden md:flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/60' : 'hover:bg-white/60'}`}
            data-testid="button-toggle-dark-mode"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/60' : 'hover:bg-white/60'}`} 
            data-testid="button-notifications"
          >
            <Bell className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`} />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${theme === 'dark' ? 'hover:bg-slate-700/60' : 'hover:bg-white/60'}`}
              data-testid="button-user"
            >
              <User className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`} />
              {user && <span className={`text-sm hidden md:inline ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>{user.displayName || user.email}</span>}
            </button>
            {showUserMenu && createPortal(
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <button
                  onClick={handleLogout}
                  className={`fixed right-6 top-16 w-48 px-4 py-3 text-sm flex items-center justify-center gap-2 rounded-lg shadow-xl z-50 ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>,
              document.body
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="overlay-mobile-menu"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 shadow-2xl"
              >
                <div className={`absolute top-4 right-4 z-10`}>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/60 text-slate-400' : 'hover:bg-gray-100 text-gray-500'}`}
                    data-testid="button-close-mobile-menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Sidebar
                  activeView={activeView}
                  onViewChange={(view) => {
                    setActiveView(view);
                    setMobileMenuOpen(false);
                  }}
                  onCreateNote={() => {
                    handleCreateNote();
                    setMobileMenuOpen(false);
                  }}
                  isDark={theme === 'dark'}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            onCreateNote={handleCreateNote}
            isDark={theme === 'dark'}
          />
        </div>

        {activeView === "home" ? (
          <div className="flex-1 overflow-auto">
            <GameHomePage isDark={theme === 'dark'} userName={user?.displayName || user?.email || "User"} />
          </div>
        ) : activeView === "notes" ? (
          isMobile ? (
            <AnimatePresence mode="wait">
              {selectedNote && notes.some(n => n.id === selectedNote.id) ? (
                <motion.div
                  key="note-editor-mobile"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className={`flex items-center gap-2 px-3 py-2 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                    <button
                      onClick={() => setSelectedNote(null)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-slate-300 hover:bg-slate-700/60' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      data-testid="button-mobile-back-to-notes"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-sm font-medium">Назад</span>
                    </button>
                  </div>
                  <NoteEditor
                    note={selectedNote}
                    onUpdateNote={handleUpdateNote}
                    notebooks={notebooks}
                    categories={localCategories}
                    onAddCategory={handleAddCategory}
                    selectedCategory={selectedNoteCategory}
                    onCategoryChange={setSelectedNoteCategory}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="note-list-mobile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ x: "-30%", opacity: 0 }}
                  transition={{ type: "tween", duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {notes.length > 0 ? (
                    <NoteList
                      notes={notes}
                      selectedNote={selectedNote}
                      onSelectNote={setSelectedNote}
                      onDeleteNote={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                      searchQuery={searchQuery}
                      notebooks={notebooks}
                      categories={localCategories}
                      selectedCategory={selectedNoteCategory}
                      onCategoryChange={setSelectedNoteCategory}
                      isDark={theme === 'dark'}
                    />
                  ) : (
                    <EmptyState onCreateNote={handleCreateNote} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          ) : notes.length > 0 ? (
            <NoteList
              notes={notes}
              selectedNote={selectedNote}
              onSelectNote={setSelectedNote}
              onDeleteNote={handleDeleteNote}
              onTogglePin={handleTogglePin}
              searchQuery={searchQuery}
              notebooks={notebooks}
              categories={localCategories}
              selectedCategory={selectedNoteCategory}
              onCategoryChange={setSelectedNoteCategory}
              isDark={theme === 'dark'}
            />
          ) : (
            <EmptyState onCreateNote={handleCreateNote} />
          )
        ) : activeView === "tasks" ? (
          <TaskManager
            tasks={tasks}
            taskCategories={taskCategories}
            onToggleTask={handleToggleTask}
            onToggleSubtask={handleToggleSubtask}
            onAddSubtask={handleAddSubtask}
            onDeleteSubtask={handleDeleteSubtask}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskSticker={handleUpdateTaskSticker}
            onAddTaskCategory={handleAddTaskCategory}
            onReorderTasks={handleReorderTasks}
            isDark={theme === 'dark'}
          />
        ) : activeView === "files" ? (
          <FileManager
            folders={folders}
            files={fileItems}
            onCreateFolder={handleCreateFolder}
            onUploadFiles={handleUploadFiles}
            onDeleteFile={handleDeleteFile}
            onDeleteFolder={handleDeleteFolder}
            onRenameFile={handleRenameFile}
            onRenameFolder={handleRenameFolder}
            isDark={theme === 'dark'}
          />
        ) : activeView === "links" ? (
          <LinkCenter isDark={theme === 'dark'} />
        ) : activeView === "crypto" ? (
          <CryptoWallets isDark={theme === 'dark'} />
        ) : activeView === "apps" ? (
          <AppsPage isDark={theme === 'dark'} />
        ) : activeView === "roadmap" ? (
          isMobile ? (
            <AnimatePresence mode="wait">
              {selectedRoadMap ? (
                <motion.div
                  key="roadmap-editor-mobile"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "tween", duration: 0.25 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className={`flex items-center gap-2 px-3 py-2 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                    <button
                      onClick={() => setSelectedRoadMap(null)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                        theme === 'dark' ? 'text-slate-300 hover:bg-slate-700/60' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      data-testid="button-mobile-back-to-roadmaps"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-sm font-medium">Назад</span>
                    </button>
                  </div>
                  <RoadMapEditor
                    roadMap={selectedRoadMap}
                    onUpdateRoadMap={handleUpdateRoadMap}
                    onAddMilestone={handleAddMilestone}
                    onUpdateMilestone={handleUpdateMilestone}
                    onDeleteMilestone={handleDeleteMilestone}
                    notebooks={notebooks}
                    categories={localCategories}
                    onAddCategory={handleAddCategory}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="roadmap-list-mobile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ x: "-30%", opacity: 0 }}
                  transition={{ type: "tween", duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <RoadMapList
                    roadmaps={roadmaps}
                    selectedRoadMap={selectedRoadMap}
                    onSelectRoadMap={setSelectedRoadMap}
                    onTogglePin={handleTogglePinRoadMap}
                    searchQuery={searchQuery}
                    notebooks={notebooks}
                    roadmapCategories={roadmapCategories as any}
                    onAddRoadmapCategory={handleAddRoadmapCategory}
                    onUpdateRoadmapCategory={handleUpdateRoadmapCategory}
                    selectedCategory={selectedRoadmapCategory}
                    onCategoryChange={setSelectedRoadmapCategory}
                    isDark={theme === 'dark'}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <RoadMapList
              roadmaps={roadmaps}
              selectedRoadMap={selectedRoadMap}
              onSelectRoadMap={setSelectedRoadMap}
              onTogglePin={handleTogglePinRoadMap}
              searchQuery={searchQuery}
              notebooks={notebooks}
              roadmapCategories={roadmapCategories as any}
              onAddRoadmapCategory={handleAddRoadmapCategory}
              onUpdateRoadmapCategory={handleUpdateRoadmapCategory}
              selectedCategory={selectedRoadmapCategory}
              onCategoryChange={setSelectedRoadmapCategory}
              isDark={theme === 'dark'}
            />
          )
        ) : null}

        {!isMobile && activeView === "notes" && selectedNote && notes.some(n => n.id === selectedNote.id) && (
          <NoteEditor 
            note={selectedNote} 
            onUpdateNote={handleUpdateNote} 
            notebooks={notebooks} 
            categories={localCategories}
            onAddCategory={handleAddCategory}
            selectedCategory={selectedNoteCategory}
            onCategoryChange={setSelectedNoteCategory}
          />
        )}

        {!isMobile && activeView === "notes" && notes.length > 0 && !selectedNote && (
          <div className={`flex-1 flex items-center justify-center backdrop-blur-sm border-l ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-br from-white/30 to-white/10 border-gray-300'}`}>
            <div className="text-center">
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>
                Select a note or create a new one to get started
              </p>
            </div>
          </div>
        )}

        {activeView === "goals" && (
          <GoalsDesk
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onReorderGoals={handleReorderGoals}
            isDark={theme === 'dark'}
          />
        )}

        {!isMobile && activeView === "roadmap" && selectedRoadMap && (
          <RoadMapEditor
            roadMap={selectedRoadMap}
            onUpdateRoadMap={handleUpdateRoadMap}
            onAddMilestone={handleAddMilestone}
            onUpdateMilestone={handleUpdateMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            notebooks={notebooks}
            categories={localCategories}
            onAddCategory={handleAddCategory}
          />
        )}

        {!isMobile && activeView === "roadmap" && !selectedRoadMap && (
          <div className={`flex-1 flex flex-col overflow-hidden backdrop-blur-sm border-l ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-br from-white/40 to-white/20 border-gray-300'}`}>
            <div className={`h-px w-full flex-shrink-0 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MapPin className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-gray-300'}`} />
                <p className={`mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>No roadmap selected</p>
                <button
                  onClick={handleCreateRoadMap}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                  data-testid="button-create-roadmap"
                >
                  Create New Roadmap
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Notification Center */}
      <NotificationCenter
        isDark={theme === 'dark'}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}
