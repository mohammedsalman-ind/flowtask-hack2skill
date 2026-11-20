import axios from 'axios';
import api from './client';

export async function workspaceRequest<T>(path = '', method = 'GET', data?: unknown): Promise<T> {
  try {
    const response = await api.request<{ data: T }>({
      url: '/api/workspaces' + path, method, data, timeout: data instanceof FormData ? 120_000 : 80_000,
      ...(data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    });
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) throw new Error(error.response?.data?.error || 'Could not reach the workspace API.');
    throw error;
  }
}
