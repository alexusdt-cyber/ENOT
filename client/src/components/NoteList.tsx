import { Note, Notebook, Category } from "../App";
import { MoreVertical, Code, Calendar, Pin, Briefcase, Home, GraduationCap, FolderOpen, Folder, Star, Heart, Bookmark, Zap, Target, Coffee, Music, Camera, Book, Lightbulb, Award, FileText, Sparkles, Trash2, AlertTriangle, X } from "lucide-react";
import { useState, useId } from "react";
import { createPortal } from "react-dom";
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
};

interface NoteListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  searchQuery: string;
  notebooks?: Notebook[];
  categories?: Category[];
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  isDark?: boolean;
}

export function NoteList({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
  searchQuery,
  notebooks = [],
  categories = [],
  selectedCategory = "all",
  onCategoryChange,
  isDark = false,
}: NoteListProps) {
  const gradientId = useId();
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<Note | null>(null);

  const allCategories = [
    { id: "all", name: "Все", icon: "FolderOpen" },
    ...categories,
  ];

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.blocks.some((block) =>
        block.content.toLowerCase().includes(searchQuery.toLowerCase())
      );

    if (!matchesSearch) return false;

    if (selectedCategory === "all") return true;

    const notebook = notebooks.find((nb) => nb.name === note.notebook);
    return notebook?.categoryId === selectedCategory;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const noteDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - noteDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Сегодня";
    if (diffDays === 1) return "Вчера";
    if (diffDays < 7) return `${diffDays} дн. назад`;

    return noteDate.toLocaleDateString("ru-RU", {
      month: "short",
      day: "numeric",
    });
  };

  const getPreviewContent = (note: Note) => {
    const textBlocks = note.blocks.filter((b) => b.type === "text");
    if (textBlocks.length > 0) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = textBlocks[0].content;
      return tempDiv.textContent || tempDiv.innerText || "Пустая заметка";
    }
    return "Пустая заметка";
  };

  const hasCodeBlocks = (note: Note) => {
    return note.blocks.some((b) => b.type === "code");
  };

  const getBlocksCount = (note: Note) => {
    return note.blocks.length;
  };

  return (
    <div className={`w-full md:w-80 border-l border-t flex flex-col flex-shrink-0 relative overflow-hidden ${
      isDark 
        ? 'bg-slate-900/80 border-slate-700/50' 
        : 'bg-white/60 backdrop-blur-xl border-gray-200/50'
    }`}>
      {/* Aurora Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${gradientId}-notes-aurora`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDark ? "#6366f1" : "#818cf8"}>
                <animate attributeName="stop-color" values={isDark ? "#6366f1;#a855f7;#6366f1" : "#818cf8;#c084fc;#818cf8"} dur="10s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor={isDark ? "#06b6d4" : "#22d3ee"}>
                <animate attributeName="stop-color" values={isDark ? "#06b6d4;#8b5cf6;#06b6d4" : "#22d3ee;#a78bfa;#22d3ee"} dur="8s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <motion.ellipse 
            rx="60%" ry="50%"
            fill={`url(#${gradientId}-notes-aurora)`}
            initial={{ cx: "80%", cy: "0%", opacity: 0.3 }}
            animate={{ 
              cy: ["0%", "100%", "0%"],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* Header */}
      <div className={`relative z-10 p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-gray-200/50'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <FileText className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <motion.div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Заметки
            </h2>
          </div>
          <motion.div 
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              isDark 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {filteredNotes.length}
          </motion.div>
        </div>

        {/* Category Pills - Horizontal Scroll with Premium Styling */}
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <div className="flex gap-2 min-w-max">
            {allCategories.map((category, index) => {
              const IconComponent = iconMap[category.icon] || FolderOpen;
              const isSelected = selectedCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  onClick={() => onCategoryChange?.(category.id)}
                  data-testid={`category-filter-${category.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap overflow-hidden ${
                    isSelected
                      ? "text-white shadow-lg"
                      : isDark 
                        ? "bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50" 
                        : "bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200/50"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeCategoryPill"
                      className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <IconComponent className="w-3 h-3" />
                    {category.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto relative z-10 p-2">
        <AnimatePresence mode="popLayout">
          {sortedNotes.map((note, index) => {
            const isSelected = selectedNote?.id === note.id;
            const isHovered = hoveredNote === note.id;
            
            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ 
                  delay: index * 0.02,
                  type: "spring",
                  stiffness: 400,
                  damping: 25 
                }}
                onClick={() => onSelectNote(note)}
                onMouseEnter={() => setHoveredNote(note.id)}
                onMouseLeave={() => setHoveredNote(null)}
                className={`relative p-4 mb-2 rounded-2xl cursor-pointer transition-all group ${
                  isSelected
                    ? isDark 
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                      : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-lg shadow-indigo-200/50'
                    : isDark 
                      ? 'bg-slate-800/40 border border-slate-700/30 hover:bg-slate-800/60 hover:border-slate-600/50' 
                      : 'bg-white/40 border border-gray-200/50 hover:bg-white/70 hover:border-gray-300'
                }`}
                data-testid={`note-card-${note.id}`}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selectedNoteIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Hover Glow Effect */}
                <AnimatePresence>
                  {isHovered && !isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-0 rounded-2xl pointer-events-none ${
                        isDark ? 'bg-indigo-500/5' : 'bg-indigo-100/50'
                      }`}
                    />
                  )}
                </AnimatePresence>

                <div className="flex items-start justify-between gap-2 relative">
                  <div className="flex-1 min-w-0">
                    {/* Title Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {note.pinned && (
                          <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={`flex-shrink-0 p-1 rounded-md ${
                              isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                            }`}
                          >
                            <Pin className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'} fill-current`} />
                          </motion.div>
                        )}
                        <h3 className={`font-medium truncate ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {note.title || "Без названия"}
                        </h3>
                      </div>
                      
                      {/* Pin Toggle Button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(note.id);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                          isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'
                        } ${
                          note.pinned 
                            ? "opacity-100" 
                            : "opacity-40 group-hover:opacity-100"
                        }`}
                        title={note.pinned ? "Открепить" : "Закрепить"}
                        data-testid={`pin-note-${note.id}`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${
                          note.pinned 
                            ? isDark ? "text-amber-400 fill-amber-400" : "text-amber-600 fill-amber-600"
                            : isDark ? "text-slate-400" : "text-gray-500"
                        }`} />
                      </motion.button>
                    </div>

                    {/* Preview Content */}
                    <p className={`text-sm line-clamp-2 mb-3 ${
                      isDark ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      {getPreviewContent(note)}
                    </p>

                    {/* Metadata Row */}
                    <div className={`flex items-center gap-3 text-xs ${
                      isDark ? 'text-slate-500' : 'text-gray-500'
                    }`}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(note.updatedAt)}
                      </div>
                      
                      {hasCodeBlocks(note) && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                          isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
                        }`}>
                          <Code className="w-3 h-3" />
                          {note.blocks.filter((b) => b.type === "code").length}
                        </div>
                      )}
                      
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                        isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        {getBlocksCount(note)}
                      </div>
                    </div>
                  </div>

                  {/* More Menu */}
                  <div className="relative">
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === note.id ? null : note.id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`opacity-50 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                        isDark 
                          ? 'hover:bg-slate-700 text-slate-400' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      data-testid={`note-menu-${note.id}`}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </motion.button>

                    <AnimatePresence>
                      {showMenu === note.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`absolute right-0 top-8 rounded-xl shadow-2xl border py-2 z-20 min-w-[140px] overflow-hidden ${
                            isDark 
                              ? 'bg-slate-800 border-slate-700' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmNote(note);
                              setShowMenu(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                              isDark 
                                ? 'text-red-400 hover:bg-red-500/10' 
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            data-testid={`delete-note-${note.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            Удалить
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Notebook Badge */}
                {note.notebook && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-3"
                  >
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      isDark 
                        ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30' 
                        : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200'
                    }`}>
                      📓 {note.notebook}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
          >
            <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-slate-800/50' : 'bg-gray-100'
            }`}>
              <FileText className={`w-8 h-8 ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
            </div>
            <p className="font-medium mb-1">Заметок не найдено</p>
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Создайте свою первую заметку'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmNote && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center"
            onClick={() => setDeleteConfirmNote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm mx-4 rounded-2xl shadow-2xl border overflow-hidden ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDark ? 'bg-red-500/20' : 'bg-red-100'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                    </div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Удалить заметку?
                    </h3>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmNote(null)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-400'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  Вы уверены, что хотите удалить заметку "<span className="font-medium">{deleteConfirmNote.title || "Без названия"}</span>"? Это действие нельзя отменить.
                </p>
              </div>
              <div className={`p-4 flex gap-3 ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <motion.button
                  onClick={() => setDeleteConfirmNote(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                    isDark 
                      ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  data-testid="cancel-delete-note"
                >
                  Отмена
                </motion.button>
                <motion.button
                  onClick={() => {
                    onDeleteNote(deleteConfirmNote.id);
                    setDeleteConfirmNote(null);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  data-testid="confirm-delete-note"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
