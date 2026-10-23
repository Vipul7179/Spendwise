'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EyeIcon, EditIcon, ImageUploadIcon } from './EditorIcons';

interface RichBlogEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichBlogEditor({
  value,
  onChange,
  placeholder = 'Write your article story in Markdown or HTML...',
  minHeight = 360,
}: RichBlogEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'split'>('write');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-switch away from 'split' on narrow screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && activeTab === 'split') {
        setActiveTab('write');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  // Insert markdown snippet at current cursor or selection
  const insertText = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || defaultText;

    const replacement = `${before}${selectedText}${after}`;
    const newValue = currentText.substring(0, start) + replacement + currentText.substring(end);

    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 10);
  };

  // Handle direct image upload inside the editor
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be selected again
    e.target.value = '';

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image exceeds the 3 MB bucket limit.');
      setTimeout(() => setUploadError(null), 4000);
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/blogs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      const alt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      insertText(`\n![${alt}](`, `${data.url})\n`, '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Word count & Reading time calculation
  const cleanText = value.replace(/<[^>]*>/g, ' ').replace(/[#*`~_>\-[\]()]/g, '');
  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const chars = value.length;
  const readingTimeMin = Math.max(1, Math.ceil(words / 200));

  // Basic markdown to clean HTML parser for live preview
  const renderPreviewHtml = (markdown: string): string => {
    if (!markdown) return '<p style="color: var(--text-muted); font-style: italic;">No content written yet. Use the Write tab to start drafting your article.</p>';

    // Escape raw HTML tags while preserving markdown images and links
    let html = markdown
      // Code blocks
      .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Bold & Italic
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      // Images
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<figure style="margin: 1.5rem 0;"><img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--border);" /><figcaption style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem; text-align: center;">$1</figcaption></figure>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: underline;">$1</a>')
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--border); margin: 1.5rem 0;" />')
      // Paragraphs
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br />');

    return `<div class="article-preview-body" style="line-height: 1.7; font-size: 0.95rem; color: var(--text-main);">${html}</div>`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-card)',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Mode Tabs: Write / Preview / Split */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-card)', borderRadius: 6, padding: 2, border: '1px solid var(--border-light)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            style={{
              background: activeTab === 'write' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'write' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 4,
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <EditIcon size={13} />
            <span>Write</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            style={{
              background: activeTab === 'preview' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'preview' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 4,
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <EyeIcon size={13} />
            <span>Preview</span>
          </button>

          {/* Split View available on Desktop */}
          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className="hide-mobile"
            style={{
              background: activeTab === 'split' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'split' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 4,
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Side-by-side editing and preview"
          >
            Split View
          </button>
        </div>

        {/* Formatting Buttons Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => insertText('# ', '', 'Heading 1')}
            title="Heading 1"
            className="editor-btn"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertText('## ', '', 'Heading 2')}
            title="Heading 2"
            className="editor-btn"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertText('### ', '', 'Heading 3')}
            title="Heading 3"
            className="editor-btn"
          >
            H3
          </button>

          <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.2rem' }} />

          <button
            type="button"
            onClick={() => insertText('**', '**', 'bold text')}
            title="Bold (Ctrl+B)"
            className="editor-btn"
            style={{ fontWeight: 700 }}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*', 'italic text')}
            title="Italic"
            className="editor-btn"
            style={{ fontStyle: 'italic' }}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertText('~~', '~~', 'strikethrough')}
            title="Strikethrough"
            className="editor-btn"
            style={{ textDecoration: 'line-through' }}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => insertText('`', '`', 'code')}
            title="Inline Code"
            className="editor-btn"
            style={{ fontFamily: 'monospace' }}
          >
            &lt;/&gt;
          </button>

          <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.2rem' }} />

          <button
            type="button"
            onClick={() => insertText('- ', '', 'Bullet item')}
            title="Bullet List"
            className="editor-btn"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => insertText('1. ', '', 'Numbered item')}
            title="Numbered List"
            className="editor-btn"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => insertText('> ', '', 'Quote text')}
            title="Blockquote"
            className="editor-btn"
          >
            &ldquo; Quote
          </button>

          <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 0.2rem' }} />

          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter link URL (e.g. https://hisbo.in):', 'https://');
              if (url) {
                insertText('[', `](${url})`, 'link text');
              }
            }}
            title="Insert Link"
            className="editor-btn"
          >
            Link
          </button>

          {/* Direct Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            title="Upload image from computer and insert markdown"
            className="editor-btn"
            style={{ color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <ImageUploadIcon size={14} />
            <span>{isUploadingImage ? 'Uploading...' : 'Insert Image'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleEditorImageUpload}
            accept="image/jpeg,image/png,image/webp,image/avif"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {uploadError && (
        <div style={{ padding: '0.4rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.75rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {uploadError}
        </div>
      )}

      {/* 2. Editor Body / Preview Area */}
      <div style={{ display: 'flex', minHeight, position: 'relative' }}>
        {/* Write Pane */}
        {(activeTab === 'write' || activeTab === 'split') && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                flex: 1,
                minHeight,
                padding: '1rem',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text-main)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                resize: 'vertical',
              }}
              onKeyDown={(e) => {
                // Tab indentation support
                if (e.key === 'Tab') {
                  e.preventDefault();
                  insertText('  ', '', '');
                }
                // Ctrl+B bold shortcut
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                  e.preventDefault();
                  insertText('**', '**', 'bold text');
                }
                // Ctrl+I italic shortcut
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
                  e.preventDefault();
                  insertText('*', '*', 'italic text');
                }
              }}
            />
          </div>
        )}

        {/* Divider for Split View */}
        {activeTab === 'split' && (
          <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
        )}

        {/* Preview Pane */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div
            style={{
              flex: 1,
              padding: '1rem 1.25rem',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              maxHeight: 600,
            }}
            dangerouslySetInnerHTML={{ __html: renderPreviewHtml(value) }}
          />
        )}
      </div>

      {/* 3. Footer Stats Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-light)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span><strong>{words.toLocaleString()}</strong> words</span>
          <span><strong>{chars.toLocaleString()}</strong> characters</span>
          <span>~<strong>{readingTimeMin}</strong> min read</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Markdown &amp; HTML supported
        </div>
      </div>

      <style jsx>{`
        .editor-btn {
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          padding: 0.2rem 0.45rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
        }
        .editor-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-main);
          border-color: var(--border);
        }
        .editor-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 1023px) {
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

