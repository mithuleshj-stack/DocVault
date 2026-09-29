import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible((prev) => !prev);
        }}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-help"
      >
        <Info className="w-3 h-3 stroke-[2.2]" />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 w-60 sm:w-64 p-2.5 text-xs text-slate-200 bg-slate-900/95 dark:bg-slate-950 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-sm pointer-events-none transition-all duration-150 leading-relaxed font-normal text-left ${positionClasses}`}
        >
          {content}
          {/* Subtle pointer notch */}
          <div
            className={`absolute w-2 h-2 bg-slate-900 dark:bg-slate-950 border-slate-700/80 transform rotate-45 ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b'
                : position === 'bottom'
                ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t'
                : position === 'left'
                ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r'
                : 'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l'
            }`}
          />
        </div>
      )}
    </div>
  );
};
