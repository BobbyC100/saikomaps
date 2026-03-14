/**
 * Action Bar - Decision buttons with keyboard shortcuts
 */

'use client';

interface ActionBarProps {
  onMerge: () => void;
  onDifferent: () => void;
  onSkip: () => void;
  onFlag: () => void;
  onClose?: () => void;
}

export function ActionBar({ onMerge, onDifferent, onSkip, onFlag }: ActionBarProps) {
  return (
    <div className="border-t border-gray-200 bg-white px-8 py-6">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
        
        {/* Primary actions */}
        <button
          onClick={onMerge}
          className="
            flex items-center gap-3 px-8 py-4
            bg-green-600 hover:bg-green-700
            text-white font-semibold rounded-lg
            transition-colors shadow-sm
          "
        >
          <span>Same Place</span>
          <kbd className="text-[10px] bg-green-700 px-2 py-1 rounded font-mono">M</kbd>
        </button>
        
        <button
          onClick={onDifferent}
          className="
            flex items-center gap-3 px-8 py-4
            bg-gray-200 hover:bg-gray-300
            text-gray-700 font-semibold rounded-lg
            transition-colors shadow-sm
          "
        >
          <span>Different</span>
          <kbd className="text-[10px] bg-gray-300 px-2 py-1 rounded font-mono">D</kbd>
        </button>
        
        {/* Secondary actions */}
        <div className="w-px h-10 bg-gray-200 mx-2" />
        
        <button
          onClick={onSkip}
          className="
            flex items-center gap-2 px-6 py-4
            text-gray-500 hover:text-gray-700
            transition-colors
          "
        >
          <span>Skip</span>
          <kbd className="text-[10px] bg-gray-100 px-2 py-1 rounded font-mono">S</kbd>
        </button>
        
        <button
          onClick={onFlag}
          className="
            flex items-center gap-2 px-6 py-4
            text-orange-600 hover:text-orange-700
            transition-colors
          "
        >
          <span>Flag</span>
          <kbd className="text-[10px] bg-orange-100 px-2 py-1 rounded font-mono">F</kbd>
        </button>
        
      </div>
      
      {/* Keyboard hint */}
      <p className="text-center text-xs text-gray-400 mt-3">
        Navigate: <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">←</kbd> <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">→</kbd> or <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">P</kbd> <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">N</kbd>
      </p>
    </div>
  );
}
