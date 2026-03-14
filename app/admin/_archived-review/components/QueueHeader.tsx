/**
 * Queue Header - Stats and progress
 */

'use client';

interface QueueHeaderProps {
  pending: number;
  resolved: number;
  streak: number;
}

export function QueueHeader({ pending, resolved, streak }: QueueHeaderProps) {
  return (
    <div className="border-b bg-white px-8 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Resolve entity matches to improve data quality
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{pending}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Pending</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{resolved}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Resolved</div>
          </div>
          
          {streak > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{streak} 🔥</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Streak</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
