'use client';

import React, { useEffect, useRef, KeyboardEvent } from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

// Simple focus trap implementation
const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey as any);

    return () => {
      container.removeEventListener('keydown', handleTabKey as any);
      // Restore focus to previous element when modal closes
      previousActiveElementRef.current?.focus();
    };
  }, [isActive]);

  return containerRef;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = 'Error',
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDarkMode = false,
}) => {
  const containerRef = useFocusTrap(open);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape as any);
    return () => document.removeEventListener('keydown', handleEscape as any);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
      style={{ backdropFilter: 'blur(2px)' }}
    >
      {/* Windows 95 Error Dialog Style */}
      <div
        ref={containerRef}
        className="relative flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{
          minWidth: 320,
          maxWidth: 400,
          backgroundColor: '#C0C0C0',
          border: '2px solid',
          borderTopColor: '#FFFFFF',
          borderLeftColor: '#FFFFFF',
          borderRightColor: '#808080',
          borderBottomColor: '#808080',
          boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)',
          fontFamily: 'MS Sans Serif, sans-serif',
        }}
      >
        {/* Title Bar - Windows 95 style */}
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{
            backgroundColor: '#000080',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 'bold',
            minHeight: '18px',
          }}
        >
          <span>{title}</span>
          <button
            onClick={onCancel}
            className="ml-2 flex items-center justify-center"
            style={{
              width: '16px',
              height: '14px',
              backgroundColor: '#C0C0C0',
              border: '1px solid',
              borderTopColor: '#FFFFFF',
              borderLeftColor: '#FFFFFF',
              borderRightColor: '#808080',
              borderBottomColor: '#808080',
              cursor: 'pointer',
              fontSize: '8px',
              lineHeight: '1',
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Icon + Message Area */}
        <div className="flex gap-3 p-4" style={{ backgroundColor: '#C0C0C0' }}>
          {/* Error Icon (Windows 95 style) */}
          <div
            className="flex-shrink-0"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#FFFFFF',
              border: '2px solid',
              borderTopColor: '#808080',
              borderLeftColor: '#808080',
              borderRightColor: '#FFFFFF',
              borderBottomColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ⚠️
          </div>

          {/* Message */}
          <p
            className="flex-1 text-sm leading-relaxed"
            style={{
              color: '#000000',
              fontSize: '11px',
              lineHeight: '1.4',
            }}
          >
            {message}
          </p>
        </div>

        {/* Button Bar */}
        <div
          className="flex justify-end gap-2 p-2"
          style={{
            backgroundColor: '#C0C0C0',
            borderTop: '1px solid #808080',
          }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-1 text-xs font-bold"
            style={{
              minWidth: '75px',
              backgroundColor: '#C0C0C0',
              border: '2px solid',
              borderTopColor: '#FFFFFF',
              borderLeftColor: '#FFFFFF',
              borderRightColor: '#808080',
              borderBottomColor: '#808080',
              cursor: 'pointer',
              color: '#000000',
              fontSize: '11px',
            }}
            onMouseDown={(e) => {
              // Inverted border on click (Windows 95 style)
              e.currentTarget.style.borderTopColor = '#808080';
              e.currentTarget.style.borderLeftColor = '#808080';
              e.currentTarget.style.borderRightColor = '#FFFFFF';
              e.currentTarget.style.borderBottomColor = '#FFFFFF';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.borderTopColor = '#FFFFFF';
              e.currentTarget.style.borderLeftColor = '#FFFFFF';
              e.currentTarget.style.borderRightColor = '#808080';
              e.currentTarget.style.borderBottomColor = '#808080';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderTopColor = '#FFFFFF';
              e.currentTarget.style.borderLeftColor = '#FFFFFF';
              e.currentTarget.style.borderRightColor = '#808080';
              e.currentTarget.style.borderBottomColor = '#808080';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1 text-xs font-bold"
            style={{
              minWidth: '75px',
              backgroundColor: '#C0C0C0',
              border: '2px solid',
              borderTopColor: '#FFFFFF',
              borderLeftColor: '#FFFFFF',
              borderRightColor: '#808080',
              borderBottomColor: '#808080',
              cursor: 'pointer',
              color: '#000000',
              fontSize: '11px',
            }}
            onMouseDown={(e) => {
              // Inverted border on click (Windows 95 style)
              e.currentTarget.style.borderTopColor = '#808080';
              e.currentTarget.style.borderLeftColor = '#808080';
              e.currentTarget.style.borderRightColor = '#FFFFFF';
              e.currentTarget.style.borderBottomColor = '#FFFFFF';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.borderTopColor = '#FFFFFF';
              e.currentTarget.style.borderLeftColor = '#FFFFFF';
              e.currentTarget.style.borderRightColor = '#808080';
              e.currentTarget.style.borderBottomColor = '#808080';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderTopColor = '#FFFFFF';
              e.currentTarget.style.borderLeftColor = '#FFFFFF';
              e.currentTarget.style.borderRightColor = '#808080';
              e.currentTarget.style.borderBottomColor = '#808080';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
