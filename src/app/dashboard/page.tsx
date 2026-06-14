
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FIXTURES } from "@/lib/mock-data"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchPredictions()
    }
  }, [user])

  const fetchPredictions = async () => {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", user?.id)
    
    if (data) setPredictions(data)
    setIsLoading(false)
  }

  const handlePredict = async (fId: string, h: number, a: number) => {
    if (!user) return

    const { error } = await supabase
      .from("predictions")
      .upsert({
        fixture_id: fId,
        user_id: user.id,
        home_score: h,
        away_score: a,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fixture_id,user_id' })

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save prediction.",
      })
    } else {
      await fetchPredictions()
      toast({
        title: "Prediction Saved!",
        description: "Good luck with your score.",
      })
    }
  }

  if (authLoading || isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black italic">LOADING...</div>
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-6 bg-gradient-to-b from-secondary/10 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">FIXTURES</h1>
        <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mt-1">
          Welcome back, {profile?.display_name || 'Pro'}
        </p>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {FIXTURES.map((fixture) => {
          const pred = predictions.find(p => p.fixture_id === fixture.id)
          return (
            <FixtureCard 
              key={fixture.id} 
              fixture={fixture} 
              initialHome={pred?.home_score}
              initialAway={pred?.away_score}
              onSave={handlePredict}
            />
          )
        })}
      </main>
    </div>
  )
}
