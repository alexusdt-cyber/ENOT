import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Eye,
  AlertCircle,
  Loader2,
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckSquare,
  Key,
  Palette,
  Type,
  Highlighter,
  Table,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  Printer,
  Lock,
  FileText,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BlockEditor } from "../components/BlockEditor";
import { applyFormat, insertLink, hidePassword, applyTextColor, applyFontSize, applyBackgroundColor } from "../components/RichTextEditor";

interface Block {
  id: string;
  type: "text" | "code" | "tasklist" | "image" | "table";
  content: string;
  metadata?: any;
}

interface SharedNote {
  id: string;
  title: string;
  content: string;
  contentType: string;
  userId: string;
  categoryId: string | null;
  blocks: Block[];
}

interface SharedNoteViewProps {
  shareLink: string;
}

function ReadOnlyGallery({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 1) {
    return <img src={images[0]} alt="Gallery" className="w-full h-auto rounded-lg" />;
  }

  return (
    <div className="relative group">
      <div className="relative rounded-lg overflow-hidden">
        <img src={images[currentIndex]} alt={`Image ${currentIndex + 1}`} className="w-full h-auto" />
        
        <motion.button
          onClick={prevImage}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <motion.button
          onClick={nextImage}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 text-white text-xs rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex ? "bg-indigo-600 w-6" : "bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function SharedNoteView({ shareLink }: SharedNoteViewProps) {
  const [note, setNote] = useState<SharedNote | null>(null);
  const [shareType, setShareType] = useState<"password" | "view_only" | "can_edit">("view_only");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showAlignmentMenu, setShowAlignmentMenu] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const alignmentButtonRef = useRef<HTMLButtonElement>(null);
  const [alignmentMenuPosition, setAlignmentMenuPosition] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchShareInfo();
  }, [shareLink]);

  const fetchShareInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shared/${shareLink}`);
      if (!response.ok) {
        throw new Error("Share not found");
      }

      const data = await response.json();
      setShareType(data.shareType);
      setRequiresPassword(data.requiresPassword);

      if (!data.requiresPassword) {
        setNote(data.note);
        setTitle(data.note.title);
        setBlocks(data.note.blocks || []);
        setPassword("");
      } else {
        setNote(null);
      }
    } catch (err) {
      setError("Не удалось загрузить заметку");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsVerifying(true);
      const response = await fetch(`/api/shared/${shareLink}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError("Неверный пароль");
        return;
      }

      const data = await response.json();
      setNote(data.note);
      setTitle(data.note.title);
      setBlocks(data.note.blocks || []);
      setShareType(data.shareType);
      setError("");
    } catch (err) {
      setError("Ошибка проверки пароля");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const autoSave = async (updatedTitle?: string, updatedBlocks?: Block[]) => {
    if (shareType !== "can_edit" || !note) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/shared/${shareLink}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedTitle ?? title,
          blocks: updatedBlocks ?? blocks,
        }),
      });

      if (!response.ok) {
        console.error("Failed to save note");
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockUpdate = (blockId: string, content: string, metadata?: any) => {
    const updatedBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, content, metadata } : block
    );
    setBlocks(updatedBlocks);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(title, updatedBlocks);
    }, 1000);
  };

  const handleAddBlock = (afterBlockId: string, type: "text" | "code" | "tasklist" | "image" | "table") => {
    const newBlock: Block = {
      id: "b" + Date.now(),
      type,
      content: "",
      metadata:
        type === "code"
          ? { language: "javascript" }
          : type === "tasklist"
          ? { tasks: [{ id: "t" + Date.now(), text: "", completed: false }] }
          : type === "image"
          ? { width: 400, height: 300 }
          : type === "table"
          ? { tableData: { rows: 3, cols: 3, cells: {} } }
          : undefined,
    };

    const index = blocks.findIndex((b) => b.id === afterBlockId);
    const updatedBlocks = [
      ...blocks.slice(0, index + 1),
      newBlock,
      ...blocks.slice(index + 1),
    ];

    setBlocks(updatedBlocks);
    setFocusedBlockId(newBlock.id);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(title, updatedBlocks);
    }, 1000);
  };

  const handleDeleteBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex((block) => block.id === blockId);
    const updatedBlocks = blocks.filter((block) => block.id !== blockId);

    if (updatedBlocks.length === 0) {
      const newBlock: Block = {
        id: "b" + Date.now(),
        type: "text",
        content: "",
      };
      updatedBlocks.push(newBlock);
      setFocusedBlockId(newBlock.id);
    } else {
      if (blockIndex > 0) {
        setFocusedBlockId(updatedBlocks[blockIndex - 1].id);
      } else {
        setFocusedBlockId(updatedBlocks[0].id);
      }
    }

    setBlocks(updatedBlocks);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(title, updatedBlocks);
    }, 1000);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      autoSave(newTitle, blocks);
    }, 1000);
  };

  const parseHtmlTable = (html: string): { rows: number; cols: number; cells: { [key: string]: string }; alignment: { [key: string]: "left" | "center" | "right" } } | null => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const table = temp.querySelector('table');
    if (!table) return null;

    const tableRows = table.querySelectorAll('tr');
    if (tableRows.length === 0) return null;

    const cells: { [key: string]: string } = {};
    const alignment: { [key: string]: "left" | "center" | "right" } = {};
    let maxCols = 0;

    tableRows.forEach((tr, rowIndex) => {
      const tableCells = tr.querySelectorAll('td, th');
      if (tableCells.length > maxCols) {
        maxCols = tableCells.length;
      }

      tableCells.forEach((cell, colIndex) => {
        const key = `${rowIndex}-${colIndex}`;
        cells[key] = cell.textContent?.trim() || '';

        const style = (cell as HTMLElement).style;
        const textAlign = style.textAlign || (cell as HTMLElement).getAttribute('align');
        if (textAlign === 'center') {
          alignment[key] = 'center';
        } else if (textAlign === 'right') {
          alignment[key] = 'right';
        }
      });
    });

    return {
      rows: tableRows.length,
      cols: maxCols,
      cells,
      alignment
    };
  };

  const handlePasteImage = async (blockId: string, event: ClipboardEvent) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html');
    if (html) {
      const tableData = parseHtmlTable(html);
      if (tableData) {
        event.preventDefault();
        
        const tableBlock: Block = {
          id: "b" + Date.now(),
          type: "table",
          content: "",
          metadata: {
            tableData: {
              rows: tableData.rows,
              cols: tableData.cols,
              cells: tableData.cells,
              alignment: tableData.alignment
            }
          }
        };

        const index = blocks.findIndex((b) => b.id === blockId);
        const updatedBlocks = [
          ...blocks.slice(0, index + 1),
          tableBlock,
          ...blocks.slice(index + 1),
        ];

        setBlocks(updatedBlocks);
        setFocusedBlockId(tableBlock.id);

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          autoSave(title, updatedBlocks);
        }, 1000);
        return;
      }
    }

    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          try {
            const formData = new FormData();
            formData.append("image", blob);
            const response = await fetch(`/api/shared/${shareLink}/upload/image`, {
              method: "POST",
              body: formData,
            });
            if (!response.ok) throw new Error("Upload failed");
            const data = await response.json();

            const imageBlock: Block = {
              id: "b" + Date.now(),
              type: "image",
              content: data.url,
              metadata: { width: 500, height: 300 },
            };

            const index = blocks.findIndex((b) => b.id === blockId);
            const updatedBlocks = [
              ...blocks.slice(0, index + 1),
              imageBlock,
              ...blocks.slice(index + 1),
            ];

            setBlocks(updatedBlocks);

            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
              autoSave(title, updatedBlocks);
            }, 1000);
          } catch (error) {
            console.error("Image paste upload error:", error);
          }
        }
      }
    }
  };

  const handleFormatClick = (format: string) => {
    if (format === "link") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        setSavedSelection(selection.getRangeAt(0).cloneRange());
      }
      setShowLinkDialog(true);
    } else if (format === "color") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        setSavedSelection(selection.getRangeAt(0).cloneRange());
      }
      setShowColorPicker(true);
    } else if (format === "background") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        setSavedSelection(selection.getRangeAt(0).cloneRange());
      }
      setShowBackgroundPicker(true);
    } else {
      applyFormat(format);
    }
  };

  const handleInsertLink = () => {
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
      insertLink(linkUrl);
      setShowLinkDialog(false);
      setLinkUrl("");
      setSavedSelection(null);
    }
  };

  const handleColorSelect = (color: string) => {
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
      applyTextColor(color);
      setShowColorPicker(false);
      setSavedSelection(null);
    }
  };

  const handleBackgroundSelect = (color: string) => {
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
      applyBackgroundColor(color);
      setShowBackgroundPicker(false);
      setSavedSelection(null);
    }
  };

  const handleFontSizeSelect = (size: string) => {
    if (savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
      
      applyFontSize(size);
      setShowFontSizeMenu(false);
      setSavedSelection(null);
    }
  };

  const handleInsertAtCursor = (type: "code" | "tasklist" | "image" | "table") => {
    if (blocks.length === 0) {
      const newBlock: Block = {
        id: "b" + Date.now(),
        type,
        content: "",
        metadata:
          type === "code"
            ? { language: "javascript" }
            : type === "tasklist"
            ? { tasks: [{ id: "t" + Date.now(), text: "", completed: false }] }
            : type === "image"
            ? { width: 400, height: 300 }
            : type === "table"
            ? { tableData: { rows: 3, cols: 3, cells: {} } }
            : undefined,
      };
      setBlocks([newBlock]);
      setFocusedBlockId(newBlock.id);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        autoSave(title, [newBlock]);
      }, 1000);
    } else {
      const blockId = focusedBlockId || blocks[blocks.length - 1].id;
      handleAddBlock(blockId, type);
    }
  };

  const applyTextAlignment = (alignment: 'left' | 'center' | 'right') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement!;
    }
    
    const block = (container as HTMLElement).closest('[data-block-id], li, p, div[contenteditable="true"]');
    if (block) {
      (block as HTMLElement).style.textAlign = alignment;
    }
    
    setShowAlignmentMenu(false);
  };

  // Premium toolbar button groups (matching NoteEditor)
  const toolbarGroups = [
    {
      id: 'format',
      buttons: [
        { icon: Bold, label: "Жирный", format: "bold" },
        { icon: Italic, label: "Курсив", format: "italic" },
        { icon: Underline, label: "Подчеркивание", format: "underline" },
      ]
    },
    {
      id: 'links',
      buttons: [
        { icon: LinkIcon, label: "Ссылка", format: "link" },
        { icon: Key, label: "Скрыть пароль", action: () => hidePassword() },
      ]
    },
    {
      id: 'colors',
      buttons: [
        { icon: Palette, label: "Цвет текста", format: "color" },
        { icon: Highlighter, label: "Цвет фона", format: "background" },
        { icon: Type, label: "Размер шрифта", action: () => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            setSavedSelection(selection.getRangeAt(0).cloneRange());
          }
          setShowFontSizeMenu(true);
        }},
      ]
    },
    {
      id: 'lists',
      buttons: [
        { icon: List, label: "Маркированный список", format: "insertUnorderedList" },
        { icon: ListOrdered, label: "Нумерованный список", format: "insertOrderedList" },
        { icon: AlignLeft, label: "Выравнивание", isAlignmentButton: true, action: () => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            setSavedSelection(selection.getRangeAt(0).cloneRange());
          }
          if (alignmentButtonRef.current) {
            const rect = alignmentButtonRef.current.getBoundingClientRect();
            setAlignmentMenuPosition({ top: rect.bottom + 4, left: rect.left });
          }
          setShowAlignmentMenu(!showAlignmentMenu);
        }},
      ]
    },
    {
      id: 'blocks',
      buttons: [
        { icon: Code, label: "Код", action: () => handleInsertAtCursor("code") },
        { icon: CheckSquare, label: "Список задач", action: () => handleInsertAtCursor("tasklist") },
        { icon: ImageIcon, label: "Изображение", action: () => handleInsertAtCursor("image") },
        { icon: Table, label: "Таблица", action: () => handleInsertAtCursor("table") },
      ]
    },
  ];

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
          </motion.div>
          <p className="text-gray-600 font-medium">Загрузка заметки...</p>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (error && !note) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-700 font-medium">{error}</p>
        </motion.div>
      </div>
    );
  }

  // Password Prompt
  if (requiresPassword && !note) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 max-w-md w-full mx-4"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
              className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Защищенная заметка</h2>
            <p className="text-center text-gray-500 mb-6">Введите пароль для доступа</p>
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleVerifyPassword}>
            <motion.input
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 mb-4 bg-white/50 backdrop-blur-sm"
              disabled={isVerifying}
              autoFocus
            />
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isVerifying || !password}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-indigo-500/25 transition-all"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Проверка...
                </span>
              ) : (
                "Открыть заметку"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500">Заметка не найдена</p>
        </motion.div>
      </div>
    );
  }

  const isReadOnly = shareType === "view_only";
  const isEditable = shareType === "can_edit";

  const handlePrint = () => {
    window.print();
  };

  // Read-Only View
  if (isReadOnly) {
    return (
      <>
        <style>{`
          @media print {
            @page { margin: 20mm; margin-top: 10mm; margin-bottom: 10mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html { margin: 0 !important; padding: 0 !important; }
          }
          @page { size: A4; margin: 15mm; }
        `}</style>
        <div className="min-h-screen bg-white print:bg-white">
          {/* Header */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-10 border-b border-gray-200/50 bg-white/70 backdrop-blur-xl print:border-0 print:bg-white"
          >
            <div className="max-w-4xl mx-auto px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-500 print:hidden">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 rounded-lg">
                      <Eye className="w-4 h-4 text-indigo-500" />
                      <span className="text-indigo-600 font-medium">Только просмотр</span>
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={handlePrint}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors print:hidden"
                  title="Печать"
                >
                  <Printer className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div 
            ref={contentRef} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 max-w-4xl mx-auto px-6 py-8"
          >
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <motion.div 
                  key={block.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {block.type === "text" && (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: block.content }} />
                  )}

                  {block.type === "code" && (
                    <div className="rounded-xl overflow-hidden bg-slate-900 shadow-lg">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                        <span className="text-xs text-slate-400 font-medium">
                          {block.metadata?.language || "javascript"}
                        </span>
                      </div>
                      <pre className="p-4 overflow-auto text-sm">
                        <code className="text-slate-300">{block.content}</code>
                      </pre>
                    </div>
                  )}

                  {block.type === "image" && (
                    <div 
                      className={`${
                        block.metadata?.alignment === "center" ? "mx-auto" :
                        block.metadata?.alignment === "right" ? "ml-auto" : ""
                      }`}
                      style={{ width: `${block.metadata?.width || 400}px`, maxWidth: "100%" }}
                    >
                      {block.metadata?.images && block.metadata.images.length > 0 ? (
                        <ReadOnlyGallery images={block.metadata.images} />
                      ) : block.content ? (
                        <img src={block.content} alt="Note content" className="w-full h-auto rounded-xl shadow-lg" />
                      ) : null}
                    </div>
                  )}

                  {block.type === "tasklist" && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 p-5 shadow-sm">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-indigo-500" />
                        {block.metadata?.taskListTitle || "Список задач"}
                      </h4>
                      <div className="space-y-2">
                        {block.metadata?.tasks?.map((task: any) => (
                          <div key={task.id} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                              task.completed ? "bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-500" : "border-gray-300"
                            }`}>
                              {task.completed && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-sm ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                              {task.text || "Пустая задача"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {block.type === "table" && block.metadata?.tableData && (
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                      <table className="w-full border-collapse bg-white" style={{ width: `${block.metadata.tableData.tableWidth || 100}%` }}>
                        <tbody>
                          {Array.from({ length: block.metadata.tableData.rows || 3 }).map((_, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-gray-200 last:border-b-0">
                              {Array.from({ length: block.metadata.tableData.cols || 3 }).map((_, colIndex) => {
                                const cellKey = `${rowIndex}-${colIndex}`;
                                const cellContent = block.metadata.tableData.cells?.[cellKey] || "";
                                const cellAlignment = block.metadata.tableData.alignment?.[cellKey] || "left";
                                return (
                                  <td 
                                    key={colIndex}
                                    className="border-r border-gray-200 last:border-r-0 px-4 py-3 text-sm"
                                    style={{ textAlign: cellAlignment }}
                                  >
                                    {cellContent}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Editable View with Premium Toolbar
  if (isEditable) {
    return (
      <div className="min-h-screen bg-white">
        {/* Premium Floating Toolbar */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-50 mx-4 pt-4"
        >
          <div className="bg-white/80 backdrop-blur-2xl rounded-2xl border border-white/50 shadow-xl shadow-indigo-500/10 px-4 py-2.5 flex items-center justify-between">
            {/* Tool Groups */}
            <div className="flex items-center gap-1">
              {toolbarGroups.map((group, groupIndex) => (
                <div key={group.id} className="flex items-center">
                  {groupIndex > 0 && (
                    <div className="w-px h-6 mx-2 bg-gray-200" />
                  )}
                  <div className="flex items-center gap-0.5">
                    {group.buttons.map((button: any) => {
                      const Icon = button.icon;
                      return (
                        <motion.button
                          key={button.label}
                          ref={button.isAlignmentButton ? alignmentButtonRef : undefined}
                          onClick={button.action || (() => handleFormatClick(button.format!))}
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative p-2 rounded-lg hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 transition-all group"
                          title={button.label}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {button.label}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium">Редактирование</span>
              </div>
              <AnimatePresence>
                {isSaving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1.5 text-indigo-500"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Сохранение...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Link Dialog */}
        <AnimatePresence>
          {showLinkDialog && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-[99998] backdrop-blur-sm"
                onClick={() => setShowLinkDialog(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-[99999] w-96"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Вставить ссылку</h3>
                  <button onClick={() => setShowLinkDialog(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLinkDialog(false)}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleInsertLink}
                    className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all"
                  >
                    Вставить
                  </button>
                </div>
              </motion.div>
            </>,
            document.body
          )}
        </AnimatePresence>

        {/* Color Picker */}
        <AnimatePresence>
          {showColorPicker && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99998] backdrop-blur-sm bg-black/20"
                onClick={() => setShowColorPicker(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-[99999]"
              >
                <h3 className="font-medium text-gray-900 mb-4">Цвет текста</h3>
                <div className="grid grid-cols-8 gap-2">
                  {["#000000", "#DC2626", "#16A34A", "#2563EB", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
                    "#64748B", "#EF4444", "#22C55E", "#3B82F6", "#FBBF24", "#A855F7", "#F472B6", "#14B8A6"
                  ].map((color) => (
                    <motion.button
                      key={color}
                      onClick={() => handleColorSelect(color)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-8 h-8 rounded-full shadow-md border-2 border-white/50"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.div>
            </>,
            document.body
          )}
        </AnimatePresence>

        {/* Background Color Picker */}
        <AnimatePresence>
          {showBackgroundPicker && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99998] backdrop-blur-sm bg-black/20"
                onClick={() => setShowBackgroundPicker(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-[99999]"
              >
                <h3 className="font-medium text-gray-900 mb-4">Цвет выделения</h3>
                <div className="grid grid-cols-8 gap-2">
                  {["#FEF3C7", "#DBEAFE", "#D1FAE5", "#FCE7F3", "#E9D5FF", "#CCFBF1", "#FED7AA", "#E2E8F0",
                    "#FCD34D", "#93C5FD", "#6EE7B7", "#F9A8D4", "#C4B5FD", "#5EEAD4", "#FDBA74", "#CBD5E1"
                  ].map((color) => (
                    <motion.button
                      key={color}
                      onClick={() => handleBackgroundSelect(color)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-8 h-8 rounded-full shadow-md border-2 border-white/50"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </motion.div>
            </>,
            document.body
          )}
        </AnimatePresence>

        {/* Font Size Menu */}
        <AnimatePresence>
          {showFontSizeMenu && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99998] backdrop-blur-sm bg-black/20"
                onClick={() => setShowFontSizeMenu(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-4 z-[99999] min-w-[200px]"
              >
                <h3 className="font-medium text-gray-900 mb-3">Размер шрифта</h3>
                {[
                  { size: "12px", label: "12px — Мелкий" },
                  { size: "14px", label: "14px — Обычный" },
                  { size: "16px", label: "16px" },
                  { size: "18px", label: "18px — Крупный" },
                  { size: "24px", label: "24px — Очень крупный" },
                  { size: "32px", label: "32px — Огромный" },
                ].map((f) => (
                  <motion.button
                    key={f.size}
                    onClick={() => handleFontSizeSelect(f.size)}
                    whileHover={{ x: 2 }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-lg"
                    style={{ fontSize: f.size }}
                  >
                    {f.label}
                  </motion.button>
                ))}
              </motion.div>
            </>,
            document.body
          )}
        </AnimatePresence>

        {/* Alignment Menu */}
        <AnimatePresence>
          {showAlignmentMenu && createPortal(
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99998]"
                onClick={() => setShowAlignmentMenu(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed bg-white rounded-xl shadow-2xl py-2 z-[99999] min-w-[140px]"
                style={{ top: alignmentMenuPosition.top, left: alignmentMenuPosition.left }}
              >
                {[
                  { align: 'left', icon: AlignLeft, label: 'По левому краю' },
                  { align: 'center', icon: AlignCenter, label: 'По центру' },
                  { align: 'right', icon: AlignRight, label: 'По правому краю' },
                ].map(({ align, icon: Icon, label }) => (
                  <motion.button
                    key={align}
                    onClick={() => applyTextAlignment(align as 'left' | 'center' | 'right')}
                    whileHover={{ x: 2 }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </motion.button>
                ))}
              </motion.div>
            </>,
            document.body
          )}
        </AnimatePresence>

        {/* Title */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative z-10 px-6 py-6 max-w-4xl mx-auto"
        >
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
              autoFocus
              className="text-3xl font-bold w-full outline-none border-b-2 border-indigo-500 pb-1 bg-transparent"
            />
          ) : (
            <motion.h1
              onClick={() => setIsEditingTitle(true)}
              whileHover={{ scale: 1.001 }}
              className="text-3xl font-bold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors"
            >
              {title || "Без названия"}
            </motion.h1>
          )}
        </motion.div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-8">
          <div className="max-w-4xl mx-auto space-y-4">
            {blocks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-400 py-8"
              >
                Начните печатать или добавьте блок...
              </motion.div>
            ) : (
              blocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <BlockEditor
                    block={block}
                    isFocused={focusedBlockId === block.id}
                    onFocus={() => setFocusedBlockId(block.id)}
                    onUpdate={handleBlockUpdate}
                    onAddBlock={handleAddBlock}
                    onDelete={handleDeleteBlock}
                    onPaste={(event) => handlePasteImage(block.id, event as any)}
                    imageUploadUrl={`/api/shared/${shareLink}/upload/image`}
                    imagesUploadUrl={`/api/shared/${shareLink}/upload/images`}
                  />
                </motion.div>
              ))
            )}
            {blocks.length > 0 && (
              <motion.button
                onClick={() => handleAddBlock(blocks[blocks.length - 1].id, "text")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Добавить блок
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
