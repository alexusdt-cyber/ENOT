import { useRef, useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onPaste={handlePaste}
      className={`outline-none ${className}`}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  );
}

export function applyFormat(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function insertLink(url: string) {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    // Make sure we add http:// if no protocol is provided
    const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
    document.execCommand("createLink", false, fullUrl);
    
    // Style the newly created link and add title attribute for tooltip
    const range = selection.getRangeAt(0);
    const linkElements = range.commonAncestorContainer.parentElement?.querySelectorAll('a');
    if (linkElements) {
      linkElements.forEach((link) => {
        if (link.textContent === selection.toString()) {
          link.style.color = '#4F46E5';
          link.style.textDecoration = 'underline';
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.setAttribute('title', fullUrl);
        }
      });
    }
  }
}

export function hidePassword() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  
  // Check if selection contains or is inside a password-wrapper
  let hasWrapper = false;
  
  // Check in selected range
  const fragment = range.cloneContents();
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment);
  
  if (tempDiv.querySelector('.password-wrapper')) {
    hasWrapper = true;
  }
  
  // Check if parent is wrapper
  const parentWrapper = range.commonAncestorContainer.parentElement?.closest('.password-wrapper');
  if (parentWrapper) {
    hasWrapper = true;
  }
  
  // If there are wrappers, unwrap them first
  if (hasWrapper) {
    // Get all wrappers in the current contentEditable
    const contentEditable = range.commonAncestorContainer.parentElement?.closest('[contenteditable]');
    if (contentEditable) {
      const allWrappers = contentEditable.querySelectorAll('.password-wrapper');
      allWrappers.forEach(wrapper => {
        const originalHtml = wrapper.getAttribute('data-original-html') || wrapper.innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHtml;
        
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        
        wrapper.parentNode?.replaceChild(fragment, wrapper);
      });
    }
    
    // Now reselect and hide
    setTimeout(() => {
      const newSelection = window.getSelection();
      if (newSelection) {
        newSelection.removeAllRanges();
        newSelection.addRange(range);
        performHidePassword();
      }
    }, 0);
    return;
  }
  
  performHidePassword();
}

function performHidePassword() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  if (range.collapsed) return;
  
  // Get the selected content
  const fragment = range.cloneContents();
  
  // Create a wrapper span that will hold the original content
  const wrapper = document.createElement('span');
  wrapper.className = 'password-wrapper';
  wrapper.setAttribute('data-password-hidden', 'true');
  
  // Store the original HTML
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment.cloneNode(true));
  wrapper.setAttribute('data-original-html', tempDiv.innerHTML);
  
  // Create the hidden version (with asterisks)
  const hiddenContent = createHiddenVersion(fragment);
  wrapper.appendChild(hiddenContent);
  
  // Add icons
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
  
  // Replace the selection with our wrapper
  range.deleteContents();
  range.insertNode(wrapper);
  
  // Clear selection
  selection.removeAllRanges();
  
  // Dispatch input event to trigger save
  const contentEditable = wrapper.closest('[contenteditable]');
  if (contentEditable) {
    contentEditable.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function createHiddenVersion(fragment: DocumentFragment): DocumentFragment {
  const result = document.createDocumentFragment();
  
  function processNode(node: Node): Node {
    if (node.nodeType === Node.TEXT_NODE) {
      // Replace text with asterisks, preserving whitespace and newlines
      const text = node.textContent || '';
      const hidden = text.replace(/\S/g, '*');
      return document.createTextNode(hidden);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Clone the element to preserve all attributes and styles
      const clone = element.cloneNode(false) as Element;
      
      // Process all child nodes
      node.childNodes.forEach(child => {
        clone.appendChild(processNode(child));
      });
      
      return clone;
    }
    
    return node.cloneNode(true);
  }
  
  fragment.childNodes.forEach(node => {
    result.appendChild(processNode(node));
  });
  
  return result;
}

export function applyTextColor(color: string) {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    document.execCommand('foreColor', false, color);
  }
}

export function applyFontSize(size: string) {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    const range = selection.getRangeAt(0);
    const contents = range.extractContents();
    
    const span = document.createElement('span');
    span.style.fontSize = size;
    span.style.lineHeight = '1.6';
    span.appendChild(contents);
    
    range.insertNode(span);
    
    // Clear selection
    selection.removeAllRanges();
  }
}

export function applyBackgroundColor(color: string) {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    document.execCommand('hiliteColor', false, color);
  }
}