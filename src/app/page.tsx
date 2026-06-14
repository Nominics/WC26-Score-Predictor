
"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { useToast } from "@/hooks/use-toast"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const logo = PlaceHolderImages.find(img => img.id === 'fifa-logo')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    try {
      await login(email)
      toast({
        title: "Check your email!",
        description: "We've sent a magic link to your inbox.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Something went wrong.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-black">
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <Image 
          src="https://picsum.photos/seed/stadium/1200/800" 
          alt="Stadium Background" 
          fill 
          className="object-cover"
          data-ai-hint="soccer stadium"
        />
      </div>
      
      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-32 w-32 animate-pulse">
            <Image 
              src={logo?.imageUrl || ""} 
              alt="WC26 Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">
            WC26 <br/><span className="fifa-text-gradient">PREDICTOR</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold">
            Prove your football knowledge
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white">Join the Challenge</CardTitle>
            <CardDescription className="text-gray-400">Enter your email to get a magic link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-secondary text-primary font-black uppercase tracking-tighter text-lg py-6 hover:bg-secondary/90"
              >
                {isSubmitting ? "Sending..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
