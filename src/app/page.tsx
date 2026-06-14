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
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-white overflow-hidden relative">
      {/* Subtle Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
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
              src={logo?.imageUrl || ""} 
              alt="WC26 Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-black tracking-tighter leading-none">
              WC26<br/><span className="fifa-text-gradient">PREDICTOR</span>
            </h1>
            <p className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold">
              Predict. Compete. Win.
            </p>
          </div>
        </div>

        <Card className="border-none shadow-2xl shadow-primary/10 bg-white/80 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black">GET STARTED</CardTitle>
            <CardDescription>Enter your email for instant access</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-gray-50 border-gray-100 h-12 text-center font-medium focus:ring-primary/20"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-primary text-white font-black uppercase tracking-tight text-lg h-14 rounded-2xl hover:bg-primary/90 transition-transform active:scale-95"
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