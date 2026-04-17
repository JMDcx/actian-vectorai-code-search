import axios from 'axios'
import type {
  SearchRequest,
  SearchResponse,
  IndexRequest,
  IndexResponse
} from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const searchApi = {
  search: async (request: SearchRequest): Promise<SearchResponse> => {
    const response = await api.post<SearchResponse>('/api/search/', request)
    return response.data
  }
}

export const indexApi = {
  index: async (request: IndexRequest): Promise<IndexResponse> => {
    const response = await api.post<IndexResponse>('/api/index/', request)
    return response.data
  }
}

export const healthApi = {
  check: async (): Promise<{ status: string; vectorai_connected: boolean }> => {
    const response = await api.get('/health')
    return response.data
  }
}
