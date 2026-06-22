
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
import { Lock, Mail, User, Loader2, Sparkles, TrendingUp, ChevronLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin")
  const { login, register, resetPasswordEmail, user, profile, loading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const logo = PlaceHolderImages.find(img => img.id === 'fifa-logo')
  const bg = PlaceHolderImages.find(img => img.id === 'stadium-bg')

  useEffect(() => {
    if (!loading && user) {
      if (profile && !profile.display_name) {
        router.replace("/onboarding")
      } else if (profile && profile.display_name) {
        router.replace("/dashboard")
      }
    }
  }, [user, loading, profile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    try {
      if (mode === "signin") {
        if (!email || !password) throw new Error("Please enter email and password.")
        await login(email, password)
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        })
      } else if (mode === "signup") {
        if (!email || !password || !name) throw new Error("Please fill all fields.")
        await register(email, password, name)
        toast({
          title: "Account created!",
          description: "Welcome to the arena.",
        })
      } else if (mode === "forgot") {
        if (!email) throw new Error("Please enter your email.")
        await resetPasswordEmail(email)
        toast({
          title: "Email Sent",
          description: "If an account exists, you will receive a reset link.",
        })
        setMode("signin")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: error.message || "Something went wrong.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Use the premium loading screen instead of simple spinner
  if (loading || (user && profile?.display_name)) {
    return <AppLoadingScreen />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none grayscale">
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
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />

      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-44 w-44 drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            {logo && (
              <Image 
                src={logo.imageUrl} 
                alt="WC26 Official Logo" 
                fill 
                priority
                sizes="(max-width: 768px) 176px, 176px"
                className="object-contain brightness-110"
              />
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
              WC26<br/><span className="premium-gold-gradient-text italic">PREDICTOR</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <p className="text-gray-400 text-[10px] uppercase tracking-[0.5em] font-black">
                Eos
                </p>
                <Sparkles className="h-3 w-3 text-primary" />
            </div>
          </div>
        </div>

        <Card className="border-0 bg-white shadow-[0_32px_80px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-4 pt-8 px-8">
            {mode === "forgot" ? (
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMode("signin")}
                  className="rounded-full h-8 w-8 hover:bg-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-black uppercase italic text-gray-900">Reset Password</h3>
              </div>
            ) : (
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-full p-1.5 h-14">
                  <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-black data-[state=active]:text-primary data-[state=active]:shadow-xl font-black text-[11px] uppercase tracking-widest transition-all">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-black data-[state=active]:text-primary data-[state=active]:shadow-xl font-black text-[11px] uppercase tracking-widest transition-all">Register</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
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
                {mode !== "forgot" && (
                  <>
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
                    {mode === "signin" && (
                      <div className="text-right">
                        <button 
                          type="button" 
                          onClick={() => setMode("forgot")}
                          className="text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-widest transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {mode === "signup" && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Late Join Bonus Active</p>
                    <p className="text-[9px] font-bold text-gray-500 leading-tight mt-0.5">Register now to receive a one-time points bonus based on current leaderboards!</p>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full premium-gold-gradient-bg text-black font-black uppercase tracking-tight text-xl h-16 rounded-2xl hover:opacity-90 transition-all active:scale-95 shadow-2xl mt-4 border-2 border-primary/20"
              >
                {isSubmitting ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Verifying...</span>
                    </div>
                ) : mode === "signin" ? "Enter Arena" : mode === "signup" ? "Create Account" : "Send Reset Link"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] opacity-80">
            Powered by Eos
        </p>
      </div>
    </div>
  )
}
