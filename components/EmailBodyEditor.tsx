import React, { useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Link, Unlink, Image } from 'lucide-react';

interface EmailBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  expanded?: boolean;
}

const EDITOR_STYLE_ID = 'email-editor-styles';
if (typeof document !== 'undefined' && !document.getElementById(EDITOR_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = EDITOR_STYLE_ID;
  style.textContent = `
    .email-editor-content img {
      max-width: 100%;
      border-radius: 6px;
      margin: 4px 0;
    }
    .email-editor-content a {
      color: #f59e0b;
      text-decoration: underline;
    }
    .email-editor-content p {
      margin: 0 0 4px 0;
    }
    .email-editor-content [data-placeholder]:empty::before {
      content: attr(data-placeholder);
      color: #666666;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

const EmailBodyEditor: React.FC<EmailBodyEditorProps> = ({ value, onChange, placeholder = 'Compose your email body...', expanded }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Set initial content on mount
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    // Clear if only contains <br> or empty tags
    const clean = html === '<br>' || html === '<div><br></div>' ? '' : html;
    onChange(clean);
    requestAnimationFrame(() => { isInternalChange.current = false; });
  }, [onChange]);

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleInput();
  };

  const handleBold = () => exec('bold');
  const handleItalic = () => exec('italic');

  const handleLink = () => {
    const url = window.prompt('Enter link URL:');
    if (url) exec('createLink', url);
  };

  const handleUnlink = () => exec('unlink');

  const handleImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) exec('insertImage', url);
  };

  const toolBtnClass = 'p-1.5 text-[#9B9B9B] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded transition-none';

  return (
    <div className="rounded-lg border border-[#3a3a3a] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-[#333333] border-b border-[#3a3a3a]">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={handleBold} className={toolBtnClass} title="Bold">
          <Bold size={13} />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={handleItalic} className={toolBtnClass} title="Italic">
          <Italic size={13} />
        </button>
        <div className="w-px h-4 bg-[#4a4a4a] mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={handleLink} className={toolBtnClass} title="Insert link">
          <Link size={13} />
        </button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={handleUnlink} className={toolBtnClass} title="Remove link">
          <Unlink size={13} />
        </button>
        <div className="w-px h-4 bg-[#4a4a4a] mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={handleImage} className={toolBtnClass} title="Insert image">
          <Image size={13} />
        </button>
      </div>
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        className="email-editor-content bg-[#3a3a3a] px-3 py-2 text-sm text-[#ECECEC] leading-relaxed focus:outline-none overflow-y-auto"
        style={{ minHeight: expanded ? 280 : 140, maxHeight: expanded ? 500 : 260 }}
      />
    </div>
  );
};

export default EmailBodyEditor;
