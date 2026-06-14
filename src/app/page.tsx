"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { Lock, Mail, User, Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const { login, register, user, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const logo = PlaceHolderImages.find(img => img.id === 'fifa-logo')
  const bg = PlaceHolderImages.find(img => img.id === 'stadium-bg')

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    if (mode === "signup" && !name) return
    
    setIsSubmitting(true)
    try {
      if (mode === "signin") {
        await login(email, password)
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        })
      } else {
        await register(email, password, name)
        toast({
          title: "Account created!",
          description: "Welcome to the arena.",
        })
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: mode === "signin" ? "Login Failed" : "Registration Failed",
        description: error.message || "Something went wrong.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-primary font-black italic animate-pulse uppercase tracking-widest text-2xl">WC26</div>
          <Loader2 className="h-6 w-6 text-gray-200 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none grayscale">
        <Image 
          src={bg?.imageUrl || "https://picsum.photos/seed/stadium/1200/800"} 
          alt="Stadium Background" 
          fill 
          priority
          sizes="100vw"
          className="object-cover"
          data-ai-hint="soccer stadium"
        />
      </div>
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-44 w-44 drop-shadow-2xl">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt="WC26 Official Logo" 
                fill 
                priority
                sizes="(max-width: 768px) 176px, 176px"
                className="object-contain"
              />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">
              WC26<br/><span className="text-primary italic">PREDICTOR</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <p className="text-gray-400 text-[10px] uppercase tracking-[0.5em] font-black">
                Official Fan Hub
                </p>
                <Sparkles className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>

        <Card className="border-0 bg-white shadow-[0_32px_80px_-12px_rgba(0,0,0,0.15)] rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-4 pt-8 px-8">
            <Tabs defaultValue="signin" onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-full p-1.5 h-14">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl font-black text-[11px] uppercase tracking-widest transition-all">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl font-black text-[11px] uppercase tracking-widest transition-all">Register</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 text-left">
                {mode === "signup" && (
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="bg-gray-50 border-gray-100 h-16 pl-14 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all text-sm"
                    />
                  </div>
                )}
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-16 pl-14 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all text-sm"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-16 pl-14 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all text-sm"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-white font-black uppercase tracking-tight text-xl h-16 rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-2xl mt-4"
              >
                {isSubmitting ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Verifying...</span>
                    </div>
                ) : mode === "signin" ? "Enter Arena" : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] opacity-60">
            Powered by Genkit • Secured by Supabase
        </p>
      </div>
    </div>
  )
}
