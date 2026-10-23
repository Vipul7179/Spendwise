'use client';

import React, { useState, useRef } from 'react';
import { ImageIcon, XIcon, RefreshIcon, CheckCircleIcon, AlertTriangleIcon } from '@/components/icons';

interface ImageUploaderProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  uploadEndpoint: string;
  helperText?: string;
  required?: boolean;
  aspectRatio?: 'banner' | 'blog' | 'square' | 'auto';
  maxSizeMb?: number;
}

export function ImageUploader({
  label = 'Image',
  value,
  onChange,
  uploadEndpoint,
  helperText,
  required = false,
  aspectRatio = 'auto',
  maxSizeMb = 3,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [imgError, setImgError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
    // Reset file input so user can pick the same file again if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    setErrorMessage(null);
    setImgError(false);

    // Client-side quick validation
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowedMime.includes(file.type)) {
      setErrorMessage(`Format "${file.type || 'unknown'}" is not supported. Please select JPEG, PNG, WebP, or AVIF.`);
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setErrorMessage(`Image is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is ${maxSizeMb} MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(45);
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image to storage.');
      }

      setUploadProgress(100);
      onChange(data.publicUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error uploading image.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = () => {
    onChange('');
    setImgError(false);
    setErrorMessage(null);
  };

  const heightStyle = aspectRatio === 'banner' ? 180 : aspectRatio === 'blog' ? 220 : 180;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
      {/* Header with Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {label} {required && <span style={{ color: 'var(--accent)' }}>*</span>}
        </label>
        <button
          type="button"
          onClick={() => setManualMode(!manualMode)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '0.75rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '2px 4px',
            textDecoration: 'underline',
          }}
        >
          {manualMode ? 'Switch to File Upload' : 'Enter URL manually'}
        </button>
      </div>

      {/* Manual URL Input Fallback */}
      {manualMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="url"
            value={value}
            onChange={(e) => {
              setImgError(false);
              onChange(e.target.value);
            }}
            placeholder="https://...supabase.co/storage/v1/object/public/banners/image.webp"
            className="input-field"
            required={required}
          />
          {value && !imgError && (
            <div
              style={{
                position: 'relative',
                maxHeight: 120,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Preview"
                onError={() => setImgError(true)}
                style={{ width: '100%', height: 120, objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Active Preview Mode */}
          {value && !isUploading ? (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                background: 'var(--bg-secondary)',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: heightStyle,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {!imgError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={value}
                    alt="Preview"
                    onError={() => setImgError(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: aspectRatio === 'banner' ? 'cover' : 'contain',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                    <AlertTriangleIcon size={24} style={{ color: 'var(--warning)' }} />
                    <span style={{ fontSize: '0.75rem' }}>Failed to load image preview</span>
                  </div>
                )}
              </div>

              {/* URL & Actions Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '65%',
                  }}
                  title={value}
                >
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Active:</span> {value.split('/').pop()}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                    style={{ minHeight: 34, fontSize: '0.75rem' }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="btn btn-danger btn-sm"
                    style={{ minHeight: 34, fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    title="Remove Image"
                  >
                    <XIcon size={14} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Dropzone / Upload State */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
                backgroundColor: isDragging ? 'var(--accent-muted)' : 'var(--bg-input)',
                borderRadius: 10,
                padding: '1.75rem 1rem',
                textAlign: 'center',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                minHeight: 140,
              }}
            >
              {isUploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 280 }}>
                  <RefreshIcon size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 500 }}>
                    Uploading to Supabase Storage...
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: 4,
                      background: 'var(--border)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDragging ? 'var(--accent)' : 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <ImageIcon size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Click to upload
                    </span>{' '}
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>or drag and drop</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    PNG, JPG, WebP, or AVIF (max {maxSizeMb} MB)
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.75rem',
          }}
        >
          <AlertTriangleIcon size={14} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <XIcon size={12} />
          </button>
        </div>
      )}

      {/* Helper text */}
      {!errorMessage && helperText && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{helperText}</span>
      )}
    </div>
  );
}

