import { createContext, useContext } from 'react'

// ─── ThemeContext ──────────────────────────────────────────────────────────────
// Fornece: { T, dark, setDark }
export const ThemeContext = createContext(null)
export function useTheme() { return useContext(ThemeContext) }

// ─── AuthContext ───────────────────────────────────────────────────────────────
// Fornece: { user, setUser, token, setToken, api }
export const AuthContext = createContext(null)
export function useAuth() { return useContext(AuthContext) }
