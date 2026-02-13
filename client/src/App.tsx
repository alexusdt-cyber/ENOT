import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { Sidebar } from "./components/Sidebar";
import { NoteList } from "./components/NoteList";
import { NoteEditor } from "./components/NoteEditor";
import { TaskManager } from "./components/TaskManager";
import { GoalsDesk } from "./components/GoalsDesk";
import { FileManager, FileItem, FolderItem } from "./components/FileManager";
import { RoadMapList } from "./components/RoadMapList";
import { RoadMapEditor } from "./components/RoadMapEditor";
import { EmptyState } from "./components/EmptyState";
import { SharedNoteView } from "./pages/SharedNoteView";
import { GameHomePage } from "./components/home";
import { roadmapApi } from "./lib/roadmapApi";
import { Gem, Bell, User, MapPin, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Toaster } from "sonner";

export interface Block {
  id: string;
  type: "text" | "code" | "tasklist" | "image" | "bulletlist" | "orderedlist" | "table";
  content: string;
  metadata?: {
    language?: string;
    tasks?: { 
      id: string; 
      text: string; 
      completed: boolean;
      dueDate?: Date;
      reminder?: boolean;
    }[];
    taskListTitle?: string;
    width?: number;
    height?: number;
    items?: string[];
    images?: string[]; // Array of image URLs for gallery
    alignment?: "left" | "center" | "right"; // Image alignment
    tableData?: {
      rows: number;
      cols: number;
      cells: { [key: string]: string }; // key format: "row-col"
      alignment?: { [key: string]: "left" | "center" | "right" };
      columnWidths?: { [key: number]: number };
      tableWidth?: number;
    };
  };
}

export interface Note {
  id: string;
  title: string;
  blocks: Block[];
  notebook: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  pinned?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  categoryId: string;
  subtasks: SubTask[];
  sticker?: string;
  order?: number;
}

export interface TaskCategory {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
  categoryId?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  images?: string[];
  price?: number | null;
  completed: boolean;
  createdAt: Date;
  order?: number;
}

export interface Milestone {
  id: string;
  year: string;
  title: string;
  description: string;
  completed: boolean;
  date: Date;
  images?: string[];
  pdfFiles?: string[];
  videos?: string[];
  order?: number;
}

export interface RoadMap {
  id: string;
  title: string;
  notebook: string;
  categoryId?: string;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
  targetDate?: Date;
  pinned?: boolean;
}

export interface RoadmapCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export default function App() {
  // Check if viewing a shared note
  const [match, params] = useRoute<{ shareLink: string }>("/shared/:shareLink");
  if (match) {
    return <SharedNoteView shareLink={params!.shareLink} />;
  }

  const [activeView, setActiveView] = useState<"home" | "notes" | "tasks" | "goals" | "files" | "roadmap" | "links" | "crypto" | "apps">("home");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedRoadMap, setSelectedRoadMap] = useState<RoadMap | null>(null);
  const [selectedRoadmapCategory, setSelectedRoadmapCategory] = useState<string>("all");
  const [showResources, setShowResources] = useState(false);
  const [searchQuery] = useState("");

  const { data: balances = [] } = useQuery({
    queryKey: ["balances"],
    queryFn: fetchBalances,
    staleTime: 30000,
  });

  const [categories, setCategories] = useState<Category[]>([
    { id: "work", name: "Work", icon: "Briefcase" },
    { id: "personal", name: "Personal", icon: "Home" },
    { id: "study", name: "Study", icon: "GraduationCap" },
  ]);

  const [notebooks] = useState<Notebook[]>([
    { id: "1", name: "First Notebook", color: "#4F46E5" },
    { id: "2", name: "Work Notes", color: "#10B981", categoryId: "work" },
    { id: "3", name: "Personal", color: "#F59E0B", categoryId: "personal" },
    { id: "4", name: "Study Notes", color: "#8B5CF6", categoryId: "study" },
  ]);

  const [notes, setNotes] = useState<Note[]>([]);

  const [taskCategories, setTaskCategories] = useState<TaskCategory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [_tasksLoading, setTasksLoading] = useState(true);

  const loadTaskData = useCallback(async () => {
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
  const [roadmapCategories, setRoadmapCategories] = useState<RoadmapCategory[]>([]);

  const loadRoadmaps = useCallback(async () => {
    try {
      const response = await fetch("/api/roadmaps", { credentials: "include" });
      if (response.ok) {
        const roadmapsData = await response.json();
        setRoadmaps(roadmapsData.map((r: any) => ({
          ...r,
          milestones: r.milestones.map((m: any) => ({
            ...m,
            year: String(m.year),
            date: m.date ? new Date(m.date) : new Date(),
            images: typeof m.images === 'string' ? JSON.parse(m.images || '[]') : (m.images || []),
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
    console.log("loadRoadmapCategories called");
    try {
      const response = await fetch("/api/roadmap-categories", { credentials: "include" });
      console.log("roadmap-categories response status:", response.status);
      if (response.ok) {
        const categoriesData = await response.json();
        console.log("roadmap-categories data:", categoriesData);
        setRoadmapCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error loading roadmap categories:", error);
    }
  }, []);

  useEffect(() => {
    console.log("activeView changed to:", activeView);
    if (activeView === "roadmap") {
      console.log("Loading roadmaps and roadmap categories...");
      loadRoadmaps();
      loadRoadmapCategories();
    }
  }, [activeView, loadRoadmaps, loadRoadmapCategories]);

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
        // Update selected roadmap if it was changed
        if (selectedRoadMap?.id === roadmapId) {
          setSelectedRoadMap({ ...selectedRoadMap, categoryId: categoryId ?? undefined });
        }
      }
    } catch (error) {
      console.error("Error updating roadmap category:", error);
    }
  };

  // File Manager State
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [_filesLoading, setFilesLoading] = useState(true);

  const loadFileManagerData = useCallback(async () => {
    try {
      const [foldersRes, filesRes] = await Promise.all([
        fetch("/api/folders", { credentials: "include" }),
        fetch("/api/files", { credentials: "include" }),
      ]);
      
      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setFolders(foldersData.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: "folder" as const,
          color: f.color || "#3B82F6",
          filesCount: f.filesCount || 0,
          size: f.size || 0,
          createdAt: new Date(f.createdAt),
        })));
      }
      
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFileItems(filesData.map((f: any) => ({
          id: f.id,
          name: f.originalName || f.name,
          type: "file" as const,
          size: f.size,
          folderId: f.folderId,
          fileType: f.fileType || "other",
          uploadedAt: new Date(f.createdAt),
          url: f.url,
        })));
      }
    } catch (error) {
      console.error("Error loading file manager data:", error);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "files") {
      loadFileManagerData();
    }
  }, [activeView, loadFileManagerData]);

  // Auto-select first note on initial load (considering pinned notes)
  useEffect(() => {
    if (notes.length > 0 && !selectedNote) {
      // Sort notes the same way as in NoteList
      const sortedNotes = [...notes].sort((a, b) => {
        // Pinned notes always at the top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        
        // If both pinned or both not pinned, sort by updatedAt
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      setSelectedNote(sortedNotes[0]);
    }
  }, []);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: "New Note",
      blocks: [{ id: "b" + Date.now(), type: "text", content: "" }],
      notebook: notebooks[0].name,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(
      notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    );
    setSelectedNote(updatedNote);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
    }
  };

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
        const taskResponse = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ completed: allCompleted }),
        });
        if (!taskResponse.ok) throw new Error("Failed to update task");
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
      
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed: false }),
      });
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

  const handleCreateTask = async (title: string, priority: "low" | "medium" | "high", categoryId: string, sticker?: string, dueDate?: Date) => {
    try {
      const maxOrder = tasks.reduce((max, task) => Math.max(max, task.order || 0), -1);
      const newOrder = maxOrder + 1;
      
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, priority, categoryId, sticker, dueDate: dueDate?.toISOString(), order: newOrder }),
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

  const handleAddGoal = async (goalData: Omit<Goal, "id" | "createdAt">) => {
    console.log("handleAddGoal called with:", goalData);
    const previousGoals = [...goals];
    const tempGoal: Goal = {
      id: "temp-" + Date.now().toString(),
      ...goalData,
      createdAt: new Date(),
    };
    setGoals([...goals, tempGoal]);

    try {
      console.log("Sending POST request to /api/goals");
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
      
      console.log("Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error("Failed to create goal");
      }
      
      const newGoal = await response.json();
      console.log("Goal created successfully:", newGoal);
      setGoals(g => g.map(goal => goal.id === tempGoal.id ? { ...newGoal, createdAt: new Date(newGoal.createdAt) } : goal));
    } catch (error) {
      console.error("Error creating goal:", error);
      setGoals(previousGoals);
    }
  };

  const handleUpdateGoal = async (goalId: string, goalData: Partial<Goal>) => {
    const previousGoals = [...goals];
    setGoals(
      goals.map((goal) =>
        goal.id === goalId ? { ...goal, ...goalData } : goal
      )
    );

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

  const handleTogglePin = (noteId: string) => {
    setNotes(
      notes.map((note) =>
        note.id === noteId ? { ...note, pinned: !note.pinned } : note
      )
    );
  };

  // File Manager Handlers
  const handleCreateFolder = async (name: string) => {
    const colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const tempFolder: FolderItem = {
      id: "temp-" + Date.now().toString(),
      name,
      type: "folder",
      color: randomColor,
      filesCount: 0,
      size: 0,
      createdAt: new Date(),
    };
    setFolders([...folders, tempFolder]);

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color: randomColor }),
      });
      
      if (!response.ok) throw new Error("Failed to create folder");
      
      const newFolder = await response.json();
      setFolders(f => f.map(folder => folder.id === tempFolder.id ? {
        id: newFolder.id,
        name: newFolder.name,
        type: "folder" as const,
        color: newFolder.color || randomColor,
        filesCount: 0,
        size: 0,
        createdAt: new Date(newFolder.createdAt),
      } : folder));
    } catch (error) {
      console.error("Error creating folder:", error);
      setFolders(f => f.filter(folder => folder.id !== tempFolder.id));
    }
  };

  const handleUploadFiles = async (filesToUpload: File[], folderId: string) => {
    try {
      const formData = new FormData();
      filesToUpload.forEach(file => formData.append("files", file));
      
      const response = await fetch(`/api/files/upload?folderId=${folderId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Failed to upload files");
      
      const uploadedFiles = await response.json();
      const newFiles: FileItem[] = uploadedFiles.map((f: any) => ({
        id: f.id,
        name: f.originalName || f.name,
        type: "file" as const,
        size: f.size,
        folderId: f.folderId,
        fileType: f.fileType || "other",
        uploadedAt: new Date(f.createdAt),
        url: f.url,
      }));
      
      setFileItems([...fileItems, ...newFiles]);
      
      // Update folder stats
      setFolders(
        folders.map((folder) =>
          folder.id === folderId
            ? {
                ...folder,
                filesCount: folder.filesCount + newFiles.length,
                size: folder.size + newFiles.reduce((acc, file) => acc + file.size, 0),
              }
            : folder
        )
      );
    } catch (error) {
      console.error("Error uploading files:", error);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = fileItems.find((f) => f.id === fileId);
    if (!file) return;

    const previousFiles = [...fileItems];
    const previousFolders = [...folders];
    
    setFileItems(fileItems.filter((f) => f.id !== fileId));
    setFolders(
      folders.map((folder) =>
        folder.id === file.folderId
          ? {
              ...folder,
              filesCount: folder.filesCount - 1,
              size: folder.size - file.size,
            }
          : folder
      )
    );

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete file");
    } catch (error) {
      console.error("Error deleting file:", error);
      setFileItems(previousFiles);
      setFolders(previousFolders);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    const previousFolders = [...folders];
    const previousFiles = [...fileItems];
    
    setFileItems(fileItems.filter((file) => file.folderId !== folderId));
    setFolders(folders.filter((folder) => folder.id !== folderId));

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete folder");
    } catch (error) {
      console.error("Error deleting folder:", error);
      setFolders(previousFolders);
      setFileItems(previousFiles);
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    const previousFiles = [...fileItems];
    setFileItems(
      fileItems.map((file) =>
        file.id === fileId ? { ...file, name: newName } : file
      )
    );

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error("Failed to rename file");
    } catch (error) {
      console.error("Error renaming file:", error);
      setFileItems(previousFiles);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const previousFolders = [...folders];
    setFolders(
      folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: newName } : folder
      )
    );

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error("Failed to rename folder");
    } catch (error) {
      console.error("Error renaming folder:", error);
      setFolders(previousFolders);
    }
  };

  // RoadMap Handlers
  const handleCreateRoadMap = async () => {
    try {
      const newRoadMap = await roadmapApi.createRoadmap({
        title: "New Roadmap",
        notebook: notebooks[0].name,
      });
      setRoadmaps([newRoadMap, ...roadmaps]);
      setSelectedRoadMap(newRoadMap);
    } catch (error) {
      console.error("Error creating roadmap:", error);
    }
  };

  const handleUpdateRoadMap = async (updatedRoadMap: RoadMap) => {
    setRoadmaps(
      roadmaps.map((roadmap) =>
        roadmap.id === updatedRoadMap.id ? updatedRoadMap : roadmap
      )
    );
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
      loadRoadmaps();
    }
  };

  const handleDeleteRoadMap = async (roadmapId: string) => {
    const previousRoadmaps = [...roadmaps];
    setRoadmaps(roadmaps.filter((roadmap) => roadmap.id !== roadmapId));
    if (selectedRoadMap?.id === roadmapId) {
      setSelectedRoadMap(null);
    }

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
    setRoadmaps(
      roadmaps.map((r) =>
        r.id === roadmapId ? { ...r, pinned: newPinned } : r
      )
    );

    try {
      await roadmapApi.updateRoadmap(roadmapId, { pinned: newPinned });
    } catch (error) {
      console.error("Error toggling pin:", error);
      loadRoadmaps();
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

      setRoadmaps(
        roadmaps.map((r) =>
          r.id === roadmapId
            ? { ...r, milestones: [...r.milestones, milestone] }
            : r
        )
      );

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
    setRoadmaps(
      roadmaps.map((r) =>
        r.id === roadmapId
          ? {
              ...r,
              milestones: r.milestones.map((m) =>
                m.id === milestoneId ? { ...m, ...updates } : m
              ),
            }
          : r
      )
    );

    if (selectedRoadMap?.id === roadmapId) {
      setSelectedRoadMap({
        ...selectedRoadMap,
        milestones: selectedRoadMap.milestones.map((m) =>
          m.id === milestoneId ? { ...m, ...updates } : m
        ),
      });
    }

    try {
      await roadmapApi.updateMilestone(milestoneId, {
        year: updates.year !== undefined ? Number(updates.year) : undefined,
        title: updates.title,
        description: updates.description,
        completed: updates.completed,
        date: updates.date,
      });
    } catch (error) {
      console.error("Error updating milestone:", error);
      loadRoadmaps();
    }
  };

  const handleDeleteMilestone = async (roadmapId: string, milestoneId: string) => {
    setRoadmaps(
      roadmaps.map((r) =>
        r.id === roadmapId
          ? { ...r, milestones: r.milestones.filter((m) => m.id !== milestoneId) }
          : r
      )
    );

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
      loadRoadmaps();
    }
  };

  const handleAddCategory = (category: Category) => {
    setCategories([...categories, category]);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Top Navigation */}
      <header className="h-16 border-b border-gray-200/60 backdrop-blur-xl bg-white/40 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <img 
            src="/assets/logo.png" 
            alt="eNote" 
            className="h-10"
          />
          
          {/* Unified Resources Button with Expandable Panel */}
          <motion.div
            className="flex items-center h-10 rounded-xl overflow-hidden cursor-pointer
              backdrop-blur-lg shadow-lg transition-colors
              bg-white/80 border border-gray-200/60 hover:bg-white/95"
            onClick={() => setShowResources(!showResources)}
            data-testid="button-toggle-resources"
            layout
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {/* Gem Icon - Always Visible */}
            <div className="flex items-center justify-center px-3 h-full text-indigo-500">
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
                  <div className="w-px h-6 flex-shrink-0 bg-gray-300" />
                  
                  {balances.map((balance, index) => (
                    <div key={balance.id} className="flex items-center">
                      <div className="flex items-center gap-1.5 px-2.5">
                        <span className="text-[11px] font-semibold text-gray-700">
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
                        <Coins className="w-5 h-5 hidden text-amber-500" />
                      </div>
                      {index < balances.length - 1 && (
                        <div className="w-px h-5 flex-shrink-0 bg-gray-300" />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/60 rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-white/60 rounded-lg transition-colors">
            <User className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onCreateNote={handleCreateNote}
        />

        {/* Home Page - Full Width Gaming Dashboard */}
        {activeView === "home" && (
          <div className="flex-1 overflow-auto">
            <GameHomePage isDark={false} userName="User" />
          </div>
        )}

        {/* Empty State for Notes - Takes Full Width */}
        {activeView === "notes" && notes.length === 0 && (
          <EmptyState onCreateNote={handleCreateNote} />
        )}

        {/* Normal Content When Notes Exist or Other Views */}
        {(activeView !== "notes" && activeView !== "home") || (activeView === "notes" && notes.length > 0) ? (
          <>
            {/* Middle Panel - Note List or Task List */}
            {activeView === "notes" ? (
              <NoteList
                notes={notes}
                selectedNote={selectedNote}
                onSelectNote={setSelectedNote}
                onDeleteNote={handleDeleteNote}
                onTogglePin={handleTogglePin}
                searchQuery={searchQuery}
                notebooks={notebooks}
                categories={categories}
              />
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
              />
            ) : activeView === "roadmap" ? (
              <RoadMapList
                roadmaps={roadmaps}
                selectedRoadMap={selectedRoadMap}
                onSelectRoadMap={setSelectedRoadMap}
                onDeleteRoadMap={handleDeleteRoadMap}
                onTogglePin={handleTogglePinRoadMap}
                searchQuery={searchQuery}
                notebooks={notebooks}
                roadmapCategories={roadmapCategories}
                onAddRoadmapCategory={handleAddRoadmapCategory}
                onUpdateRoadmapCategory={handleUpdateRoadmapCategory}
                selectedCategory={selectedRoadmapCategory}
                onCategoryChange={setSelectedRoadmapCategory}
              />
            ) : null}

            {/* Right Panel - Note Editor or Goals Desk */}
            {activeView === "notes" && selectedNote && notes.some(n => n.id === selectedNote.id) && (
              <NoteEditor
                note={selectedNote}
                onUpdateNote={handleUpdateNote}
                notebooks={notebooks}
                categories={categories}
                onAddCategory={handleAddCategory}
              />
            )}


            {activeView === "goals" && (
              <GoalsDesk
                goals={goals}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                onReorderGoals={handleReorderGoals}
              />
            )}

            {activeView === "roadmap" && selectedRoadMap && (
              <RoadMapEditor
                roadMap={selectedRoadMap}
                onUpdateRoadMap={handleUpdateRoadMap}
                onAddMilestone={handleAddMilestone}
                onUpdateMilestone={handleUpdateMilestone}
                onDeleteMilestone={handleDeleteMilestone}
                roadmapCategories={roadmapCategories}
                onAddRoadmapCategory={handleAddRoadmapCategory}
              />
            )}

            {activeView === "roadmap" && !selectedRoadMap && (
              <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-sm border-l border-gray-300">
                <div className="h-px bg-gray-300 w-full flex-shrink-0"></div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No roadmap selected</p>
                    <p className="text-sm text-gray-400 mb-4">
                      Select a roadmap from the list or create a new one
                    </p>
                    <button
                      onClick={handleCreateRoadMap}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
                    >
                      Create New Roadmap
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}