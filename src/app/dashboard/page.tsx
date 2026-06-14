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
        title: "Success",
        description: "Prediction updated!",
      })
    }
  }

  if (authLoading || isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-primary font-black italic animate-pulse">LOADING...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-24 md:pt-20">
      <MainNav />
      <header className="p-6 bg-white border-b border-gray-100 sticky top-0 z-40 md:relative">
        <div className="max-w-2xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-primary">FIXTURES</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
              Hi, {profile?.display_name || 'Expert'}
            </p>
          </div>
          <div className="text-right">
             <span className="text-3xl font-black italic leading-none">{profile?.points || 0}</span>
             <p className="text-[8px] font-bold text-muted-foreground uppercase">Total Points</p>
          </div>
        </div>
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