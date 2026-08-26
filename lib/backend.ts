export const BACKEND_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || '/api')
  : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000/api');
