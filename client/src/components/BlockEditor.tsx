import { useState, useRef, useEffect } from "react";
import { Block } from "../App";
import {
  Plus,
  Trash2,
  GripVertical,
  Code,
  CheckSquare,
  Image as ImageIcon,
  Type,
  Copy,
  Check,
  Eye,
  EyeOff,
  Calendar,
  Bell,
  BellOff,
  Clock,
  X,
  Table as TableIcon,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { RichTextEditor } from "./RichTextEditor";
import { copyToClipboard } from "../utils/clipboard";
import { ImageGallery } from "./ImageGallery";
import { ImageViewer } from "./ImageViewer";
import { TaskItem } from "./TaskItem";
import { TableBlock } from "./TableBlock";

interface BlockEditorProps {
  block: Block;
  isFocused: boolean;
  isSelected?: boolean;
  onFocus: () => void;
  onUpdate: (blockId: string, content: string, metadata?: any) => void;
  onAddBlock: (
    afterBlockId: string,
    type: "text" | "code" | "tasklist" | "image" | "table"
  ) => void;
  onDelete: (blockId: string) => void;
  onPaste: (blockId: string, event: ClipboardEvent) => void;
  imageUploadUrl?: string;
  imagesUploadUrl?: string;
}

export function BlockEditor({
  block,
  isFocused,
  isSelected = false,
  onFocus,
  onUpdate,
  onAddBlock,
  onDelete,
  onPaste,
  imageUploadUrl = "/api/upload/image",
  imagesUploadUrl = "/api/upload/images",
}: BlockEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const prevBlockIdRef = useRef<string | null>(null);
  const prevContentRef = useRef<string | null>(null);
  const taskInputRefs = useRef<{ [key: string]: HTMLInputElement }>({});
  const [imageSize, setImageSize] = useState({
    width: block.metadata?.width || 400,
    height: block.metadata?.height || 300,
  });
  const [isEditingTaskListTitle, setIsEditingTaskListTitle] = useState(false);
  const [taskListTitle, setTaskListTitle] = useState(block.metadata?.taskListTitle || 'Task List');

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
    if (isFocused && contentEditableRef.current && block.type === "text") {
      contentEditableRef.current.focus();
    }
  }, [isFocused, block.type]);


  // Set initial content for contentEditable and initialize password icons
  useEffect(() => {
    if (contentEditableRef.current && block.type === "text") {
      const isUserEditing = document.activeElement === contentEditableRef.current;
      const isFirstRender = prevBlockIdRef.current === null;
      const blockIdChanged = prevBlockIdRef.current !== block.id;
      const contentChangedExternally = prevContentRef.current !== null && prevContentRef.current !== block.content;
      
      // Update if:
      // 1. First render (refs are null)
      // 2. Block ID changed (switching between notes/blocks)
      // 3. Content changed externally AND user is not actively editing
      const shouldUpdate = isFirstRender || blockIdChanged || (contentChangedExternally && !isUserEditing);
      
      if (shouldUpdate) {
        // Set the content
        contentEditableRef.current.innerHTML = block.content || "";
        
        // Initialize password icons for any existing password-wrapper elements
        const wrappers = contentEditableRef.current.querySelectorAll('.password-wrapper');
        wrappers.forEach(wrapper => {
          if (!wrapper.querySelector('.password-icons')) {
            addPasswordIcons(wrapper as HTMLElement);
          }
        });
        
        // Update the refs
        prevBlockIdRef.current = block.id;
        prevContentRef.current = block.content;
      }
    }
  }, [block.content, block.id, block.type]);

  // Auto-resize textarea on mount and content change
  useEffect(() => {
    if (textareaRef.current && (block.type === "text" || block.type === "code")) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [block.content, block.id, block.type]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isFocused && block.type === "text") {
        onPaste(block.id, e);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isFocused, block.id, block.type]);

  // Handle password visibility
  useEffect(() => {
    let hideIconsTimeout: NodeJS.Timeout | null = null;
    
    const handlePasswordClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if clicked on eye icon (show text)
      if (target.classList.contains('eye-icon')) {
        e.stopPropagation();
        e.preventDefault();
        const wrapper = target.closest('.password-wrapper');
        if (wrapper) {
          const originalHtml = wrapper.getAttribute('data-original-html') || '';
          
          // Replace content with original (but keep data-original-html attribute)
          wrapper.innerHTML = originalHtml;
          wrapper.setAttribute('data-password-hidden', 'false');
          
          // Re-add icons
          addPasswordIcons(wrapper as HTMLElement);
          
          // Save the updated content
          if (contentEditableRef.current) {
            const content = sanitizePasswordContent(contentEditableRef.current.innerHTML);
            prevContentRef.current = content; // Update ref to prevent unnecessary re-render
            onUpdate(block.id, content);
          }
          
          // Show icons for 5 seconds
          const newIconsContainer = wrapper.querySelector('.password-icons');
          if (newIconsContainer) {
            positionIcons(wrapper as HTMLElement, newIconsContainer as HTMLElement);
            newIconsContainer.classList.add('visible');
            if (hideIconsTimeout) clearTimeout(hideIconsTimeout);
            hideIconsTimeout = setTimeout(() => {
              newIconsContainer.classList.remove('visible');
            }, 5000);
          }
        }
        return;
      }
      
      // Check if clicked on lock icon (hide text again)
      if (target.classList.contains('lock-icon')) {
        e.stopPropagation();
        e.preventDefault();
        const wrapper = target.closest('.password-wrapper');
        if (wrapper) {
          const originalHtml = wrapper.getAttribute('data-original-html') || '';
          
          // Create hidden version
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = originalHtml;
          const hiddenContent = createHiddenVersionFromElement(tempDiv);
          
          // Replace content with hidden version
          wrapper.innerHTML = '';
          wrapper.appendChild(hiddenContent);
          wrapper.setAttribute('data-password-hidden', 'true');
          
          // Re-add icons
          addPasswordIcons(wrapper as HTMLElement);
          
          // Save the updated content
          if (contentEditableRef.current) {
            const content = sanitizePasswordContent(contentEditableRef.current.innerHTML);
            prevContentRef.current = content; // Update ref to prevent unnecessary re-render
            onUpdate(block.id, content);
          }
          
          // Show icons for 5 seconds
          const newIconsContainer = wrapper.querySelector('.password-icons');
          if (newIconsContainer) {
            positionIcons(wrapper as HTMLElement, newIconsContainer as HTMLElement);
            
            newIconsContainer.classList.add('visible');
            if (hideIconsTimeout) clearTimeout(hideIconsTimeout);
            hideIconsTimeout = setTimeout(() => {
              newIconsContainer.classList.remove('visible');
            }, 5000);
          }
        }
        return;
      }
      
      // Check if clicked on copy icon
      if (target.classList.contains('copy-icon')) {
        e.stopPropagation();
        const wrapper = target.closest('.password-wrapper');
        if (wrapper) {
          const originalHtml = wrapper.getAttribute('data-original-html') || '';
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = originalHtml;
          const textContent = tempDiv.textContent || tempDiv.innerText || '';
          
          // Use universal copy function
          const success = copyToClipboard(textContent);
          
          // Show feedback
          if (success) {
            const originalContent = target.textContent;
            target.textContent = '✓';
            setTimeout(() => {
              target.textContent = originalContent;
            }, 1000);
          }
        }
        return;
      }
      
      // Check if clicked on remove icon (удалить эффект)
      if (target.classList.contains('remove-icon')) {
        e.stopPropagation();
        const wrapper = target.closest('.password-wrapper');
        if (wrapper && wrapper.parentNode && contentEditableRef.current) {
          const originalHtml = wrapper.getAttribute('data-original-html') || '';
          
          // Create a temporary div to parse the HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = originalHtml;
          
          // Replace wrapper with its content (without the wrapper)
          const fragment = document.createDocumentFragment();
          
          // Copy all child nodes from tempDiv to fragment
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          
          // Replace the wrapper with the fragment using parentNode
          wrapper.parentNode.replaceChild(fragment, wrapper);
          
          // Update the block content
          const content = sanitizePasswordContent(contentEditableRef.current.innerHTML);
          prevContentRef.current = content; // Update ref to prevent unnecessary re-render
          onUpdate(block.id, content);
        }
        return;
      }
      
      // Check if clicked on password-wrapper itself (not icons)
      const wrapper = target.closest('.password-wrapper');
      if (wrapper && !target.closest('.password-icons')) {
        e.stopPropagation();
        
        // Clear previous timeout
        if (hideIconsTimeout) {
          clearTimeout(hideIconsTimeout);
        }
        
        // Show icons
        const iconsContainer = wrapper.querySelector('.password-icons');
        if (iconsContainer) {
          // Recalculate position before showing
          positionIcons(wrapper as HTMLElement, iconsContainer as HTMLElement);
          
          iconsContainer.classList.add('visible');
          
          // Hide after 5 seconds
          hideIconsTimeout = setTimeout(() => {
            iconsContainer.classList.remove('visible');
          }, 5000);
        }
      }
    };

    // Add icons to existing wrappers on mount
    if (contentEditableRef.current) {
      const wrappers = contentEditableRef.current.querySelectorAll('.password-wrapper');
      wrappers.forEach(wrapper => {
        if (!wrapper.querySelector('.password-icons')) {
          addPasswordIcons(wrapper as HTMLElement);
        }
      });
      
      contentEditableRef.current.addEventListener('click', handlePasswordClick);
      return () => {
        if (hideIconsTimeout) {
          clearTimeout(hideIconsTimeout);
        }
        contentEditableRef.current?.removeEventListener('click', handlePasswordClick);
      };
    }
  }, [block.id, block.type, block.content]);

  function createHiddenVersionFromElement(element: HTMLElement): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    function processNode(node: Node): Node {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const hidden = text.replace(/\S/g, '*');
        return document.createTextNode(hidden);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const clone = el.cloneNode(false) as Element;
        
        node.childNodes.forEach(child => {
          clone.appendChild(processNode(child));
        });
        
        return clone;
      }
      
      return node.cloneNode(true);
    }
    
    element.childNodes.forEach(node => {
      fragment.appendChild(processNode(node));
    });
    
    return fragment;
  }

  function addPasswordIcons(wrapper: HTMLElement) {
    // Remove existing icons if any
    const existingIcons = wrapper.querySelector('.password-icons');
    if (existingIcons) {
      existingIcons.remove();
    }
    
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'password-icons';
    
    const eyeIcon = document.createElement('span');
    eyeIcon.className = 'eye-icon';
    eyeIcon.textContent = '👁';
    eyeIcon.title = 'Show text';
    
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon';
    lockIcon.textContent = '🔒';
    lockIcon.title = 'Hide text';
    
    const copyIcon = document.createElement('span');
    copyIcon.className = 'copy-icon';
    copyIcon.textContent = '📋';
    copyIcon.title = 'Copy text';
    
    const removeIcon = document.createElement('span');
    removeIcon.className = 'remove-icon';
    removeIcon.textContent = '❌';
    removeIcon.title = 'Remove password effect';
    
    iconsContainer.appendChild(eyeIcon);
    iconsContainer.appendChild(lockIcon);
    iconsContainer.appendChild(copyIcon);
    iconsContainer.appendChild(removeIcon);
    
    wrapper.appendChild(iconsContainer);
    
    // Calculate and set optimal position for icons
    positionIcons(wrapper, iconsContainer);
  }
  
  function sanitizePasswordContent(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const icons = tempDiv.querySelectorAll('.password-icons');
    icons.forEach(icon => icon.remove());
    
    return tempDiv.innerHTML;
  }

  function positionIcons(wrapper: HTMLElement, iconsContainer: HTMLElement) {
    // Get wrapper position and dimensions
    const wrapperRect = wrapper.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Approximate icon container dimensions (3-4 icons * ~26px each + gaps)
    const iconsWidth = 120; // Approximate width for 3-4 icons
    const iconsHeight = 40; // Approximate height
    
    // Calculate available space
    const spaceRight = viewportWidth - wrapperRect.right;
    const spaceBottom = viewportHeight - wrapperRect.bottom;
    const spaceTop = wrapperRect.top;
    
    // Reset all positioning styles
    iconsContainer.style.left = '';
    iconsContainer.style.right = '';
    iconsContainer.style.top = '';
    iconsContainer.style.bottom = '';
    iconsContainer.style.transform = '';
    
    // Priority: right > bottom > top
    if (spaceRight >= iconsWidth + 16) {
      // Position to the right (default)
      iconsContainer.style.left = 'calc(100% + 8px)';
      iconsContainer.style.top = '50%';
      iconsContainer.style.transform = 'translateY(-50%)';
      iconsContainer.classList.remove('positioned-vertical');
    } else if (spaceBottom >= iconsHeight + 16) {
      // Position below
      iconsContainer.style.left = '0';
      iconsContainer.style.top = 'calc(100% + 4px)';
      iconsContainer.classList.add('positioned-vertical');
    } else if (spaceTop >= iconsHeight + 16) {
      // Position above
      iconsContainer.style.left = '0';
      iconsContainer.style.bottom = 'calc(100% + 4px)';
      iconsContainer.classList.add('positioned-vertical');
    } else {
      // Fallback: position to the right even if it overflows
      iconsContainer.style.left = 'calc(100% + 8px)';
      iconsContainer.style.top = '50%';
      iconsContainer.style.transform = 'translateY(-50%)';
      iconsContainer.classList.remove('positioned-vertical');
    }
  }

  // Handle paste to preserve formatting
  useEffect(() => {
    const handlePasteWithFormatting = (e: ClipboardEvent) => {
      if (!contentEditableRef.current || !isFocused || block.type !== "text") return;
      
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      // Check for images in clipboard
      const hasImages = clipboardData.files && clipboardData.files.length > 0;
      
      // Try to get HTML first (preserves formatting)
      const html = clipboardData.getData('text/html');
      const text = clipboardData.getData('text/plain');
      
      if (html) {
        // Clean up the HTML but preserve basic formatting
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Check if content has special elements that NoteEditor should handle
        const hasTable = temp.querySelector('table');
        const hasCodeBlock = temp.querySelector('pre, [data-evernote-element="en-codeblock"], [data-codeblock="true"]');
        const hasImg = temp.querySelector('img');
        
        // Log for debugging
        console.log('=== BLOCKEDITOR PASTE DEBUG ===');
        console.log('HTML:', html.substring(0, 500));
        console.log('hasTable:', !!hasTable, 'hasCodeBlock:', !!hasCodeBlock, 'hasImg:', !!hasImg, 'hasImages:', hasImages);
        
        // If there are special elements or images, let NoteEditor handle it
        if (hasTable || hasCodeBlock || hasImg || hasImages) {
          e.preventDefault();
          onPaste(block.id, e);
          return;
        }
        
        e.preventDefault();
        
        // Remove unwanted tags and attributes but keep formatting
        const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'a', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'code'];
        const cleanHtml = cleanPastedHtml(temp, allowedTags);
        
        document.execCommand('insertHTML', false, cleanHtml);
      } else if (hasImages) {
        e.preventDefault();
        onPaste(block.id, e);
      } else if (text) {
        e.preventDefault();
        // Preserve line breaks
        const formattedText = text.replace(/\n/g, '<br>');
        document.execCommand('insertHTML', false, formattedText);
      }
    };

    if (contentEditableRef.current) {
      contentEditableRef.current.addEventListener('paste', handlePasteWithFormatting);
      return () => {
        contentEditableRef.current?.removeEventListener('paste', handlePasteWithFormatting);
      };
    }
  }, [isFocused, block.type, block.id, onPaste]);

  function cleanPastedHtml(element: HTMLElement, allowedTags: string[]): string {
    let result = '';
    
    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        if (allowedTags.includes(tagName)) {
          if (tagName === 'br') {
            result += '<br>';
          } else if (tagName === 'p' || tagName === 'div') {
            result += cleanPastedHtml(el, allowedTags);
            if (el.nextSibling) result += '<br>';
          } else if (tagName === 'a') {
            const href = el.getAttribute('href') || '';
            result += `<a href="${href}" style="color: #4F46E5; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${cleanPastedHtml(el, allowedTags)}</a>`;
          } else if (tagName === 'b' || tagName === 'strong') {
            result += `<strong>${cleanPastedHtml(el, allowedTags)}</strong>`;
          } else if (tagName === 'i' || tagName === 'em') {
            result += `<em>${cleanPastedHtml(el, allowedTags)}</em>`;
          } else if (tagName === 'u') {
            result += `<u>${cleanPastedHtml(el, allowedTags)}</u>`;
          } else if (tagName === 'span') {
            const style = el.getAttribute('style') || '';
            if (style) {
              result += `<span style="${style}">${cleanPastedHtml(el, allowedTags)}</span>`;
            } else {
              result += cleanPastedHtml(el, allowedTags);
            }
          } else if (tagName === 'ul' || tagName === 'ol') {
            result += `<${tagName}>${cleanPastedHtml(el, allowedTags)}</${tagName}>`;
          } else if (tagName === 'li') {
            result += `<li>${cleanPastedHtml(el, allowedTags)}</li>`;
          } else if (tagName === 'code') {
            result += `<code>${cleanPastedHtml(el, allowedTags)}</code>`;
          } else {
            result += cleanPastedHtml(el, allowedTags);
          }
        } else {
          result += cleanPastedHtml(el, allowedTags);
        }
      }
    });
    
    return result;
  }

  const handleCopyCode = () => {
    copyToClipboard(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTaskToggle = (taskId: string) => {
    const tasks = block.metadata?.tasks || [];
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    onUpdate(block.id, block.content, { tasks: updatedTasks });
  };

  const handleAddTask = () => {
    const tasks = block.metadata?.tasks || [];
    const newTask = {
      id: "t" + Date.now(),
      text: "",
      completed: false,
    };
    onUpdate(block.id, block.content, { tasks: [...tasks, newTask] });
    // Focus the new task input after a short delay
    setTimeout(() => {
      const newTaskInput = taskInputRefs.current[newTask.id];
      if (newTaskInput) {
        newTaskInput.focus();
      }
    }, 10);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<{ id: string; text: string; completed: boolean; dueDate?: Date; reminder?: boolean }>) => {
    const tasks = block.metadata?.tasks || [];
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, ...updates } : task
    );
    onUpdate(block.id, block.content, { tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const tasks = block.metadata?.tasks || [];
    const updatedTasks = tasks.filter((task) => task.id !== taskId);

    // If no tasks left, delete the entire block
    if (updatedTasks.length === 0) {
      onDelete(block.id);
    } else {
      onUpdate(block.id, block.content, { tasks: updatedTasks });
    }
  };

  const handleTaskKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    taskId: string,
    taskText: string
  ) => {
    const tasks = block.metadata?.tasks || [];
    const currentIndex = tasks.findIndex((t) => t.id === taskId);

    // Backspace on empty task
    if (e.key === "Backspace" && taskText === "") {
      e.preventDefault();

      // Focus previous task if exists
      if (currentIndex > 0) {
        const previousTask = tasks[currentIndex - 1];
        const previousInput = taskInputRefs.current[previousTask.id];
        if (previousInput) {
          previousInput.focus();
          // Set cursor to end
          setTimeout(() => {
            previousInput.setSelectionRange(
              previousInput.value.length,
              previousInput.value.length
            );
          }, 0);
        }
      }

      // Delete current task
      handleDeleteTask(taskId);
    }

    // Enter to create new task
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTask();
    }
  };

  const handleImageResize = (newWidth: number) => {
    const aspectRatio = imageSize.height / imageSize.width;
    const newHeight = newWidth * aspectRatio;
    setImageSize({ width: newWidth, height: newHeight });
    onUpdate(block.id, block.content, { width: newWidth, height: newHeight });
  };

  const blockTypeIcons = {
    text: Type,
    code: Code,
    tasklist: CheckSquare,
    image: ImageIcon,
    table: TableIcon,
  };

  const BlockIcon = blockTypeIcons[block.type];

  return (
    <div
      data-block-id={block.id}
      className={`group relative mb-1 transition-all ${
        isSelected 
          ? 'bg-indigo-100/70 ring-2 ring-indigo-400 ring-offset-1 rounded-lg' 
          : ''
      }`}
      onFocus={onFocus}
    >
      {/* Block Controls */}
      <div className="absolute -left-16 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        <button
          className="p-1.5 hover:bg-white/60 rounded transition-colors"
          title="Drag"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 hover:bg-white/60 rounded transition-colors relative"
          title="Add block"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>

        {showMenu && (
          <div className="absolute left-full ml-2 top-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100] min-w-[150px]">
            <button
              onClick={() => {
                onAddBlock(block.id, "text");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Type className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => {
                onAddBlock(block.id, "code");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Code className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => {
                onAddBlock(block.id, "tasklist");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Task List
            </button>
            <button
              onClick={() => {
                onAddBlock(block.id, "image");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Image
            </button>
            <button
              onClick={() => {
                onAddBlock(block.id, "table");
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <TableIcon className="w-4 h-4" />
              Table
            </button>
          </div>
        )}
      </div>

      {/* Block Content */}
      <div className="">
        {/* Text Block */}
        {block.type === "text" && (
          <div className="relative">
            <div
              ref={contentEditableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => {
                const content = sanitizePasswordContent(e.currentTarget.innerHTML);
                prevContentRef.current = content; // Update ref to track current content
                onUpdate(block.id, content);
              }}
              onKeyDown={(e) => {
                // Delete empty block on Backspace
                if (e.key === "Backspace" && !block.content) {
                  e.preventDefault();
                  onDelete(block.id);
                }
              }}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none resize-none text-gray-800 py-2 min-h-[2.5rem]"
              style={{ minHeight: "2.5rem" }}
            />
            <button
              onClick={() => onDelete(block.id)}
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
              title="Delete block"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Code Block */}
        {block.type === "code" && (
          <div className="my-2 rounded-lg overflow-hidden bg-gray-50">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100/80 border-b border-gray-200">
              <select
                value={block.metadata?.language || "javascript"}
                onChange={(e) =>
                  onUpdate(block.id, block.content, {
                    ...block.metadata,
                    language: e.target.value,
                  })
                }
                className="px-3 py-1 text-sm rounded bg-white text-gray-700 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {[
                  "javascript",
                  "typescript",
                  "python",
                  "java",
                  "html",
                  "css",
                  "json",
                  "sql",
                  "bash",
                  "php",
                ].map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(block.id)}
                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                  title="Delete code block"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={block.content}
              onChange={(e) => {
                onUpdate(block.id, e.target.value, block.metadata);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              placeholder={`Enter your ${
                block.metadata?.language || "code"
              } here...`}
              className="w-full min-h-[150px] p-4 bg-gray-50 text-gray-800 font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Task List Block */}
        {block.type === "tasklist" && (
          <div className="my-2 p-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-gray-700">
                <CheckSquare className="w-4 h-4" />
                {isEditingTaskListTitle ? (
                  <input
                    type="text"
                    value={taskListTitle}
                    onChange={(e) => setTaskListTitle(e.target.value)}
                    onBlur={() => {
                      setIsEditingTaskListTitle(false);
                      onUpdate(block.id, block.content, { ...block.metadata, taskListTitle: taskListTitle });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setIsEditingTaskListTitle(false);
                        onUpdate(block.id, block.content, { ...block.metadata, taskListTitle: taskListTitle });
                      }
                      if (e.key === 'Escape') {
                        setIsEditingTaskListTitle(false);
                        setTaskListTitle(block.metadata?.taskListTitle || 'Task List');
                      }
                    }}
                    className="text-sm bg-white border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    autoFocus
                  />
                ) : (
                  <span 
                    className="text-sm cursor-pointer hover:text-indigo-600"
                    onDoubleClick={() => {
                      setTaskListTitle(block.metadata?.taskListTitle || 'Task List');
                      setIsEditingTaskListTitle(true);
                    }}
                    title="Двойной клик для редактирования"
                  >
                    {block.metadata?.taskListTitle || 'Task List'}
                  </span>
                )}
              </div>
              <button
                onClick={() => onDelete(block.id)}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete task list"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>

            <div className="space-y-2">
              {block.metadata?.tasks?.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleTaskToggle}
                  onUpdate={handleUpdateTask}
                  onDelete={handleDeleteTask}
                  inputRef={(el) => (taskInputRefs.current[task.id] = el!)}
                  onKeyDown={handleTaskKeyDown}
                />
              ))}
            </div>

            <button
              onClick={handleAddTask}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add task
            </button>
          </div>
        )}

        {/* Image Block */}
        {block.type === "image" && (
          <div className="my-2">
            {(block.metadata?.images && block.metadata.images.length > 0) || block.content ? (
              <>
                <ImageGallery
                  images={block.metadata?.images || (block.content ? [block.content] : [])}
                  width={block.metadata?.width || 400}
                  alignment={block.metadata?.alignment || "left"}
                  onImageClick={(index) => {
                    setViewerImageIndex(index);
                    setShowImageViewer(true);
                  }}
                  onUpdateSettings={(width, alignment) => {
                    onUpdate(block.id, block.content, {
                      ...block.metadata,
                      width,
                      alignment,
                    });
                  }}
                  onDelete={() => onDelete(block.id)}
                  onDeleteImage={async (imageUrl) => {
                    try {
                      const response = await fetch("/api/upload/image", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ imageUrl }),
                        credentials: "include",
                      });
                      if (!response.ok) {
                        console.error("Failed to delete image from server");
                      }
                    } catch (error) {
                      console.error("Error deleting image:", error);
                    }
                    
                    const currentImages = block.metadata?.images || (block.content ? [block.content] : []);
                    const remainingImages = currentImages.filter((img: string) => img !== imageUrl);
                    
                    if (remainingImages.length === 0) {
                      onDelete(block.id);
                    } else {
                      onUpdate(block.id, remainingImages.length === 1 ? remainingImages[0] : "", {
                        ...block.metadata,
                        images: remainingImages,
                      });
                    }
                  }}
                />
                {showImageViewer && (
                  <ImageViewer
                    images={block.metadata?.images || (block.content ? [block.content] : [])}
                    initialIndex={viewerImageIndex}
                    onClose={() => setShowImageViewer(false)}
                  />
                )}
              </>
            ) : (
              <div className="rounded-lg bg-white/40 backdrop-blur-sm border border-white/40">
                <div className="flex items-center justify-between mb-3 px-4 pt-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Image Gallery</span>
                  </div>
                  <button
                    onClick={() => onDelete(block.id)}
                    className="p-1 hover:bg-red-50 rounded transition-colors"
                    title="Delete image block"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mx-4 mb-4">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-2">
                    Add one or more images
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        try {
                          const formData = new FormData();
                          const isSharedUpload = imageUploadUrl.includes('/shared/');
                          if (files.length === 1) {
                            formData.append("image", files[0]);
                            const response = await fetch(imageUploadUrl, {
                              method: "POST",
                              body: formData,
                              ...(isSharedUpload ? {} : { credentials: "include" as RequestCredentials }),
                            });
                            if (!response.ok) throw new Error("Upload failed");
                            const data = await response.json();
                            onUpdate(block.id, data.url, {
                              ...block.metadata,
                              width: block.metadata?.width || 400,
                              height: block.metadata?.height || 300,
                            });
                          } else {
                            files.forEach(file => formData.append("images", file));
                            const response = await fetch(imagesUploadUrl, {
                              method: "POST",
                              body: formData,
                              ...(isSharedUpload ? {} : { credentials: "include" as RequestCredentials }),
                            });
                            if (!response.ok) throw new Error("Upload failed");
                            const data = await response.json();
                            const imageUrls = data.images.map((img: { url: string }) => img.url);
                            onUpdate(block.id, "", {
                              ...block.metadata,
                              images: imageUrls,
                              width: 400,
                              alignment: "left",
                            });
                          }
                        } catch (error) {
                          console.error("Image upload error:", error);
                        }
                      }
                    }}
                    className="hidden"
                    id={`image-upload-${block.id}`}
                  />
                  <label
                    htmlFor={`image-upload-${block.id}`}
                    className="inline-block px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors"
                  >
                    Choose images
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    Select multiple images to create a gallery
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table Block */}
        {block.type === "table" && (
          <div className="my-2">
            <TableBlock
              blockId={block.id}
              tableData={block.metadata?.tableData}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}