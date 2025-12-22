/**
 * API Endpoints
 * 
 * Centralized API endpoint constants
 */

const API_BASE = '/api';

export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE}/auth/local`,
    REGISTER: `${API_BASE}/auth/local/register`,
    FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
    SEND_EMAIL_CONFIRMATION: `${API_BASE}/auth/send-email-confirmation`
  },
  
  // Users
  USERS: {
    ME: `${API_BASE}/users/me`,
    BY_ID: (id: number | string) => `${API_BASE}/users/${id}`
  },
  
  // Items
  ITEMS: {
    LIST: `${API_BASE}/items`,
    BY_ID: (id: string) => `${API_BASE}/items/${id}`,
    PREVIEW: (id: string) => `${API_BASE}/previewer/item/${id}`,
    DOWNLOAD: (hash: string) => `${API_BASE}/items/download/${hash}`
  },
  
  // Collections
  COLLECTIONS: {
    LIST: `${API_BASE}/collections`,
    BY_ID: (id: number | string) => `${API_BASE}/collections/${id}`
  },
  
  // Categories
  CATEGORIES: {
    LIST: `${API_BASE}/categories`,
    BY_ID: (id: number | string) => `${API_BASE}/categories/${id}`
  },
  
  // Tags
  TAGS: {
    LIST: `${API_BASE}/tags`,
    BY_ID: (id: number | string) => `${API_BASE}/tags/${id}`
  },
  
  // Pages
  PAGES: {
    BY_SLUG: (slug: string) => `${API_BASE}/pages/${slug}`
  }
} as const;

