'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  ExploreMap,
  ExploreFilters,
  ExplorePagination,
} from '@/types/explore';

interface UseExploreMapsReturn {
  maps: ExploreMap[];
  pagination: ExplorePagination | null;
  isLoading: boolean;
  error: string | null;
  filters: ExploreFilters;
  setFilters: React.Dispatch<React.SetStateAction<ExploreFilters>>;
  loadMore: () => void;
  refresh: () => void;
}

export function useExploreMaps(
  initialFilters?: ExploreFilters
): UseExploreMapsReturn {
  const [maps, setMaps] = useState<ExploreMap[]>([]);
  const [pagination, setPagination] = useState<ExplorePagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExploreFilters>(initialFilters || {});

  const fetchMaps = useCallback(
    async (offset = 0, append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
        if (filters.category) params.set('category', filters.category);
        if (filters.sort) params.set('sort', filters.sort);
        params.set('limit', '20');
        params.set('offset', String(offset));

        const res = await fetch(`/api/maps/explore?${params}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch maps');
        }

        const { maps: newMaps, pagination: newPagination } = json.data;

        setMaps((prev) => (append ? [...prev, ...newMaps] : newMaps));
        setPagination(newPagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchMaps(0, false);
  }, [fetchMaps]);

  const loadMore = useCallback(() => {
    if (pagination?.hasMore && !isLoading) {
      fetchMaps(pagination.offset + pagination.limit, true);
    }
  }, [pagination, isLoading, fetchMaps]);

  const refresh = useCallback(() => {
    fetchMaps(0, false);
  }, [fetchMaps]);

  return {
    maps,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    loadMore,
    refresh,
  };
}
