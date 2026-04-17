import { useState } from 'react'
import { Search as SearchIcon, Loader2, FileCode, AlertCircle, SlidersHorizontal } from 'lucide-react'
import Editor from '@monaco-editor/react'
import axios from 'axios'
import { SearchRequest } from '../types/api'
import SearchFiltersModal from '../components/SearchFiltersModal'
import { ActiveFilterTags } from '../components/ActiveFilterTags'

interface SearchResult {
  snippet: {
    id: string
    file_path: string
    language: string
    code_type: string
    code: string
    start_line: number
    end_line: number
    metadata: {
      function_name?: string
      class_name?: string
    }
  }
  similarity_score: number
  explanation: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [filters, setFilters] = useState<Partial<SearchRequest>>({
    limit: 10,
    threshold: 0.7
  })
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    setLoading(true)
    setError('')
    setResults([])
    setSelectedCode(null)

    await performSearch(query)
  }

  const performSearch = async (searchQuery: string, searchFilters?: Partial<SearchRequest>) => {
    try {
      const activeFilters = searchFilters || filters
      const response = await axios.post('/api/search/', {
        query: searchQuery,
        ...activeFilters
      })

      setResults(response.data.results)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to search. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = (newFilters: Partial<SearchRequest>) => {
    setFilters(newFilters)
    setIsFiltersModalOpen(false)

    // Trigger search with new filters if we have a query
    if (query.trim()) {
      setLoading(true)
      setError('')
      setResults([])
      setSelectedCode(null)
      performSearch(query, newFilters)
    }
  }

  const handleRemoveFilter = (filterKey: keyof SearchRequest) => {
    const updatedFilters = { ...filters }
    delete updatedFilters[filterKey]

    // Restore defaults if needed
    if (filterKey === 'limit') {
      updatedFilters.limit = 10
    }
    if (filterKey === 'threshold') {
      updatedFilters.threshold = 0.7
    }

    setFilters(updatedFilters)

    // Trigger search with updated filters if we have a query
    if (query.trim()) {
      setLoading(true)
      setError('')
      setResults([])
      setSelectedCode(null)
      performSearch(query, updatedFilters)
    }
  }

  const handleClearAllFilters = () => {
    const defaultFilters = {
      limit: 10,
      threshold: 0.7
    }
    setFilters(defaultFilters)

    // Trigger search with default filters if we have a query
    if (query.trim()) {
      setLoading(true)
      setError('')
      setResults([])
      setSelectedCode(null)
      performSearch(query, defaultFilters)
    }
  }

  const getLanguage = (lang: string): string => {
    const map: Record<string, string> = {
      'python': 'python',
      'javascript': 'javascript',
      'typescript': 'typescript'
    }
    return map[lang] || 'plaintext'
  }

  const getActiveFilterCount = (): number => {
    return Object.entries(filters).filter(
      ([key, value]) =>
        key !== 'query' &&
        key !== 'limit' &&
        key !== 'threshold' &&
        value !== undefined &&
        value !== ''
    ).length
  }

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Semantic Code Search</h1>
        <p className="text-gray-400 text-lg">
          Ask questions about your codebase in natural language
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'how do I authenticate users' or 'function to validate email'"
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              disabled={loading}
            />
          </div>
          <button
            type="button"
            onClick={() => setIsFiltersModalOpen(true)}
            className="relative px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filters</span>
            {getActiveFilterCount() > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <SearchIcon className="h-5 w-5" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Active Filter Tags */}
      <ActiveFilterTags
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Error Message */}
      {error && (
        <div className="max-w-3xl mx-auto p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="text-center text-gray-400">
            Found {results.length} result{results.length !== 1 ? 's' : ''} in {(results[0].snippet.file_path.split('/').slice(0, -1).join('/') || 'root')}
          </div>

          <div className="grid gap-4">
            {results.map((result, index) => (
              <div
                key={result.snippet.id || index}
                className={`p-6 bg-gray-900 border rounded-lg transition-all cursor-pointer ${
                  selectedCode === result.snippet.code
                    ? 'border-primary-500 bg-gray-800'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
                onClick={() => setSelectedCode(result.snippet.code)}
              >
                {/* Result Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <FileCode className="h-5 w-5 text-primary-400" />
                    <div>
                      <div className="font-mono text-sm text-gray-300">
                        {result.snippet.file_path}
                      </div>
                      <div className="text-xs text-gray-500">
                        Lines {result.snippet.start_line}-{result.snippet.end_line}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-primary-500/20 rounded-full text-primary-300 text-sm font-medium">
                    {(result.similarity_score * 100).toFixed(0)}% match
                  </div>
                </div>

                {/* Explanation */}
                {result.explanation && (
                  <p className="text-gray-400 text-sm mb-4">{result.explanation}</p>
                )}

                {/* Metadata */}
                {(result.snippet.metadata.function_name || result.snippet.metadata.class_name) && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    {result.snippet.metadata.function_name && (
                      <span className="px-2 py-1 bg-gray-800 rounded">
                        function: {result.snippet.metadata.function_name}
                      </span>
                    )}
                    {result.snippet.metadata.class_name && (
                      <span className="px-2 py-1 bg-gray-800 rounded">
                        class: {result.snippet.metadata.class_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && results.length === 0 && !error && query && (
        <div className="text-center text-gray-500 py-12">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No results found. Try rephrasing your query.</p>
        </div>
      )}

      {/* Code Preview */}
      {selectedCode && (
        <div className="fixed bottom-0 right-0 w-full md:w-1/2 h-96 bg-gray-900 border-t border-l border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <span className="text-sm font-medium text-gray-300">Code Preview</span>
            <button
              onClick={() => setSelectedCode(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <Editor
            height="calc(100% - 48px)"
            language={getLanguage(
              results.find((r) => r.snippet.code === selectedCode)?.snippet.language ||
              'plaintext'
            )}
            value={selectedCode}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false
            }}
          />
        </div>
      )}

      {/* Filters Modal */}
      <SearchFiltersModal
        isOpen={isFiltersModalOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleClearAllFilters}
        onClose={() => setIsFiltersModalOpen(false)}
      />
    </div>
  )
}
