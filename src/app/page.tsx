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
import { Lock, Mail, User, Loader2 } from "lucide-react"
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

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none grayscale">
        <Image 
          src="https://picsum.photos/seed/stadium/1200/800" 
          alt="Stadium Background" 
          fill 
          className="object-cover"
          data-ai-hint="soccer stadium"
        />
      </div>
      
      <div className="relative z-10 w-full max-w-sm space-y-10 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-24 w-24 grayscale brightness-50 contrast-125">
            <Image 
              src={logo?.imageUrl || "https://picsum.photos/seed/fifa26/400/400"} 
              alt="WC26 Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
              WC26<br/><span className="text-primary italic">PREDICTOR</span>
            </h1>
            <p className="text-gray-400 text-[9px] uppercase tracking-[0.4em] font-black">
              Official Fan Hub
            </p>
          </div>
        </div>

        <Card className="border-gray-100 bg-white shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-4">
            <Tabs defaultValue="signin" onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-50 rounded-full p-1 h-12">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-wider">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white font-black text-[10px] uppercase tracking-wider">Register</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 text-left">
                {mode === "signup" && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="bg-gray-50 border-gray-100 h-14 pl-12 rounded-2xl text-gray-900 font-medium focus:ring-primary/20"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-14 pl-12 rounded-2xl text-gray-900 font-medium focus:ring-primary/20"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-14 pl-12 rounded-2xl text-gray-900 font-medium focus:ring-primary/20"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-white font-black uppercase tracking-tight text-lg h-16 rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg mt-2"
              >
                {isSubmitting ? "Authenticating..." : mode === "signin" ? "Enter Arena" : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
