
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Loader2, User, Sparkles, ChevronRight } from "lucide-react"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function Onboarding() {
  const { user, profile, updateDisplayName, loading: authLoading } = useAuth()
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  
  const logo = PlaceHolderImages.find(img => img.id === 'fifa-logo')
  const bg = PlaceHolderImages.find(img => img.id === 'stadium-bg')

  useEffect(() => {
    if (!authLoading && user && profile?.display_name) {
      router.replace("/dashboard")
    }
  }, [user, profile, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName.length < 3) return
    
    setIsSubmitting(true)
    try {
      await updateDisplayName(trimmedName)
      router.replace("/dashboard")
    } catch (error) {
      console.error("Onboarding error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    router.replace("/")
    return null
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none grayscale">
        <Image 
          src={bg?.imageUrl || "https://picsum.photos/seed/stadium/1200/800"} 
          alt="Stadium Background" 
          fill 
          priority
          className="object-cover"
        />
      </div>
      
      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-32 w-32 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt="WC26 Official Logo" 
                fill 
                className="object-contain brightness-110"
              />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tighter leading-none uppercase">
              Claim Your <span className="text-primary italic">Identity</span>
            </h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-[0.4em] font-black mt-2">
              Arena Registration
            </p>
          </div>
        </div>

        <Card className="border-0 bg-white shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-8 px-8">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Enter your Arena display name</p>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 text-left">
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="e.g. GoalHunter99"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={3}
                    maxLength={20}
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-16 pl-14 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-[9px] font-bold text-gray-500 leading-tight text-left">
                  This is how you will be identified on the global leaderboard and in the live match pulse.
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || name.trim().length < 3}
                className="w-full bg-primary text-black font-black uppercase tracking-tight text-lg h-16 rounded-2xl hover:bg-black hover:text-primary transition-all active:scale-95 shadow-xl mt-4 border-2 border-primary"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Enter Arena</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
