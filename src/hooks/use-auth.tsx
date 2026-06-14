"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any | null
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
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(isSupabaseConfigured())

  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!isConfigured) return

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
    },
    [supabase, isConfigured]
  )

  useEffect(() => {
    let mounted = true

    async function loadInitialSession() {
      if (!isConfigured) {
        setLoading(false)
        return
      }

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
        console.error("Auth initialization error:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInitialSession()

    if (isConfigured) {
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
        }

        setLoading(false)
      })

      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    } else {
      setLoading(false)
    }
  }, [supabase, fetchProfile, isConfigured])

  const login = async (email: string, password: string) => {
    if (!isConfigured) {
      throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.")
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    router.replace("/dashboard")
    router.refresh()
  }

  const register = async (email: string, password: string, name: string) => {
    if (!isConfigured) {
      throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.")
    }

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
    if (isConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
    router.replace("/")
    router.refresh()
  }

  const updateDisplayName = async (name: string) => {
    if (!user || !isConfigured) return

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
