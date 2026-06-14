"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function Onboarding() {
  const { user, updateDisplayName } = useAuth()
  const [name, setName] = useState("")
  const router = useRouter()

  useEffect(() => {
    if (!user) router.push("/")
  }, [user, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.length >= 3) {
      updateDisplayName(name)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm space-y-6">
        <Card className="border-secondary/20 bg-black/40 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-black text-white">SET DISPLAY NAME</CardTitle>
            <CardDescription className="text-gray-400">This is how you'll appear on the leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase">Display Name</label>
                <Input
                  placeholder="e.g. WorldCupPro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={3}
                  required
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <Button type="submit" className="w-full bg-accent text-white font-black uppercase hover:bg-accent/80 h-12">
                Set and Enter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
