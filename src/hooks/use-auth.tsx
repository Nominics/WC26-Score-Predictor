"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: any | null
  login: (email: string) => void
  logout: () => void
  updateDisplayName: (name: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedUser = localStorage.getItem("wc26_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = (email: string) => {
    const newUser = { id: Math.random().toString(36).substr(2, 9), email, displayName: "" }
    setUser(newUser)
    localStorage.setItem("wc26_user", JSON.stringify(newUser))
    router.push("/onboarding")
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("wc26_user")
    router.push("/")
  }

  const updateDisplayName = (name: string) => {
    const updated = { ...user, displayName: name }
    setUser(updated)
    localStorage.setItem("wc26_user", JSON.stringify(updated))
    router.push("/dashboard")
  }

  if (loading) return null

  return (
    <AuthContext.Provider value={{ user, login, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
