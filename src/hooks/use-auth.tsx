
"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any | null
  stats: { points: number; rank: number; lifelines: number } | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  useLifeline: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [stats, setStats] = useState<{ points: number; rank: number; lifelines: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(isSupabaseConfigured())

  const router = useRouter()
  const supabase = createClient()

  const fetchUserData = useCallback(
    async (userId: string) => {
      if (!isConfigured) return

      try {
        const [profileRes, statsRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("leaderboard").select("total_points, rank").eq("user_id", userId).maybeSingle()
        ])

        if (!profileRes.error && profileRes.data) {
          setProfile(profileRes.data)
        }
        
        if (!statsRes.error && statsRes.data) {
          setStats({
            points: statsRes.data.total_points || 0,
            rank: statsRes.data.rank || 0,
            lifelines: profileRes.data?.lifelines_remaining ?? 5
          })
        } else if (profileRes.data) {
          setStats({
            points: 0,
            rank: 0,
            lifelines: profileRes.data.lifelines_remaining ?? 5
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      const currentUser = session?.user || null
      setUser(currentUser)

      if (currentUser) {
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
      throw new Error("Supabase is not configured.")
    }
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      throw error
    }
    router.replace("/dashboard")
  }

  const register = async (email: string, password: string, name: string) => {
    if (!isConfigured) throw new Error("Supabase is not configured.")

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })

    if (error) {
      setLoading(false)
      throw error
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        display_name: name,
        lifelines_remaining: 5,
        updated_at: new Date().toISOString(),
      })
      await fetchUserData(data.user.id)
    }
    router.replace("/dashboard")
  }

  const logout = async () => {
    if (isConfigured) await supabase.auth.signOut()
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

  const useLifeline = async () => {
    if (!user || !profile || profile.lifelines_remaining <= 0) return
    const { error } = await supabase.from("profiles").update({
      lifelines_remaining: profile.lifelines_remaining - 1
    }).eq('id', user.id)
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
        useLifeline,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
