"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      if (data) setProfile(data)
    } catch (err) {
      console.error("Error fetching profile:", err)
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    let isInitialCheckDone = false

    async function initializeAuth() {
      try {
        // 1. Check current session immediately
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
          // We don't set loading false yet, we wait for INITIAL_SESSION event or this to finish
          isInitialCheckDone = true
          setLoading(false)
        }
      } catch (err) {
        console.error("Initialization error:", err)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event, !!session)
      
      if (mounted) {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          // Explicitly handle sign out or missing sessions
          if (event === 'SIGNED_OUT' || (!session && isInitialCheckDone)) {
            setUser(null)
            setProfile(null)
          }
        }
        
        // Ensure loading is false after the first meaningful check
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.replace("/dashboard")
  }

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    })
    
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ 
          id: data.user.id, 
          display_name: name,
          updated_at: new Date().toISOString() 
        })
      
      if (profileError) console.error("Error creating profile:", profileError)
      await fetchProfile(data.user.id)
      router.replace("/dashboard")
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.replace("/")
  }

  const updateDisplayName = async (name: string) => {
    if (!user) return
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: name, updated_at: new Date().toISOString() })
    
    if (error) throw error
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
