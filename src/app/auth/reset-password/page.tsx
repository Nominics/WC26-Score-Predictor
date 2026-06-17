
"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Lock, Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PlaceHolderImages } from "@/lib/placeholder-images"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { updatePassword } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const logo = PlaceHolderImages.find(img => img.id === 'fifa-logo')
  const bg = PlaceHolderImages.find(img => img.id === 'stadium-bg')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Mismatch",
        description: "Passwords do not match.",
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      await updatePassword(password)
      toast({
        title: "Success",
        description: "Your password has been updated.",
      })
      router.replace("/dashboard")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: error.message || "Something went wrong.",
      })
    } finally {
      setIsSubmitting(false)
    }
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
        />
      </div>
      
      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative h-32 w-32">
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
              Update <span className="text-primary italic">Password</span>
            </h1>
          </div>
        </div>

        <Card className="border-0 bg-white shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="pt-8 px-8">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Enter your new secure password</p>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 text-left">
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary" />
                  <Input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-16 pl-14 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary" />
                  <Input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-gray-50 border-gray-100 h-16 pl-14 rounded-2xl text-gray-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all text-sm"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || !password}
                className="w-full bg-primary text-black font-black uppercase tracking-tight text-lg h-16 rounded-2xl hover:bg-black hover:text-primary transition-all active:scale-95 shadow-xl mt-4 border-2 border-primary"
              >
                {isSubmitting ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Updating...</span>
                    </div>
                ) : "Set New Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
