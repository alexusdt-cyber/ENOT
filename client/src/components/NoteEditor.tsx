import { useState, useEffect, useRef, useId, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Note, Notebook, Block, Category } from "../App";
import {
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckSquare,
  Share2,
  MoreVertical,
  ExternalLink,
  Copy,
  FolderInput,
  Star,
  FileText,
  Trash2,
  X,
  Key,
  Eye,
  Palette,
  Type,
  Lock,
  Check,
  Highlighter,
  Table,
  ChevronDown,
  Plus,
  FolderOpen,
  Folder,
  Briefcase,
  Home,
  GraduationCap,
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
  MousePointerSquareDashed,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BlockEditor } from "./BlockEditor";
import { applyFormat, insertLink, hidePassword, applyTextColor, applyFontSize, applyBackgroundColor } from "./RichTextEditor";

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

const availableIcons = [
  { name: "Briefcase", icon: Briefcase },
  { name: "Home", icon: Home },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Star", icon: Star },
  { name: "Heart", icon: Heart },
  { name: "Bookmark", icon: Bookmark },
  { name: "Zap", icon: Zap },
  { name: "Target", icon: Target },
  { name: "Coffee", icon: Coffee },
  { name: "Music", icon: Music },
  { name: "Camera", icon: Camera },
  { name: "Book", icon: Book },
  { name: "Lightbulb", icon: Lightbulb },
  { name: "Award", icon: Award },
  { name: "FolderOpen", icon: FolderOpen },
  { name: "Folder", icon: Folder },
];

interface NoteEditorProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  notebooks?: Notebook[];
  categories?: Category[];
  onAddCategory?: (category: Category) => void;
  selectedCategory?: string;
  onCategoryChange?: (categoryId: string) => void;
  isDark?: boolean;
}

export function NoteEditor({ note, onUpdateNote, categories = [], onAddCategory, selectedCategory = "all", onCategoryChange, isDark = false }: NoteEditorProps) {
  const gradientId = useId();
  const [title, setTitle] = useState(note.title);
  const [blocks, setBlocks] = useState<Block[]>(note.blocks);
  
  // Track dirty state - snapshot of last saved state for comparison
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedSnapshotRef = useRef<{ noteId: string; title: string; blocks: string }>({
    noteId: note.id,
    title: note.title,
    blocks: JSON.stringify(note.blocks),
  });
  const currentNoteIdRef = useRef<string>(note.id);
  // Track current dirty state in refs for access during note switch
  const currentTitleRef = useRef<string>(note.title);
  const currentBlocksRef = useRef<Block[]>(note.blocks);
  // Store full previous note object for flushing unsaved changes with all fields
  const prevNoteRef = useRef<Note>(note);
  
  // Deep comparison function for blocks
  const hasChanges = useCallback((noteId: string, newTitle: string, newBlocks: Block[]): boolean => {
    const snapshot = lastSavedSnapshotRef.current;
    if (snapshot.noteId !== noteId) return false; // Don't save if noteId mismatch
    if (snapshot.title !== newTitle) return true;
    const blocksString = JSON.stringify(newBlocks);
    if (snapshot.blocks !== blocksString) return true;
    return false;
  }, []);
  
  // Save function with change detection
  const saveIfChanged = useCallback((updatedNote: Note) => {
    // Validate we're saving the correct note
    if (updatedNote.id !== currentNoteIdRef.current) {
      return; // Discard stale saves
    }
    
    if (hasChanges(updatedNote.id, updatedNote.title, updatedNote.blocks)) {
      onUpdateNote(updatedNote);
      // Update snapshot after successful save
      lastSavedSnapshotRef.current = {
        noteId: updatedNote.id,
        title: updatedNote.title,
        blocks: JSON.stringify(updatedNote.blocks),
      };
    }
  }, [hasChanges, onUpdateNote]);
  
  // Debounced save function with change detection
  const debouncedSave = useCallback((updatedNote: Note) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveIfChanged(updatedNote);
    }, 1000); // Save after 1 second of inactivity
  }, [saveIfChanged]);
  
  // Keep refs in sync with state
  useEffect(() => {
    currentTitleRef.current = title;
  }, [title]);
  
  useEffect(() => {
    currentBlocksRef.current = blocks;
  }, [blocks]);
  
  // Keep prevNoteRef in sync with note prop (but only for same noteId)
  useEffect(() => {
    if (prevNoteRef.current.id === note.id) {
      prevNoteRef.current = note;
    }
  }, [note]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showAlignmentMenu, setShowAlignmentMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareAccessLevel, setShareAccessLevel] = useState<'password' | 'view' | 'edit'>('view');
  const [sharePassword, setSharePassword] = useState('');
  const [passwordPermission, setPasswordPermission] = useState<'view' | 'edit'>('view');
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [showNotebookDropdown, setShowNotebookDropdown] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Briefcase");
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const notebookButtonRef = useRef<HTMLButtonElement>(null);
  const alignmentButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [alignmentMenuPosition, setAlignmentMenuPosition] = useState({ top: 0, left: 0 });

  const prevNoteIdRef = useRef<string>(note.id);
  
  useEffect(() => {
    const noteIdChanged = prevNoteIdRef.current !== note.id;
    
    if (noteIdChanged) {
      const prevNoteId = prevNoteIdRef.current;
      const prevSnapshot = lastSavedSnapshotRef.current;
      
      // Cancel any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Flush dirty state for the previous note BEFORE switching
      if (prevSnapshot.noteId === prevNoteId && prevNoteRef.current.id === prevNoteId) {
        const currentTitle = currentTitleRef.current;
        const currentBlocks = currentBlocksRef.current;
        const blocksString = JSON.stringify(currentBlocks);
        
        // Check if there are unsaved changes for the previous note
        if (prevSnapshot.title !== currentTitle || prevSnapshot.blocks !== blocksString) {
          // Save the previous note with its dirty state, preserving all original fields
          onUpdateNote({
            ...prevNoteRef.current,
            title: currentTitle,
            blocks: currentBlocks,
            updatedAt: new Date(),
          });
        }
      }
      
      // Update refs to new note before setting state
      currentNoteIdRef.current = note.id;
      prevNoteIdRef.current = note.id;
      
      // Reset snapshot to new note's state
      lastSavedSnapshotRef.current = {
        noteId: note.id,
        title: note.title,
        blocks: JSON.stringify(note.blocks),
      };
      
      // Update prevNoteRef for the new note
      prevNoteRef.current = note;
      
      // Update local state
      setTitle(note.title);
      setBlocks(note.blocks);
      setIsEditingTitle(false);
      setSelectedBlockIds(new Set());
    }
  }, [note.id, note.title, note.blocks, onUpdateNote]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (shareAccessLevel === 'password' && passwordInputRef.current && showShareMenu) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [shareAccessLevel, showShareMenu]);


  useEffect(() => {
    if (selectedBlockIds.size === 0) return;
    
    const handleDelete = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        
        const remainingBlocks = blocks.filter(b => !selectedBlockIds.has(b.id));
        
        if (remainingBlocks.length === 0) {
          const newBlock: Block = {
            id: "b" + Date.now(),
            type: "text",
            content: "",
          };
          remainingBlocks.push(newBlock);
          setFocusedBlockId(newBlock.id);
        }
        
        setBlocks(remainingBlocks);
        setSelectedBlockIds(new Set());
        saveIfChanged({
          ...note,
          blocks: remainingBlocks,
          updatedAt: new Date(),
        });
      }
      
      if (e.key === 'Escape') {
        setSelectedBlockIds(new Set());
      }
    };
    
    document.addEventListener('keydown', handleDelete, true);
    return () => document.removeEventListener('keydown', handleDelete, true);
  }, [blocks, selectedBlockIds, note, saveIfChanged]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    // Only save if title actually changed
    if (title !== lastSavedSnapshotRef.current.title) {
      saveIfChanged({
        ...note,
        title: title,
        blocks: blocks,
        updatedAt: new Date(),
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    }
  };

  const handleBlockUpdate = (blockId: string, content: string, metadata?: any) => {
    const updatedBlocks = blocks.map((block) =>
      block.id === blockId ? { ...block, content, metadata } : block
    );
    setBlocks(updatedBlocks);
    // Use debounced save to prevent excessive API calls on every keystroke
    debouncedSave({
      ...note,
      blocks: updatedBlocks,
      updatedAt: new Date(),
    });
  };

  const handleAddBlock = (
    afterBlockId: string,
    type: "text" | "code" | "tasklist" | "image" | "table"
  ) => {
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
    const newBlocks = [
      ...blocks.slice(0, index + 1),
      newBlock,
      ...blocks.slice(index + 1),
    ];

    setBlocks(newBlocks);
    setFocusedBlockId(newBlock.id);
    // Use debounced save for adding blocks
    debouncedSave({
      ...note,
      blocks: newBlocks,
      updatedAt: new Date(),
    });
  };

  const handleToggleSelectAll = useCallback(() => {
    if (selectedBlockIds.size > 0) {
      setSelectedBlockIds(new Set());
    } else {
      setSelectedBlockIds(new Set(blocks.map(b => b.id)));
      setFocusedBlockId(null);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.getSelection()?.removeAllRanges();
    }
  }, [blocks, selectedBlockIds.size]);

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
      setBlocks(updatedBlocks);
      setFocusedBlockId(newBlock.id);
    } else {
      setBlocks(updatedBlocks);
      if (blockIndex > 0) {
        setFocusedBlockId(updatedBlocks[blockIndex - 1].id);
      } else {
        setFocusedBlockId(updatedBlocks[0].id);
      }
    }
    
    saveIfChanged({
      ...note,
      blocks: updatedBlocks,
      updatedAt: new Date(),
    });
  };

  const parseHtmlTable = (html: string): { rows: number; cols: number; cells: { [key: string]: string }; alignment: { [key: string]: "left" | "center" | "right" } } | null => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const table = temp.querySelector('table');
    if (!table) return null;
    return parseTableElement(table);
  };
  
  const parseTableElement = (table: Element): { rows: number; cols: number; cells: { [key: string]: string }; alignment: { [key: string]: "left" | "center" | "right" } } | null => {
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

  const uploadBase64Image = async (dataUri: string): Promise<string | null> => {
    try {
      const response = await fetch(dataUri);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("image", blob, "pasted-image.png");
      const uploadResponse = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!uploadResponse.ok) throw new Error("Upload failed");
      const data = await uploadResponse.json();
      return data.url;
    } catch (error) {
      console.error("Base64 image upload error:", error);
      return null;
    }
  };

  const detectLanguageFromCode = (code: string): string => {
    if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('=>')) return 'javascript';
    if (code.includes('def ') || code.includes('import ') && code.includes(':')) return 'python';
    if (code.includes('public class ') || code.includes('private ') || code.includes('void ')) return 'java';
    if (code.includes('<?php') || code.includes('echo ')) return 'php';
    if (code.includes('<html') || code.includes('<div') || code.includes('<span')) return 'html';
    if (code.includes('{') && code.includes(':') && code.includes(';') && !code.includes('function')) return 'css';
    if (code.includes('SELECT ') || code.includes('INSERT ') || code.includes('UPDATE ') || code.includes('FROM ')) return 'sql';
    return 'javascript';
  };

  const parseRichContentFromHtml = async (html: string, clipboardFiles?: File[]): Promise<Block[]> => {
    console.log('=== PASTE DEBUG ===');
    console.log('Raw HTML from clipboard:', html);
    console.log('Clipboard files:', clipboardFiles?.length || 0);
    
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const newBlocks: Block[] = [];
    let currentTextContent = '';
    let hasSpecialBlocks = false;
    let imageFileIndex = 0;
    
    const flushTextBlock = () => {
      const trimmedContent = currentTextContent.trim();
      const cleanedContent = trimmedContent.replace(/<br>$/g, '').trim();
      if (cleanedContent) {
        newBlocks.push({
          id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
          type: "text",
          content: cleanedContent
        });
        currentTextContent = '';
      }
    };
    
    const isCodeBlock = (el: HTMLElement): boolean => {
      const tagName = el.tagName.toLowerCase();
      const evernoteElement = el.getAttribute('data-evernote-element');
      const hasCodeBlockClass = el.classList?.contains('CodeBlock') || el.classList?.contains('code-block');
      const hasMonospaceFont = el.style.fontFamily?.includes('monospace') || 
                               el.style.fontFamily?.includes('Courier') ||
                               el.style.fontFamily?.includes('Consolas');
      
      if (tagName === 'pre') return true;
      if (el.getAttribute('data-evernote-codeblock') === 'true') return true;
      if (el.getAttribute('data-codeblock') === 'true') return true;
      if (evernoteElement === 'en-codeblock') return true;
      if (hasCodeBlockClass) return true;
      
      if (tagName === 'code') {
        const content = el.textContent?.trim() || '';
        const hasNewlines = content.includes('\n');
        const isLongEnough = content.length > 50;
        const parent = el.parentElement;
        const isInsidePre = parent?.tagName.toLowerCase() === 'pre';
        return isInsidePre || hasNewlines || isLongEnough;
      }
      
      if (tagName === 'div' && hasMonospaceFont) {
        const content = el.textContent?.trim() || '';
        return content.includes('\n') || content.length > 50;
      }
      
      return false;
    };
    
    const isMediaElement = (el: HTMLElement): boolean => {
      const evernoteElement = el.getAttribute('data-evernote-element');
      return evernoteElement === 'en-media' || evernoteElement === 'en-attachment';
    };
    
    const getImageSrc = (el: HTMLElement): string | null => {
      return el.getAttribute('data-fullsrc') || 
             el.getAttribute('data-src') || 
             el.getAttribute('src');
    };
    
    const uploadClipboardFile = async (file: File): Promise<string | null> => {
      try {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        return data.url;
      } catch (error) {
        console.error("Clipboard file upload error:", error);
        return null;
      }
    };
    
    const processNode = async (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        if (text.trim()) {
          currentTextContent += text;
        }
        return;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        if (isCodeBlock(el)) {
          flushTextBlock();
          const codeContent = el.textContent?.trim() || '';
          if (codeContent) {
            hasSpecialBlocks = true;
            const language = el.getAttribute('data-language') || 
                           el.getAttribute('data-syntax') ||
                           detectLanguageFromCode(codeContent);
            newBlocks.push({
              id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
              type: "code",
              content: codeContent,
              metadata: { language }
            });
          }
          return;
        }
        
        if (isMediaElement(el)) {
          flushTextBlock();
          const imgEl = el.querySelector('img');
          if (imgEl) {
            const src = getImageSrc(imgEl);
            if (src && src.startsWith('http')) {
              hasSpecialBlocks = true;
              newBlocks.push({
                id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
                type: "image",
                content: src,
                metadata: { width: 500, height: 300 }
              });
            } else if (clipboardFiles && imageFileIndex < clipboardFiles.length) {
              const file = clipboardFiles[imageFileIndex];
              if (file && file.type.startsWith('image/')) {
                const uploadedUrl = await uploadClipboardFile(file);
                if (uploadedUrl) {
                  hasSpecialBlocks = true;
                  newBlocks.push({
                    id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
                    type: "image",
                    content: uploadedUrl,
                    metadata: { width: 500, height: 300 }
                  });
                }
                imageFileIndex++;
              }
            }
          }
          return;
        }
        
        if (tagName === 'img') {
          flushTextBlock();
          const src = getImageSrc(el);
          if (src) {
            if (src.startsWith('data:')) {
              const uploadedUrl = await uploadBase64Image(src);
              if (uploadedUrl) {
                hasSpecialBlocks = true;
                newBlocks.push({
                  id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
                  type: "image",
                  content: uploadedUrl,
                  metadata: { width: 500, height: 300 }
                });
              }
            } else if (src.startsWith('http')) {
              hasSpecialBlocks = true;
              newBlocks.push({
                id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
                type: "image",
                content: src,
                metadata: { width: 500, height: 300 }
              });
            } else if (src.startsWith('blob:') && clipboardFiles && imageFileIndex < clipboardFiles.length) {
              const file = clipboardFiles[imageFileIndex];
              if (file && file.type.startsWith('image/')) {
                const uploadedUrl = await uploadClipboardFile(file);
                if (uploadedUrl) {
                  hasSpecialBlocks = true;
                  newBlocks.push({
                    id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
                    type: "image",
                    content: uploadedUrl,
                    metadata: { width: 500, height: 300 }
                  });
                }
                imageFileIndex++;
              }
            }
          }
          return;
        }
        
        if (tagName === 'table') {
          flushTextBlock();
          const tableData = parseTableElement(el);
          if (tableData) {
            hasSpecialBlocks = true;
            newBlocks.push({
              id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
              type: "table",
              content: "",
              metadata: { tableData }
            });
          }
          return;
        }
        
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          flushTextBlock();
          const headingText = el.textContent?.trim() || '';
          if (headingText) {
            newBlocks.push({
              id: "b" + Date.now() + Math.random().toString(36).substr(2, 9),
              type: "text",
              content: `<${tagName}>${headingText}</${tagName}>`
            });
          }
          return;
        }
        
        if (['p', 'div', 'br'].includes(tagName)) {
          if (tagName === 'br') {
            currentTextContent += '<br>';
          } else {
            for (const child of Array.from(el.childNodes)) {
              await processNode(child);
            }
            if (currentTextContent.trim()) {
              flushTextBlock();
            }
          }
          return;
        }
        
        if (tagName === 'code' && !isCodeBlock(el)) {
          currentTextContent += `<code>${el.textContent}</code>`;
          return;
        }
        
        if (['b', 'strong', 'i', 'em', 'u', 'span', 'a', 'li', 'ul', 'ol'].includes(tagName)) {
          if (['ul', 'ol'].includes(tagName)) {
            flushTextBlock();
            currentTextContent = el.outerHTML;
            flushTextBlock();
          } else {
            currentTextContent += el.outerHTML;
          }
          return;
        }
        
        for (const child of Array.from(el.childNodes)) {
          await processNode(child);
        }
      }
    };
    
    for (const child of Array.from(temp.childNodes)) {
      await processNode(child);
    }
    
    flushTextBlock();
    
    if (!hasSpecialBlocks && newBlocks.length === 0) {
      return [];
    }
    
    if (!hasSpecialBlocks && newBlocks.length === 1 && newBlocks[0].type === 'text') {
      return [];
    }
    
    return newBlocks;
  };

  const handlePasteImage = async (blockId: string, event: ClipboardEvent) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html');
    
    const clipboardFiles: File[] = [];
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            clipboardFiles.push(file);
          }
        }
      }
    }
    
    if (html) {
      const richBlocks = await parseRichContentFromHtml(html, clipboardFiles.length > 0 ? clipboardFiles : undefined);
      if (richBlocks.length > 0) {
        event.preventDefault();
        
        const index = blocks.findIndex((b) => b.id === blockId);
        const newBlocksList = [
          ...blocks.slice(0, index + 1),
          ...richBlocks,
          ...blocks.slice(index + 1),
        ];

        setBlocks(newBlocksList);
        onUpdateNote({
          ...note,
          blocks: newBlocksList,
          updatedAt: new Date(),
        });
        return;
      }
    }

    if (clipboardFiles.length > 0) {
      event.preventDefault();
      for (const file of clipboardFiles) {
        try {
          const formData = new FormData();
          formData.append("image", file);
          const response = await fetch("/api/upload/image", {
            method: "POST",
            body: formData,
            credentials: "include",
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
          const newBlocks = [
            ...blocks.slice(0, index + 1),
            imageBlock,
            ...blocks.slice(index + 1),
          ];

          setBlocks(newBlocks);
          onUpdateNote({
            ...note,
            blocks: newBlocks,
            updatedAt: new Date(),
          });
        } catch (error) {
          console.error("Image paste upload error:", error);
        }
      }
    }
  };

  const handleInsertAtCursor = (type: "code" | "tasklist" | "image" | "table") => {
    const blockId = focusedBlockId || blocks[blocks.length - 1].id;
    handleAddBlock(blockId, type);
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
    if (linkUrl && savedSelection) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
      }
      
      insertLink(linkUrl);
      setLinkUrl("");
      setShowLinkDialog(false);
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

  const handleCopyShareLink = async () => {
    try {
      const response = await fetch(`/api/notes/${note.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shareType: shareAccessLevel === 'view' ? 'view_only' : shareAccessLevel === 'edit' ? 'can_edit' : 'password',
          password: shareAccessLevel === 'password' ? sharePassword : null,
          permission: shareAccessLevel === 'password' ? passwordPermission : (shareAccessLevel === 'view' ? 'view' : 'edit'),
        }),
      });

      if (!response.ok) throw new Error('Failed to create share');
      
      const data = await response.json();
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared/${data.shareLink}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
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

  // Toolbar button groups with premium styling
  const toolbarGroups = [
    {
      id: 'format',
      buttons: [
        { icon: Bold, label: "Жирный", format: "bold", shortcut: "⌘B" },
        { icon: Italic, label: "Курсив", format: "italic", shortcut: "⌘I" },
        { icon: Underline, label: "Подчеркивание", format: "underline", shortcut: "⌘U" },
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
    {
      id: 'selection',
      buttons: [
        { 
          icon: selectedBlockIds.size > 0 ? XCircle : MousePointerSquareDashed, 
          label: selectedBlockIds.size > 0 ? "Снять выделение" : "Выделить все блоки", 
          action: handleToggleSelectAll
        },
      ]
    },
  ];

  const moreMenuItems = [
    { icon: ExternalLink, label: "Открыть в новом окне", shortcut: "Alt+O" },
    { divider: true },
    { icon: Share2, label: "Поделиться", shortcut: "Alt+S" },
    { icon: Copy, label: "Копировать ссылку", shortcut: "Alt+Ctrl+L" },
    { divider: true },
    { icon: FolderInput, label: "Переместить", shortcut: "Alt+Shift+M" },
    { icon: Copy, label: "Копировать в" },
    { icon: FileText, label: "Дублировать" },
    { divider: true },
    { icon: Trash2, label: "В корзину", shortcut: "Delete", danger: true },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-l relative bg-white border-gray-200/50">
      {/* Aurora Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`${gradientId}-editor-aurora`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8">
                <animate attributeName="stop-color" values="#818cf8;#c084fc;#818cf8" dur="12s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" stopColor="#22d3ee">
                <animate attributeName="stop-color" values="#22d3ee;#a78bfa;#22d3ee" dur="10s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <motion.ellipse 
            rx="40%" ry="60%"
            fill={`url(#${gradientId}-editor-aurora)`}
            initial={{ cx: "20%", cy: "80%", opacity: 0.2 }}
            animate={{ 
              cx: ["20%", "80%", "20%"],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* Premium Floating Toolbar */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 mx-4 mt-4 mb-2 rounded-2xl border shadow-xl backdrop-blur-2xl bg-white/80 border-white/50 shadow-indigo-500/20"
      >
        <div className="flex items-center justify-between px-4 py-2.5">
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
                        className="relative p-2 rounded-lg transition-all group hover:bg-indigo-50 text-gray-600 hover:text-indigo-600"
                        title={button.label}
                        data-testid={`toolbar-${button.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="w-4 h-4" />
                        {/* Tooltip */}
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-gray-900 text-white">
                          {button.label}
                          {button.shortcut && <span className="ml-1 opacity-60">{button.shortcut}</span>}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Notebook Dropdown */}
            <div className="relative">
              <motion.button
                ref={notebookButtonRef}
                onClick={() => {
                  if (!showNotebookDropdown && notebookButtonRef.current) {
                    const rect = notebookButtonRef.current.getBoundingClientRect();
                    setDropdownPosition({ top: rect.bottom + 4, left: rect.left });
                  }
                  setShowNotebookDropdown(!showNotebookDropdown);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="notebook-dropdown-trigger"
                className="px-3 py-1.5 text-sm rounded-xl border transition-all flex items-center gap-2 min-w-[120px] border-gray-200 bg-white/60 text-gray-700 hover:bg-white hover:border-gray-300"
              >
                <span className="truncate">{note.notebook}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
              </motion.button>
            </div>

            {/* Share Button */}
            <motion.button 
              onClick={() => setShowShareMenu(!showShareMenu)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-1.5 text-sm rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
              data-testid="share-button"
            >
              <Share2 className="w-4 h-4" />
              Поделиться
            </motion.button>

            {/* More Menu Button */}
            <motion.button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl transition-all hover:bg-gray-100 text-gray-600"
              title="Дополнительно"
              data-testid="more-menu-button"
            >
              <MoreVertical className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Notebook Dropdown Portal */}
      {showNotebookDropdown && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 99999 }}
            onClick={() => setShowNotebookDropdown(false)}
          />
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed rounded-xl shadow-2xl border py-2 w-56 overflow-hidden bg-white border-gray-200"
            style={{ zIndex: 100000, top: dropdownPosition.top, left: dropdownPosition.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Категории
              </p>
            </div>
            
            <button
              onClick={() => {
                onUpdateNote({
                  ...note,
                  notebook: "Uncategorized",
                  updatedAt: new Date(),
                });
                setShowNotebookDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                note.notebook === "Uncategorized" 
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              data-testid="category-option-uncategorized"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Без категории</span>
              {note.notebook === "Uncategorized" && <Check className="w-4 h-4 ml-auto" />}
            </button>
            
            {categories.map((cat) => {
              const CatIcon = iconMap[cat.icon] || FolderOpen;
              const isSelected = note.notebook === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onUpdateNote({
                      ...note,
                      notebook: cat.name,
                      updatedAt: new Date(),
                    });
                    setShowNotebookDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                    isSelected 
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  data-testid={`category-option-${cat.id}`}
                >
                  <CatIcon className="w-4 h-4" />
                  <span>{cat.name}</span>
                  {isSelected && <Check className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
            
            <div className="border-t mt-1 pt-1 border-gray-100">
              <button
                onClick={() => {
                  setShowCategoryModal(true);
                  setShowNotebookDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-indigo-600 hover:bg-indigo-50"
                data-testid="add-category-button"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить категорию</span>
              </button>
            </div>
          </motion.div>
        </>,
        document.body
      )}

      {/* Premium Share Menu */}
      <AnimatePresence>
        {showShareMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999998]"
              onClick={() => setShowShareMenu(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-20 right-8 rounded-2xl shadow-2xl border py-2 z-[9999999] w-80 overflow-hidden bg-white border-gray-200"
            >
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Поделиться заметкой</h3>
                    <p className="text-xs text-gray-500">Выберите уровень доступа</p>
                  </div>
                  <button
                    onClick={() => setShowShareMenu(false)}
                    className="p-1 rounded-lg transition-colors hover:bg-white/80"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Access Level Options */}
              <div className="py-2">
                {[
                  { key: 'password', icon: Lock, title: 'С паролем', desc: 'Только с паролем смогут просматривать' },
                  { key: 'view', icon: Eye, title: 'Только просмотр', desc: 'Любой с ссылкой может просматривать' },
                  { key: 'edit', icon: FileText, title: 'Редактирование', desc: 'Любой с ссылкой может редактировать' },
                ].map((option) => (
                  <motion.button
                    key={option.key}
                    onClick={() => setShareAccessLevel(option.key as any)}
                    whileHover={{ x: 2 }}
                    className={`w-full text-left px-4 py-2.5 transition-colors flex items-start gap-3 ${
                      shareAccessLevel === option.key 
                        ? 'bg-indigo-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${
                      shareAccessLevel === option.key
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <option.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{option.title}</span>
                        {shareAccessLevel === option.key && (
                          <motion.div 
                            layoutId="shareCheck"
                            className="w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center"
                          >
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 text-gray-500">{option.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Password Input */}
              <AnimatePresence>
                {shareAccessLevel === 'password' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-2 border-t border-gray-100"
                  >
                    <label className="block text-xs mb-1.5 text-gray-600">Установить пароль</label>
                    <input
                      ref={passwordInputRef}
                      type="text"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      placeholder="Введите пароль"
                      className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border-gray-200 bg-white text-gray-900 placeholder-gray-400"
                    />
                    
                    {/* Permission Selection */}
                    <div className="mt-3">
                      <label className="block text-xs mb-2 text-gray-600">Права доступа</label>
                      <div className="flex gap-2">
                        {['view', 'edit'].map((perm) => (
                          <button
                            key={perm}
                            onClick={() => setPasswordPermission(perm as 'view' | 'edit')}
                            className={`flex-1 px-3 py-2 text-xs rounded-xl border transition-all ${
                              passwordPermission === perm 
                                ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400 text-indigo-600' 
                                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            {perm === 'view' ? 'Только просмотр' : 'Редактирование'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Copy Link Button */}
              <div className="px-4 py-3 border-t border-gray-100">
                <motion.button
                  onClick={handleCopyShareLink}
                  disabled={shareAccessLevel === 'password' && !sharePassword}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                    linkCopied 
                      ? 'bg-green-500/20 text-green-500 border-2 border-green-500/30'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Ссылка скопирована!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Копировать ссылку
                    </>
                  )}
                </motion.button>
                {shareAccessLevel === 'password' && !sharePassword && (
                  <p className="text-xs mt-2 text-center flex items-center justify-center gap-1 text-amber-600">
                    <Info className="w-3 h-3" />
                    Сначала установите пароль
                  </p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999998]"
              onClick={() => setShowMoreMenu(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-20 right-4 rounded-xl shadow-2xl border py-1 z-[9999999] w-64 max-h-[600px] overflow-y-auto bg-white border-gray-200"
            >
              {moreMenuItems.map((item, index) => {
                if (item.divider) {
                  return (
                    <div
                      key={`divider-${index}`}
                      className="border-t my-1 border-gray-200"
                    />
                  );
                }

                const Icon = item.icon!;
                return (
                  <motion.button
                    key={item.label}
                    whileHover={{ x: 2 }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                      item.danger 
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setShowMoreMenu(false)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.shortcut && (
                      <span className="text-xs text-gray-400">
                        {item.shortcut}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Editor Content */}
      <div 
        ref={editorRef} 
        tabIndex={0}
        className="flex-1 overflow-y-auto p-8 relative z-10 bg-white/50 outline-none"
      >
        <div className="w-full max-w-full px-4">
          {/* Title */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="w-full bg-transparent border-none outline-none mb-6 text-3xl font-bold text-gray-900 placeholder-gray-400"
              data-testid="note-title-input"
            />
          ) : (
            <motion.h1
              onDoubleClick={() => setIsEditingTitle(true)}
              whileHover={{ scale: 1.001 }}
              className="w-full bg-transparent border-none outline-none mb-6 text-3xl font-bold cursor-text text-gray-900"
              data-testid="note-title"
            >
              {title || "Без названия"}
            </motion.h1>
          )}

          {/* Blocks */}
          {blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              isFocused={focusedBlockId === block.id}
              isSelected={selectedBlockIds.has(block.id)}
              onFocus={() => {
                setFocusedBlockId(block.id);
                if (selectedBlockIds.size > 0) {
                  setSelectedBlockIds(new Set());
                }
              }}
              onUpdate={handleBlockUpdate}
              onAddBlock={handleAddBlock}
              onDelete={handleDeleteBlock}
              onPaste={handlePasteImage}
            />
          ))}

          {/* Click area to add new text block */}
          <div
            onClick={() => {
              const newBlock: Block = {
                id: "b" + Date.now(),
                type: "text",
                content: "",
              };
              const updatedBlocks = [...blocks, newBlock];
              setBlocks(updatedBlocks);
              setFocusedBlockId(newBlock.id);
              onUpdateNote({
                ...note,
                blocks: updatedBlocks,
                updatedAt: new Date(),
              });
            }}
            className="h-10 cursor-text rounded transition-colors hover:bg-white/30"
          />

          {/* Note Info */}
          <div className="pt-4 border-t text-[10px] flex items-center justify-between opacity-60 border-gray-200 text-gray-500">
            <p>Создано: {note.createdAt.toLocaleString('ru-RU')}</p>
            <p>Изменено: {note.updatedAt.toLocaleString('ru-RU')}</p>
          </div>
        </div>
      </div>

      {/* Link Dialog */}
      <AnimatePresence>
        {showLinkDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowLinkDialog(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border p-6 z-50 w-96 bg-white border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Вставить ссылку</h3>
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4 border-gray-200 bg-white text-gray-900 placeholder-gray-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleInsertLink();
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLinkDialog(false)}
                  className="px-4 py-2 text-sm rounded-xl transition-colors text-gray-700 hover:bg-gray-100"
                >
                  Отмена
                </button>
                <button
                  onClick={handleInsertLink}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all"
                >
                  Вставить
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Color Picker */}
      <AnimatePresence>
        {showColorPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowColorPicker(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border p-6 z-50 w-80 bg-white border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Цвет текста</h3>
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {[
                  "#000000", "#DC2626", "#16A34A", "#2563EB", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
                  "#64748B", "#EF4444", "#22C55E", "#3B82F6", "#FBBF24", "#A855F7", "#F472B6", "#14B8A6",
                ].map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 rounded-full shadow-md border-2 border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Background Picker */}
      <AnimatePresence>
        {showBackgroundPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowBackgroundPicker(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border p-6 z-50 w-80 bg-white border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Цвет выделения</h3>
                <button
                  onClick={() => setShowBackgroundPicker(false)}
                  className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {[
                  "#FEF3C7", "#DBEAFE", "#D1FAE5", "#FCE7F3", "#E9D5FF", "#CCFBF1", "#FED7AA", "#E2E8F0",
                  "#FCD34D", "#93C5FD", "#6EE7B7", "#F9A8D4", "#C4B5FD", "#5EEAD4", "#FDBA74", "#CBD5E1",
                ].map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => handleBackgroundSelect(color)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-8 h-8 rounded-full shadow-md border-2 border-white/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Font Size Menu */}
      <AnimatePresence>
        {showFontSizeMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setShowFontSizeMenu(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border p-6 z-50 w-80 bg-white border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Размер шрифта</h3>
                <button
                  onClick={() => setShowFontSizeMenu(false)}
                  className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-1">
                {[
                  { size: "10px", label: "10px — Мелкий" },
                  { size: "12px", label: "12px" },
                  { size: "14px", label: "14px — Обычный" },
                  { size: "16px", label: "16px" },
                  { size: "18px", label: "18px — Крупный" },
                  { size: "20px", label: "20px" },
                  { size: "24px", label: "24px — Очень крупный" },
                  { size: "32px", label: "32px — Огромный" },
                ].map(({ size, label }) => (
                  <motion.button
                    key={size}
                    onClick={() => handleFontSizeSelect(size)}
                    whileHover={{ x: 2 }}
                    className="w-full text-left px-4 py-2.5 rounded-xl transition-colors flex items-center justify-between hover:bg-gray-100 text-gray-700"
                    style={{ fontSize: size }}
                  >
                    <span>{label}</span>
                    <span className="text-xs text-gray-400">Aa</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Text Alignment Menu */}
      <AnimatePresence>
        {showAlignmentMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowAlignmentMenu(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed rounded-xl shadow-2xl border p-2 z-50 bg-white border-gray-200"
              style={{ top: alignmentMenuPosition.top, left: alignmentMenuPosition.left }}
            >
              <div className="flex flex-col gap-1">
                {[
                  { align: 'left', icon: AlignLeft, label: 'По левому краю' },
                  { align: 'center', icon: AlignCenter, label: 'По центру' },
                  { align: 'right', icon: AlignRight, label: 'По правому краю' },
                ].map(({ align, icon: Icon, label }) => (
                  <motion.button
                    key={align}
                    onClick={() => applyTextAlignment(align as 'left' | 'center' | 'right')}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Category Creation Modal */}
      <AnimatePresence>
        {showCategoryModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[9999990] backdrop-blur-sm"
              onClick={() => {
                setShowCategoryModal(false);
                setNewCategoryName("");
                setNewCategoryIcon("Briefcase");
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl border p-6 z-[9999991] w-96 bg-white border-gray-200"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Создать категорию</h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName("");
                    setNewCategoryIcon("Briefcase");
                  }}
                  className="p-1 rounded-lg transition-colors hover:bg-gray-100"
                  data-testid="close-category-modal"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Название
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Введите название..."
                    className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border-gray-200 bg-white text-gray-900 placeholder-gray-400"
                    data-testid="category-name-input"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Иконка
                  </label>
                  <div className="grid grid-cols-8 gap-2 p-3 rounded-xl bg-gray-50">
                    {availableIcons.map(({ name, icon: IconComp }) => (
                      <motion.button
                        key={name}
                        onClick={() => setNewCategoryIcon(name)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-2 rounded-lg transition-all ${
                          newCategoryIcon === name
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                        data-testid={`icon-option-${name}`}
                        title={name}
                      >
                        <IconComp className="w-4 h-4" />
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2 text-sm text-gray-500">
                  <span>Предпросмотр:</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50">
                    {(() => {
                      const PreviewIcon = iconMap[newCategoryIcon] || FolderOpen;
                      return <PreviewIcon className="w-4 h-4 text-indigo-600" />;
                    })()}
                    <span className="text-indigo-700">
                      {newCategoryName || "Название"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName("");
                    setNewCategoryIcon("Briefcase");
                  }}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl transition-colors text-gray-700 bg-gray-100 hover:bg-gray-200"
                  data-testid="cancel-category-button"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    if (newCategoryName.trim() && onAddCategory) {
                      const newCategory: Category = {
                        id: `cat-${Date.now()}`,
                        name: newCategoryName.trim(),
                        icon: newCategoryIcon,
                      };
                      onAddCategory(newCategory);
                      setShowCategoryModal(false);
                      setNewCategoryName("");
                      setNewCategoryIcon("Briefcase");
                    }
                  }}
                  disabled={!newCategoryName.trim()}
                  className={`flex-1 px-4 py-2.5 text-sm rounded-xl transition-all ${
                    newCategoryName.trim()
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid="create-category-button"
                >
                  Создать
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
