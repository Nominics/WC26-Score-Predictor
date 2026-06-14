"use client"

import { createContext, useContext, useEffect, useState } from "react"
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

  const fetchProfile = async (userId: string) => {
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
  }

  useEffect(() => {
    let mounted = true

    async function initializeAuth() {
      try {
        // Initial session check
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
        }
      } catch (err) {
        console.error("Initialization error:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event)
      if (mounted) {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    router.refresh()
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
      router.refresh()
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.refresh()
    router.push("/")
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
