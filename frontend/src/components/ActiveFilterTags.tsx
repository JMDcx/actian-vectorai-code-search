import React from 'react';
import { SearchRequest } from '../types/api';

interface ActiveFilterTagsProps {
  filters: Partial<SearchRequest>;
  onRemoveFilter: (key: keyof SearchRequest) => void;
  onClearAll: () => void;
}

export const ActiveFilterTags: React.FC<ActiveFilterTagsProps> = ({
  filters,
  onRemoveFilter,
  onClearAll,
}) => {
  // Filter out 'query' and undefined values
  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => key !== 'query' && value !== undefined && value !== ''
  );

  // Return null if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  // Format filter key to user-friendly label
  const formatFilterLabel = (key: string, value: any): string => {
    switch (key) {
      case 'language':
        return `Language: ${value}`;
      case 'code_type':
        return `Type: ${value}`;
      case 'file_path_pattern':
        return `Path: ${value}`;
      case 'threshold':
        return `Min Sim: ${Number(value).toFixed(2)}`;
      case 'limit':
        return `Max: ${value}`;
      case 'sort_by':
        return `Sort: ${value}`;
      default:
        return `${key}: ${value}`;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {activeFilters.map(([key, value]) => (
        <button
          key={key}
          onClick={() => onRemoveFilter(key as keyof SearchRequest)}
          className="inline-flex items-center gap-1 px-3 py-1 text-sm rounded-md border bg-primary-600/20 border-primary-600/30 text-primary-400 hover:bg-primary-600/30 transition-colors cursor-pointer"
          aria-label={`Remove ${key} filter`}
        >
          <span>{formatFilterLabel(key, value)}</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="px-3 py-1 text-sm rounded-md border border-gray-600 text-gray-400 hover:bg-gray-700/50 transition-colors cursor-pointer"
          aria-label="Clear all filters"
        >
          Clear All
        </button>
      )}
    </div>
  );
};
