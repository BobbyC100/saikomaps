/**
 * Review Queue Main Component
 * 2-second decision loop for entity resolution
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ComparisonCard } from './ComparisonCard';
import { ActionBar } from './ActionBar';
import { QueueHeader } from './QueueHeader';
import type { HydratedReviewItem } from '@/lib/review-queue';

export function ReviewQueue() {
  const [queue, setQueue] = useState<HydratedReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  
  const currentItem = queue[currentIndex];
  
  // Fetch queue
  useEffect(() => {
    fetchQueue();
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'm':
          handleMerge();
          break;
        case 'd':
          handleDifferent();
          break;
        case 's':
          handleSkip();
          break;
        case 'f':
          handleFlag();
          break;
        case 'n':
        case 'arrowright':
          goNext();
          break;
        case 'p':
        case 'arrowleft':
          goPrevious();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, queue]);
  
  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/review-queue?status=pending&limit=20');
      const data = await res.json();
      setQueue(data.items);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Optimistic updates - UI moves immediately, API syncs in background
  const handleMerge = useCallback(async () => {
    if (!currentItem) return;
    
    const itemToResolve = currentItem;
    goNext();
    incrementStreak();
    
    try {
      await fetch(`/api/admin/review-queue/${itemToResolve.queue_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'merged' })
      });
    } catch (error) {
      console.error('Failed to save merge:', error);
    }
  }, [currentItem, currentIndex]);
  
  const handleDifferent = useCallback(async () => {
    if (!currentItem) return;
    
    const itemToResolve = currentItem;
    goNext();
    incrementStreak();
    
    try {
      await fetch(`/api/admin/review-queue/${itemToResolve.queue_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'kept_separate' })
      });
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }, [currentItem, currentIndex]);
  
  const handleSkip = useCallback(async () => {
    if (!currentItem) return;
    
    const itemToSkip = currentItem;
    goNext();
    
    try {
      await fetch(`/api/admin/review-queue/${itemToSkip.queue_id}/skip`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to skip:', error);
    }
  }, [currentItem, currentIndex]);
  
  const handleFlag = useCallback(async () => {
    if (!currentItem) return;
    
    const itemToFlag = currentItem;
    goNext();
    
    try {
      await fetch(`/api/admin/review-queue/${itemToFlag.queue_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'flagged' })
      });
    } catch (error) {
      console.error('Failed to flag:', error);
    }
  }, [currentItem, currentIndex]);
  
  const goNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };
  
  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  const incrementStreak = () => {
    setStreak(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading review queue...</p>
      </div>
    );
  }
  
  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-2xl mb-2">🎉 Queue empty!</p>
        <p className="text-sm text-gray-500">All items have been reviewed.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <QueueHeader 
        pending={queue.length - currentIndex}
        resolved={currentIndex}
        streak={streak}
      />
      
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="w-full max-w-4xl">
          <ComparisonCard
            key={currentItem.queue_id}
            recordA={currentItem.recordA}
            recordB={currentItem.recordB!}
            matchConfidence={currentItem.match_confidence || 0}
            conflictingFields={currentItem.conflicting_fields || {}}
          />
        </div>
      </div>
      
      <ActionBar
        onMerge={handleMerge}
        onDifferent={handleDifferent}
        onSkip={handleSkip}
        onFlag={handleFlag}
      />
    </div>
  );
}
