import { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { SearchRequest } from '../types/api'

interface SearchFiltersModalProps {
  isOpen: boolean
  filters: Partial<SearchRequest>
  onApply: (filters: Partial<SearchRequest>) => void
  onReset: () => void
  onClose: () => void
}

const LANGUAGE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
]

const CODE_TYPE_OPTIONS = [
  { value: 'function', label: 'Function' },
  { value: 'class', label: 'Class' },
  { value: 'import', label: 'Import' },
]

const SORT_BY_OPTIONS = [
  { value: 'similarity', label: 'Similarity' },
  { value: 'file_path', label: 'File Path' },
  { value: 'complexity', label: 'Complexity' },
]

export default function SearchFiltersModal({
  isOpen,
  filters,
  onApply,
  onReset,
  onClose,
}: SearchFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<{
    language?: 'python' | 'javascript' | 'typescript'
    code_type?: 'function' | 'class' | 'import'
    file_path_pattern?: string
    threshold?: number
    limit?: number
    sort_by?: 'similarity' | 'file_path' | 'complexity'
  }>({
    language: filters.language,
    code_type: filters.code_type,
    file_path_pattern: filters.file_path_pattern,
    threshold: filters.threshold || 0.5,
    limit: filters.limit || 10,
    sort_by: filters.sort_by || 'similarity',
  })

  if (!isOpen) return null

  const handleApply = () => {
    const cleanedFilters: Partial<SearchRequest> = {
      ...localFilters,
      language: localFilters.language || undefined,
      code_type: localFilters.code_type,
      file_path_pattern: localFilters.file_path_pattern || undefined,
      threshold: localFilters.threshold,
      limit: localFilters.limit,
      sort_by: localFilters.sort_by,
    }
    onApply(cleanedFilters)
    onClose()
  }

  const handleReset = () => {
    const defaultFilters = {
      language: undefined,
      code_type: undefined,
      file_path_pattern: undefined,
      threshold: 0.5,
      limit: 10,
      sort_by: 'similarity' as const,
    }
    setLocalFilters(defaultFilters)
    onReset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative bg-gray-900 rounded-lg shadow-xl border border-gray-700 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Search Filters</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Fields */}
        <div className="p-6 space-y-6">
          {/* Language Dropdown */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-2">
              Language
            </label>
            <select
              id="language"
              value={localFilters.language || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  language: e.target.value ? (e.target.value as any) : undefined,
                })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Code Type Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Code Type
            </label>
            <div className="space-y-2">
              {CODE_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="code_type"
                    value={option.value}
                    checked={localFilters.code_type === option.value}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        code_type: e.target.value as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-700 focus:ring-2 focus:ring-primary-600"
                  />
                  <span className="text-gray-300">{option.label}</span>
                </label>
              ))}
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="code_type"
                  value=""
                  checked={!localFilters.code_type}
                  onChange={() =>
                    setLocalFilters({ ...localFilters, code_type: undefined })
                  }
                  className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-700 focus:ring-2 focus:ring-primary-600"
                />
                <span className="text-gray-300">All</span>
              </label>
            </div>
          </div>

          {/* File Path Pattern */}
          <div>
            <label htmlFor="file_path_pattern" className="block text-sm font-medium text-gray-300 mb-2">
              File Path Pattern
            </label>
            <input
              type="text"
              id="file_path_pattern"
              value={localFilters.file_path_pattern}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, file_path_pattern: e.target.value })
              }
              placeholder="e.g., src/**/*.ts"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">Supports wildcards: * and **</p>
          </div>

          {/* Min Similarity Slider */}
          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-300 mb-2">
              Min Similarity: {localFilters.threshold?.toFixed(2)}
            </label>
            <input
              type="range"
              id="threshold"
              min="0"
              max="1"
              step="0.05"
              value={localFilters.threshold}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, threshold: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.0</span>
              <span>1.0</span>
            </div>
          </div>

          {/* Max Results Slider */}
          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-gray-300 mb-2">
              Max Results: {localFilters.limit}
            </label>
            <input
              type="range"
              id="limit"
              min="10"
              max="100"
              step="10"
              value={localFilters.limit}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, limit: parseInt(e.target.value) })
              }
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10</span>
              <span>100</span>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <label htmlFor="sort_by" className="block text-sm font-medium text-gray-300 mb-2">
              Sort By
            </label>
            <select
              id="sort_by"
              value={localFilters.sort_by}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, sort_by: e.target.value as any })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            >
              {SORT_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleApply}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
