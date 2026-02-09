"use client";

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ProductIntroModalProps {
  productName: string;
  html: string;
  onClose: () => void;
}

export function ProductIntroModal({ productName, html, onClose }: ProductIntroModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    // Handle escape key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white truncate pr-4">{productName}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-700/50 rounded-lg flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div
            ref={contentRef}
            className="product-modal-content px-6 py-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
