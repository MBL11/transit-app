/**
 * usePagination Hook
 * Provides pagination logic for large lists
 */

import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginationResult<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  goToPage: (page: number) => void;
}

export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { pageSize = 20, initialPage = 1 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const hasMore = currentPage < totalPages;

  const loadMore = () => {
    if (hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const reset = () => {
    setCurrentPage(initialPage);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    currentPage,
    totalPages,
    paginatedData,
    hasMore,
    loadMore,
    reset,
    goToPage,
  };
}
