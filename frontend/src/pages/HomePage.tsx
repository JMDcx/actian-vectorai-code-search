import { Code2, Search, Brain, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import GitHubImportSection from '../components/GitHubImportSection'

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="flex justify-center">
          <div className="p-4 bg-primary-500/10 rounded-2xl">
            <Code2 className="h-16 w-16 text-primary-400" />
          </div>
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Understand Your Codebase{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
            Like Never Before
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          AI-powered semantic code search that comprehends your codebase like a senior developer.
          Ask questions in natural language and get instant, relevant code snippets.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/search"
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Search className="h-5 w-5" />
            <span>Try Semantic Search</span>
          </Link>
        </div>
      </section>

      {/* GitHub Import Section */}
      <section>
        <GitHubImportSection />
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
          <div className="p-3 bg-primary-500/10 rounded-lg w-fit">
            <Brain className="h-6 w-6 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold">Semantic Understanding</h3>
          <p className="text-gray-400">
            Powered by CodeBERT and sentence transformers to understand code intent,
            not just syntax.
          </p>
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
          <div className="p-3 bg-primary-500/10 rounded-lg w-fit">
            <Search className="h-6 w-6 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold">Natural Language Queries</h3>
          <p className="text-gray-400">
            Ask questions like "how do I authenticate users" and get relevant code
            snippets instantly.
          </p>
        </div>

        <div className="p-6 bg-gray-900 rounded-xl border border-gray-800 space-y-4">
          <div className="p-3 bg-primary-500/10 rounded-lg w-fit">
            <Zap className="h-6 w-6 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold">Lightning Fast</h3>
          <p className="text-gray-400">
            Vector similarity search powered by Actian VectorAI DB for millisecond
            query responses.
          </p>
        </div>
      </section>

      {/* Supported Languages */}
      <section className="bg-gray-900 rounded-xl border border-gray-800 p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Supported Languages</h2>
        <div className="flex justify-center gap-8 flex-wrap">
          {['Python', 'JavaScript', 'TypeScript'].map((lang) => (
            <div key={lang} className="text-center">
              <div className="px-6 py-3 bg-gray-800 rounded-lg font-mono text-sm">
                {lang}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold text-lg">Index Your Codebase</h3>
            <p className="text-gray-400 text-sm">
              Point the tool at your project directory. It parses all Python, JavaScript,
              and TypeScript files.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold text-lg">Generate Embeddings</h3>
            <p className="text-gray-400 text-sm">
              CodeBERT transforms each code snippet into a semantic vector that captures
              its meaning and intent.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold text-lg">Search & Discover</h3>
            <p className="text-gray-400 text-sm">
              Ask questions in plain English. Vector similarity search finds the most
              relevant code snippets.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
