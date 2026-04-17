// frontend/src/components/GitHubImportSection.tsx
import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGitHubImport } from '../hooks/useGitHubImport'
import ImportProgressBar from './ImportProgressBar'
import { Github, ArrowRight } from 'lucide-react'

export default function GitHubImportSection() {
  const [url, setUrl] = useState('')
  const { state, startImport, reset } = useGitHubImport()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      await startImport(url)
    } catch (err) {
      console.error('Failed to start import:', err)
    }
  }

  const handleReset = () => {
    setUrl('')
    reset()
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-primary-500/10 rounded-lg">
          <Github className="h-6 w-6 text-primary-400" />
        </div>
        <h2 className="text-xl font-semibold">导入 GitHub 仓库</h2>
      </div>

      {state.status === 'idle' || state.status === 'error' ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                支持公开仓库，最大 50MB 或 500 个文件
              </p>
            </div>

            {state.error && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                <p className="text-red-300 text-sm">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!url.trim()}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <span>开始导入</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </>
      ) : state.status === 'importing' ? (
        <ImportProgressBar state={state} />
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
            <p className="text-green-300">
              ✅ 导入完成！共索引 {state.stats?.total_snippets || 0} 个代码片段
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/search"
              className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium text-center transition-colors"
            >
              开始搜索
            </Link>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              导入另一个
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
