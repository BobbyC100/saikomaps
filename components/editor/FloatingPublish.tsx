'use client';

interface FloatingPublishProps {
  saveStatus: 'idle' | 'saving' | 'saved';
  canPublish: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  isPublishing?: boolean;
}

export default function FloatingPublish({
  saveStatus,
  canPublish,
  onSaveDraft,
  onPublish,
  isPublishing = false,
}: FloatingPublishProps) {
  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2"
    >
      {!canPublish && (
        <p className="text-xs text-[#6B6B6B] mb-0.5">
          Add a spot to get started
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          className="px-5 py-2.5 text-sm font-medium text-[#2D2D2D] rounded-xl transition-colors"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #efe9e3',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'idle' && 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: canPublish && !isPublishing ? '#D4785C' : '#9A9A9A',
            boxShadow: canPublish && !isPublishing ? '0 2px 12px rgba(212,120,92,0.3)' : 'none',
          }}
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
