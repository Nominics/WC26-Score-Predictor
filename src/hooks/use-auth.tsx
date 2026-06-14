"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any | null
  stats: { 
    points: number; 
    predictionPoints: number;
    startingPoints: number;
    rank: number; 
    lifelines: number 
  } | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  updateFavoriteTeam: (team: string) => Promise<void>
  useLifeline: () => Promise<void>
  isConfigured: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [stats, setStats] = useState<AuthContextType['stats']>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(isSupabaseConfigured())

  const router = useRouter()
  const supabase = createClient()

  const fetchUserData = useCallback(
    async (userId: string) => {
      if (!isConfigured) return

      try {
        // Fetch profile data first
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle()

        if (profileError) throw profileError
        if (profileData) {
          setProfile(profileData)
        }

        // Fetch user stats and rank from the updated leaderboard view
        const [userStatsRes, rankRes] = await Promise.all([
          supabase
            .from("leaderboard")
            .select("total_points, prediction_points, starting_points")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("leaderboard")
            .select("user_id", { count: "exact", head: true })
            .gt("total_points", profileData?.total_points || 0)
        ])

        const totalPoints = userStatsRes.data?.total_points || 0
        const predPoints = userStatsRes.data?.prediction_points || 0
        const startPoints = userStatsRes.data?.starting_points || 0
        const rank = (rankRes.count || 0) + 1

        setStats({
          points: totalPoints,
          predictionPoints: predPoints,
          startingPoints: startPoints,
          rank: rank,
          lifelines: profileData?.lifelines_remaining ?? 5
        })
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
        await fetchUserData(currentUser.id)
        if (mounted) setLoading(false)
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

    // Note: Profiles are handled by a Supabase trigger, but we fetch to ensure sync
    if (data.user) {
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
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)
    if (error) throw error
    await fetchUserData(user.id)
  }

  const updateFavoriteTeam = async (team: string) => {
    if (!user || !isConfigured) return
    const { error } = await supabase
      .from("profiles")
      .update({
        favorite_team: team,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id)
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
        updateFavoriteTeam,
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
