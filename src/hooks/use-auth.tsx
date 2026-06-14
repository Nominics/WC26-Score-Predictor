
"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any | null
  stats: { points: number; rank: number } | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [stats, setStats] = useState<{ points: number; rank: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(isSupabaseConfigured())

  const router = useRouter()
  const supabase = createClient()

  const fetchUserData = useCallback(
    async (userId: string) => {
      if (!isConfigured) return

      try {
        // Fetch Profile and Leaderboard stats in parallel
        const [profileRes, statsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("leaderboard").select("total_points, rank").eq("user_id", userId).maybeSingle()
        ])

        if (!profileRes.error) setProfile(profileRes.data)
        if (!statsRes.error && statsRes.data) {
          setStats({
            points: statsRes.data.total_points || 0,
            rank: statsRes.data.rank || 0
          })
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      }
    },
    [supabase, isConfigured]
  )

  useEffect(() => {
    let mounted = true

    if (!isConfigured) {
      setLoading(false)
      return
    }

    // Single source of truth for auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      const currentUser = session?.user || null
      setUser(currentUser)

      if (currentUser) {
        // Load profile data but don't necessarily block 'loading' state if we already have the user
        fetchUserData(currentUser.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setProfile(null)
        setStats(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserData, isConfigured])

  const login = async (email: string, password: string) => {
    if (!isConfigured) {
      throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
    }
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      throw error
    }

    router.replace("/dashboard")
  }

  const register = async (email: string, password: string, name: string) => {
    if (!isConfigured) {
      throw new Error("Supabase is not configured.")
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
      },
    })

    if (error) {
      setLoading(false)
      throw error
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: name,
        updated_at: new Date().toISOString(),
      })
      await fetchUserData(data.user.id)
    }

    router.replace("/dashboard")
  }

  const logout = async () => {
    if (isConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
    setStats(null)
    router.replace("/")
  }

  const updateDisplayName = async (name: string) => {
    if (!user || !isConfigured) return

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    })

    if (error) throw error
    await fetchUserData(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        stats,
        loading,
        login,
        register,
        logout,
        updateDisplayName,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
