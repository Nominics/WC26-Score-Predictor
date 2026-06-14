"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FIXTURES } from "@/lib/mock-data"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Bell, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const DATES = [
  { day: "Sun", date: "12" },
  { day: "Sat", date: "13" },
  { day: "Mon", date: "14" },
  { day: "Tue", date: "15" },
  { day: "Wed", date: "16" },
  { day: "Thu", date: "17" },
  { day: "Fri", date: "18" },
]

const LEAGUES = [
  { id: "wc", name: "World Cup 26", icon: "🏆" },
  { id: "pl", name: "Premier League", icon: "🦁" },
  { id: "ll", name: "LA LIGA", icon: "🇪🇸" },
]

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState("15")
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
    return <div className="min-h-screen bg-black flex items-center justify-center text-primary font-black italic animate-pulse uppercase">Predicting...</div>
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <MainNav />
      
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">League Center</h1>
        <Button size="icon" variant="ghost" className="rounded-full bg-white/5 border border-white/10 h-10 w-10">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      {/* Date Selector */}
      <div className="px-6 mb-8">
        <div className="flex justify-between items-center no-scrollbar overflow-x-auto gap-4 py-2">
          {DATES.map((d) => (
            <button
              key={d.date}
              onClick={() => setActiveDate(d.date)}
              className={`flex flex-col items-center min-w-[3rem] py-3 rounded-3xl transition-all duration-300 ${
                activeDate === d.date ? "active-pill" : "text-gray-400"
              }`}
            >
              <span className="text-[10px] font-medium mb-1 uppercase tracking-wider">{d.day}</span>
              <span className="text-lg font-bold">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 space-y-8">
        {/* League Filter */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Live Games</h2>
            <button className="text-xs text-gray-500 font-medium">See All</button>
          </div>
          <div className="flex gap-3 no-scrollbar overflow-x-auto pb-2">
            {LEAGUES.map((l) => (
              <button key={l.id} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium hover:bg-white/10 transition-colors">
                <span className="bg-primary/20 p-1.5 rounded-full text-xs">{l.icon}</span>
                {l.name}
              </button>
            ))}
          </div>
        </section>

        {/* Fixtures */}
        <div className="space-y-4">
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
        </div>
      </main>
    </div>
  )
}