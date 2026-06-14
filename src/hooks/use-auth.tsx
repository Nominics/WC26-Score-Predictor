"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
  refreshStats: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [stats, setStats] = useState<{ points: number; rank: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle()

        if (error) {
          console.error("Error fetching profile:", error.message)
          setProfile(null)
          return
        }

        setProfile(data)
      } catch (err) {
        console.error("Profile fetch exception:", err)
      }
    },
    [supabase]
  )

  const refreshStats = useCallback(async () => {
    if (!user) return

    try {
      const { data: userData } = await supabase
        .from("leaderboard")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle()

      const points = userData?.total_points || 0

      const { count } = await supabase
        .from("leaderboard")
        .select("*", { count: "exact", head: true })
        .gt("total_points", points)

      setStats({
        points,
        rank: (count || 0) + 1,
      })
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
  }, [supabase, user])

  useEffect(() => {
    let mounted = true

    async function loadInitialSession() {
      setLoading(true)

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error("Session error:", error.message)
        }

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error("Initial session load exception:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setProfile(null)
        setStats(null)
      }

      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  useEffect(() => {
    if (user) {
      refreshStats()
    }
  }, [user, profile, refreshStats])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    router.replace("/dashboard")
    router.refresh()
  }

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        },
      },
    })

    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: name,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        console.error("Error creating profile:", profileError.message)
      }

      await fetchProfile(data.user.id)
    }

    router.replace("/dashboard")
    router.refresh()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setStats(null)
    router.replace("/")
    router.refresh()
  }

  const updateDisplayName = async (name: string) => {
    if (!user) return

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    })

    if (error) throw error

    await fetchProfile(user.id)
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
        refreshStats,
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
