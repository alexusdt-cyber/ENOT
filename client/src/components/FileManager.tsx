import { useState, useRef, useId } from "react";
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileCode,
  FileArchive,
  Music,
  Grid3x3,
  List,
  Upload,
  Search,
  Trash2,
  Edit2,
  HardDrive,
  FolderPlus,
  Link2,
  CheckCircle,
  AlertCircle,
  Cloud,
  Files,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/utils/clipboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/components/ui/use-mobile";

export interface FileItem {
  id: string;
  name: string;
  type: "file";
  size: number;
  folderId: string;
  fileType: "image" | "document" | "video" | "audio" | "code" | "archive" | "other";
  uploadedAt: Date;
  url?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  type: "folder";
  color: string;
  filesCount: number;
  size: number;
  createdAt: Date;
}

interface FileManagerProps {
  folders: FolderItem[];
  files: FileItem[];
  onCreateFolder: (name: string) => void;
  onUploadFiles: (files: File[], folderId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
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

const StorageRing = ({ 
  percentage, 
  size = 60, 
  strokeWidth = 5,
  isDark 
}: { 
  percentage: number; 
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
}) => {
  const uniqueId = useId();
  const gradientId = `storageGradient-${uniqueId}`;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {percentage > 80 ? (
              <>
                <stop offset="0%" stopColor="#F87171" />
                <stop offset="100%" stopColor="#EF4444" />
              </>
            ) : percentage > 50 ? (
              <>
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
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
          transition={{ duration: 1, ease: "easeOut" }}
          strokeDasharray={circumference}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.5))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Cloud className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
      </div>
    </div>
  );
};

export function FileManager({
  folders,
  files,
  onCreateFolder,
  onUploadFiles,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder: _onRenameFolder,
  isDark = false,
}: FileManagerProps) {
  const isMobile = useIsMobile();
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(
    folders[0] || null
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [filterType, setFilterType] = useState<string>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isRenameFileOpen, setIsRenameFileOpen] = useState(false);
  const [renameFileData, setRenameFileData] = useState<{ id: string; name: string } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteFileData, setDeleteFileData] = useState<{ id: string; name: string } | null>(null);
  const [copyingFileId, setCopyingFileId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ fileId: string; status: "success" | "error" } | null>(null);

  const totalStorage = 15 * 1024 * 1024 * 1024;
  const usedStorage = files.reduce((acc, file) => acc + file.size, 0);
  const storagePercentage = (usedStorage / totalStorage) * 100;
  const totalFiles = files.length;
  const totalFolders = folders.length;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return FileImage;
      case "video":
        return FileVideo;
      case "code":
        return FileCode;
      case "audio":
        return Music;
      case "archive":
        return FileArchive;
      case "document":
        return FileText;
      default:
        return File;
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case "image":
        return "from-pink-500 to-rose-500";
      case "video":
        return "from-purple-500 to-violet-500";
      case "code":
        return "from-emerald-500 to-green-500";
      case "audio":
        return "from-amber-500 to-orange-500";
      case "archive":
        return "from-slate-500 to-gray-500";
      case "document":
        return "from-blue-500 to-indigo-500";
      default:
        return "from-indigo-500 to-purple-500";
    }
  };

  const filteredFiles = files
    .filter((file) => {
      if (!selectedFolder) return false;
      if (file.folderId !== selectedFolder.id) return false;
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      if (filterType !== "all" && file.fileType !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date")
        return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sortBy === "size") return b.size - a.size;
      return 0;
    });

  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    if (dropZoneRef.current && !dropZoneRef.current.contains(relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!selectedFolder) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onUploadFiles(droppedFiles, selectedFolder.id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFolder || !e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    onUploadFiles(selectedFiles, selectedFolder.id);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreateFolderOpen(false);
    }
  };

  const handleRenameFile = () => {
    if (renameFileData && renameFileData.name.trim()) {
      onRenameFile(renameFileData.id, renameFileData.name.trim());
      setRenameFileData(null);
      setIsRenameFileOpen(false);
    }
  };

  const handleDeleteFile = () => {
    if (deleteFileData) {
      setDeletingFileId(deleteFileData.id);
      setTimeout(() => {
        onDeleteFile(deleteFileData.id);
        setDeleteFileData(null);
        setIsDeleteConfirmOpen(false);
        setDeletingFileId(null);
      }, 300);
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    setDeletingFolderId(folderId);
    setTimeout(() => {
      onDeleteFolder(folderId);
      setDeletingFolderId(null);
    }, 300);
  };

  const openRenameDialog = (file: FileItem) => {
    setRenameFileData({ id: file.id, name: file.name });
    setIsRenameFileOpen(true);
  };

  const openDeleteDialog = (file: FileItem) => {
    setDeleteFileData({ id: file.id, name: file.name });
    setIsDeleteConfirmOpen(true);
  };

  const handleCopyLink = async (fileId: string, _fileName: string) => {
    setCopyingFileId(fileId);
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(fileId)}/share-link`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Copy link error:", errorData);
        setCopyStatus({ fileId, status: "error" });
        toast.error("Ошибка создания ссылки");
        setTimeout(() => setCopyStatus(null), 3000);
        return;
      }
      
      const data = await response.json();
      const shareLink = `${window.location.origin}/file/${data.token}`;
      
      let copied = false;
      try {
        await navigator.clipboard.writeText(shareLink);
        copied = true;
      } catch (_clipboardError) {
        copied = copyToClipboard(shareLink);
      }
      
      if (copied) {
        setCopyStatus({ fileId, status: "success" });
        toast.success("Ссылка скопирована!");
        setTimeout(() => setCopyStatus(null), 3000);
      } else {
        setCopyStatus({ fileId, status: "error" });
        toast.error("Ошибка копирования");
        setTimeout(() => setCopyStatus(null), 3000);
      }
    } catch (error) {
      console.error("Copy link error:", error);
      setCopyStatus({ fileId, status: "error" });
      toast.error("Ошибка при копировании");
      setTimeout(() => setCopyStatus(null), 3000);
    } finally {
      setCopyingFileId(null);
    }
  };

  const filterOptions = [
    { value: "all", label: "Все", icon: Files },
    { value: "image", label: "Фото", icon: FileImage },
    { value: "video", label: "Видео", icon: FileVideo },
    { value: "document", label: "Документы", icon: FileText },
    { value: "audio", label: "Аудио", icon: Music },
    { value: "code", label: "Код", icon: FileCode },
    { value: "archive", label: "Архивы", icon: FileArchive },
  ];

  const sidebarContent = (
      <div className={`w-full md:w-80 flex flex-col flex-shrink-0 border-l border-t overflow-hidden ${isDark ? 'bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-slate-700/50' : 'bg-gradient-to-b from-white/90 to-gray-50/90 backdrop-blur-xl border-gray-200'}`}>
        <div className={`relative overflow-hidden border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-cyan-600/10' : 'bg-cyan-400/20'}`} />
            <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl ${isDark ? 'bg-indigo-600/10' : 'bg-indigo-400/20'}`} />
          </div>
          
          <div className="relative p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30`}>
                  <HardDrive className="w-5 h-5 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 ${isDark ? 'border-slate-900' : 'border-white'}`}
                />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Файловый менеджер
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Облачное хранилище
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <StorageRing percentage={storagePercentage} isDark={isDark} />
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatSize(usedStorage)}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    / {formatSize(totalStorage)}
                  </span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(storagePercentage, 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      storagePercentage > 80 
                        ? 'bg-gradient-to-r from-red-400 to-red-500' 
                        : storagePercentage > 50 
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500'
                    }`}
                    style={{
                      boxShadow: storagePercentage > 80 
                        ? '0 0 12px rgba(239, 68, 68, 0.5)' 
                        : '0 0 12px rgba(6, 182, 212, 0.5)'
                    }}
                  />
                </div>
                <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {storagePercentage.toFixed(1)}% использовано
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatBadge icon={Files} value={totalFiles} label="Файлов" gradient="from-cyan-500 to-blue-600" isDark={isDark} />
              <StatBadge icon={Folder} value={totalFolders} label="Папок" gradient="from-violet-500 to-purple-600" isDark={isDark} />
            </div>
          </div>
        </div>

        <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Папки</h3>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreateFolderOpen(true)}
            className={`p-2 rounded-xl transition-all ${
              isDark 
                ? 'bg-slate-700/50 hover:bg-slate-700 text-cyan-400' 
                : 'bg-white/60 hover:bg-white text-cyan-600 shadow-sm'
            }`}
            title="Создать папку"
            data-testid="button-create-folder"
          >
            <FolderPlus className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          <AnimatePresence mode="popLayout">
            {folders.map((folder, index) => {
              const isSelected = selectedFolder?.id === folder.id;
              const isDeleting = deletingFolderId === folder.id;
              return (
                <motion.div
                  key={folder.id}
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
                  onClick={() => setSelectedFolder(folder)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? isDark 
                        ? "bg-gradient-to-r from-slate-700/80 to-slate-800/80 ring-1 ring-cyan-500/30 shadow-lg" 
                        : "bg-white shadow-lg ring-1 ring-cyan-200"
                      : isDark 
                        ? "hover:bg-slate-700/50" 
                        : "hover:bg-white/60"
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className={`p-2 rounded-lg ${isSelected ? 'shadow-md' : ''}`}
                      style={{ 
                        backgroundColor: `${folder.color}20`,
                      }}
                    >
                      <Folder
                        className="w-5 h-5"
                        style={{ color: folder.color }}
                        fill={isSelected ? folder.color : "none"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate mb-0.5 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {folder.name}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {folder.filesCount} файлов · {formatSize(folder.size)}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить папку "${folder.name}" и все файлы?`)) {
                          handleDeleteFolder(folder.id);
                        }
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg ${
                        isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {folders.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}
            >
              <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Нет папок</p>
            </motion.div>
          )}
        </div>
      </div>
  );

  const fileContentArea = (
      <div className={`flex-1 flex flex-col overflow-hidden border-t border-l ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-slate-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 border-gray-200'}`}>
        {selectedFolder ? (
          <>
            <div className={`relative border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/70'}`}>
              <div className="absolute inset-0 overflow-hidden">
                <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl ${isDark ? 'bg-cyan-600/5' : 'bg-cyan-400/10'}`} />
              </div>

              <div className={`relative px-6 py-4 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'} backdrop-blur-xl`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-xl shadow-lg"
                      style={{ 
                        backgroundColor: `${selectedFolder.color}20`,
                        boxShadow: `0 4px 14px ${selectedFolder.color}30`
                      }}
                    >
                      <Folder className="w-6 h-6" style={{ color: selectedFolder.color }} fill={selectedFolder.color} />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedFolder.name}
                      </h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {filteredFiles.length} файлов · {formatSize(selectedFolder.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                        isDark 
                          ? 'bg-slate-800 border border-slate-700 text-white' 
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      <option value="name">По имени</option>
                      <option value="date">По дате</option>
                      <option value="size">По размеру</option>
                    </select>

                    <div className={`flex rounded-xl p-1 ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-lg transition-all ${
                          viewMode === "grid"
                            ? isDark ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "bg-cyan-50 text-cyan-600 shadow-sm"
                            : isDark ? "text-slate-400 hover:text-cyan-400" : "text-gray-500 hover:text-cyan-600"
                        }`}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-lg transition-all ${
                          viewMode === "list"
                            ? isDark ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "bg-cyan-50 text-cyan-600 shadow-sm"
                            : isDark ? "text-slate-400 hover:text-cyan-400" : "text-gray-500 hover:text-cyan-600"
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </motion.button>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 md:px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white font-semibold flex items-center gap-2 text-sm shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 transition-shadow"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden md:inline">Загрузить</span>
                    </motion.button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                    <input
                      type="text"
                      placeholder="Поиск файлов..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 backdrop-blur-sm focus:outline-none transition-all text-sm ${
                        isDark 
                          ? 'border-slate-700 bg-slate-800/50 text-white placeholder-slate-500 focus:border-cyan-500' 
                          : 'border-gray-200 bg-white focus:border-cyan-400'
                      }`}
                    />
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto">
                    {filterOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = filterType === option.value;
                      return (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFilterType(option.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                            isActive
                              ? isDark 
                                ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30' 
                                : 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200'
                              : isDark 
                                ? 'bg-slate-800 text-slate-400 hover:text-cyan-400' 
                                : 'bg-white text-gray-500 hover:text-cyan-600 border border-gray-200'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {option.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={dropZoneRef}
              className={`flex-1 overflow-y-auto p-4 transition-all relative ${
                isDragging ? "" : ""
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-4 z-10 rounded-3xl border-3 border-dashed flex items-center justify-center"
                    style={{
                      borderColor: isDark ? '#22D3EE' : '#06B6D4',
                      background: isDark 
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)' 
                        : 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)'
                    }}
                  >
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1, y: [0, -10, 0] }}
                      transition={{ y: { repeat: Infinity, duration: 1.5 } }}
                      className="text-center"
                    >
                      <div className={`p-6 rounded-3xl mb-4 inline-block ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
                        <Upload className={`w-16 h-16 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      </div>
                      <p className={`text-xl font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                        Перетащите файлы сюда
                      </p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        Отпустите для загрузки
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isDragging && filteredFiles.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className={`p-6 rounded-3xl inline-block mb-4 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                      <Files className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
                    </div>
                    <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                      Папка пуста
                    </p>
                    <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      Перетащите файлы или нажмите "Загрузить"
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/30"
                    >
                      <Upload className="w-4 h-4 inline mr-2" />
                      Загрузить файлы
                    </motion.button>
                  </div>
                </motion.div>
              ) : !isDragging && viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file.fileType);
                      const isDeleting = deletingFileId === file.id;
                      const isCopying = copyingFileId === file.id;
                      const copyState = copyStatus?.fileId === file.id ? copyStatus.status : null;
                      
                      return (
                        <motion.div
                          key={file.id}
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
                            ? "0 20px 40px -12px rgba(6, 182, 212, 0.15)" 
                            : "0 20px 40px -12px rgba(6, 182, 212, 0.2)" 
                          }}
                          className={`group relative rounded-2xl p-4 transition-all cursor-pointer overflow-hidden ${
                            isDark 
                              ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-cyan-500/40' 
                              : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-cyan-300/60 shadow-sm'
                          }`}
                        >
                          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${getFileTypeColor(file.fileType)}`} />

                          <div className="flex items-center justify-center mb-3 h-16">
                            {file.fileType === "image" && file.url ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="max-h-full max-w-full object-contain rounded-lg"
                              />
                            ) : (
                              <div className={`p-3 rounded-xl bg-gradient-to-br ${getFileTypeColor(file.fileType)} shadow-lg`}>
                                <FileIcon className="w-8 h-8 text-white" />
                              </div>
                            )}
                          </div>

                          <div className={`text-sm font-medium truncate mb-1 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {file.name}
                          </div>
                          <div className={`text-xs text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {formatSize(file.size)}
                          </div>

                          <div className="absolute top-3 right-3 flex gap-1 opacity-60 group-hover:opacity-100 transition-all z-10">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(file.id, file.name);
                              }}
                              disabled={isCopying}
                              className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                copyState === "success"
                                  ? "bg-emerald-500 text-white"
                                  : copyState === "error"
                                  ? "bg-red-500 text-white"
                                  : isDark 
                                    ? "bg-slate-700 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400" 
                                    : "bg-white hover:bg-cyan-50 text-gray-600 hover:text-cyan-600 border border-gray-200"
                              } ${isCopying ? "animate-pulse" : ""}`}
                              title="Копировать ссылку"
                              data-testid={`button-copy-link-${file.id}`}
                            >
                              {copyState === "success" ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : copyState === "error" ? (
                                <AlertCircle className="w-3.5 h-3.5" />
                              ) : (
                                <Link2 className="w-3.5 h-3.5" />
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openRenameDialog(file);
                              }}
                              className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                isDark 
                                  ? "bg-slate-700 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-400" 
                                  : "bg-white hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 border border-gray-200"
                              }`}
                              title="Переименовать"
                              data-testid={`button-rename-file-${file.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(file);
                              }}
                              className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                isDark 
                                  ? "bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400" 
                                  : "bg-white hover:bg-red-50 text-gray-600 hover:text-red-500 border border-gray-200"
                              }`}
                              title="Удалить"
                              data-testid={`button-delete-file-${file.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : !isDragging && (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file.fileType);
                      const isDeleting = deletingFileId === file.id;
                      const isCopying = copyingFileId === file.id;
                      const copyState = copyStatus?.fileId === file.id ? copyStatus.status : null;
                      
                      return (
                        <motion.div
                          key={file.id}
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
                          className={`group flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                            isDark 
                              ? 'bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-cyan-500/40' 
                              : 'bg-white/90 backdrop-blur-xl border border-gray-200/80 hover:border-cyan-300/60 shadow-sm'
                          }`}
                        >
                          <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${getFileTypeColor(file.fileType)}`} />
                          
                          {file.fileType === "image" && file.url ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded-xl"
                            />
                          ) : (
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getFileTypeColor(file.fileType)} shadow-md`}>
                              <FileIcon className="w-6 h-6 text-white" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate mb-0.5 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                              {file.name}
                            </div>
                            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>

                          <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(file.id, file.name);
                              }}
                              disabled={isCopying}
                              className={`p-2 rounded-xl transition-all ${
                                copyState === "success"
                                  ? "bg-emerald-500 text-white"
                                  : copyState === "error"
                                  ? "bg-red-500 text-white"
                                  : isDark 
                                    ? "bg-slate-700 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400" 
                                    : "bg-gray-50 hover:bg-cyan-50 text-gray-600 hover:text-cyan-600"
                              } ${isCopying ? "animate-pulse" : ""}`}
                              title="Копировать ссылку"
                              data-testid={`button-copy-link-list-${file.id}`}
                            >
                              {copyState === "success" ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : copyState === "error" ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : (
                                <Link2 className="w-4 h-4" />
                              )}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openRenameDialog(file);
                              }}
                              className={`p-2 rounded-xl transition-all ${
                                isDark 
                                  ? "bg-slate-700 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-400" 
                                  : "bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600"
                              }`}
                              title="Переименовать"
                              data-testid={`button-rename-file-list-${file.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(file);
                              }}
                              className={`p-2 rounded-xl transition-all ${
                                isDark 
                                  ? "bg-slate-700 hover:bg-red-500/20 text-slate-300 hover:text-red-400" 
                                  : "bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-500"
                              }`}
                              title="Удалить"
                              data-testid={`button-delete-file-list-${file.id}`}
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
                <FolderPlus className={`w-16 h-16 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} />
              </div>
              <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                Папка не выбрана
              </p>
              <p className={`text-sm mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Создайте папку для организации файлов
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsCreateFolderOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/30"
              >
                <FolderPlus className="w-4 h-4 inline mr-2" />
                Создать папку
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>
  );

  return (
    <>
      {isMobile ? (
        <AnimatePresence mode="wait">
          {selectedFolder ? (
            <motion.div key="files-mobile" initial={{x:"100%"}} animate={{x:0}} exit={{x:"100%"}} transition={{type:"tween",duration:0.25}} className="flex-1 flex flex-col overflow-hidden">
              <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'}`}>
                <button onClick={() => setSelectedFolder(null)} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700/60' : 'text-gray-600 hover:bg-gray-100'}`} data-testid="button-mobile-back-to-folders">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">Назад</span>
                </button>
              </div>
              {fileContentArea}
            </motion.div>
          ) : (
            <motion.div key="folders-mobile" initial={{opacity:0}} animate={{opacity:1}} exit={{x:"-30%",opacity:0}} transition={{type:"tween",duration:0.2}} className="flex-1 flex flex-col overflow-hidden">
              {sidebarContent}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <>
          {sidebarContent}
          {fileContentArea}
        </>
      )}

      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className={`sm:max-w-md rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <FolderPlus className="w-5 h-5 text-white" />
              </div>
              Создать папку
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки..."
              className={`w-full rounded-xl border-2 ${isDark ? 'bg-slate-800 border-slate-700 focus:border-cyan-500' : 'focus:border-cyan-400'}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
              data-testid="input-folder-name"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateFolderOpen(false);
                setNewFolderName("");
              }}
              className={`rounded-xl ${isDark ? 'border-slate-700 text-slate-300' : ''}`}
              data-testid="button-cancel-create-folder"
            >
              Отмена
            </Button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-confirm-create-folder"
            >
              Создать
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameFileOpen} onOpenChange={setIsRenameFileOpen}>
        <DialogContent className={`sm:max-w-md rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <Edit2 className="w-5 h-5 text-white" />
              </div>
              Переименовать
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameFileData?.name || ""}
              onChange={(e) =>
                setRenameFileData((prev) =>
                  prev ? { ...prev, name: e.target.value } : null
                )
              }
              placeholder="Новое имя файла..."
              className={`w-full rounded-xl border-2 ${isDark ? 'bg-slate-800 border-slate-700 focus:border-indigo-500' : 'focus:border-indigo-400'}`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameFile();
              }}
              data-testid="input-rename-file"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameFileOpen(false);
                setRenameFileData(null);
              }}
              className={`rounded-xl ${isDark ? 'border-slate-700 text-slate-300' : ''}`}
              data-testid="button-cancel-rename"
            >
              Отмена
            </Button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRenameFile}
              disabled={!renameFileData || !renameFileData.name.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-confirm-rename"
            >
              Сохранить
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className={`sm:max-w-md rounded-3xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-500">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-rose-600">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              Удалить файл
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>
              Вы уверены, что хотите удалить{" "}
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                "{deleteFileData?.name}"
              </span>
              ? Это действие нельзя отменить.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteFileData(null);
              }}
              className={`rounded-xl ${isDark ? 'border-slate-700 text-slate-300' : ''}`}
              data-testid="button-cancel-delete"
            >
              Отмена
            </Button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteFile}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold shadow-lg shadow-red-500/30"
              data-testid="button-confirm-delete"
            >
              Удалить
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
