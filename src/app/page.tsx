
"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"
import { Lock, Mail } from "lucide-react"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const { login, register } = useAuth()
  const { toast } = useToast()
  const logo = PlaceHolderImages.find(img => img.id === 'fifa-logo')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setIsSubmitting(true)
    try {
      if (mode === "signin") {
        await login(email, password)
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        })
      } else {
        await register(email, password)
        toast({
          title: "Account created!",
          description: "Check your email for a confirmation link.",
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black overflow-hidden relative">
      {/* Subtle Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
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
          <div className="relative h-24 w-24">
            <Image 
              src={logo?.imageUrl || "https://picsum.photos/seed/fifa26/400/400"} 
              alt="WC26 Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
              WC26<br/><span className="text-primary italic">PREDICTOR</span>
            </h1>
            <p className="text-gray-400 text-[10px] uppercase tracking-[0.3em] font-black">
              The Official Fans Arena
            </p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pb-4">
            <Tabs defaultValue="signin" onValueChange={(v) => setMode(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 rounded-full p-1 h-12">
                <TabsTrigger value="signin" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-xs uppercase">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-xs uppercase">Register</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-white font-medium focus:ring-primary/20"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-white/5 border-white/10 h-14 pl-12 rounded-2xl text-white font-medium focus:ring-primary/20"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-white font-black uppercase tracking-tight text-lg h-16 rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(124,58,237,0.3)] mt-2"
              >
                {isSubmitting ? "Authenticating..." : mode === "signin" ? "Enter Stadium" : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
