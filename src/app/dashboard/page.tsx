"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FIXTURES } from "@/lib/mock-data"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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
  const router = useRouter()
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState("15")
  const supabase = createClient()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchPredictions()
    } else if (!authLoading) {
      setIsLoading(false)
    }
  }, [user, authLoading])

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user?.id)
      
      if (error) throw error
      if (data) setPredictions(data)
    } catch (error: any) {
      console.error("Error fetching predictions:", error)
    } finally {
      setIsLoading(false)
    }
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

  if (authLoading || (isLoading && user)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-primary font-black italic animate-pulse uppercase tracking-widest text-xl">
          Loading Stadium...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-white border-b border-gray-100">
        <h1 className="text-2xl font-black italic tracking-tighter">LEAGUE CENTER</h1>
        <Button size="icon" variant="ghost" className="rounded-full bg-gray-50 border border-gray-100 h-10 w-10">
          <Bell className="h-5 w-5 text-gray-400" />
        </Button>
      </header>

      <div className="px-6 mb-8 mt-4">
        <div className="flex justify-between items-center no-scrollbar overflow-x-auto gap-4 py-2">
          {DATES.map((d) => (
            <button
              key={d.date}
              onClick={() => setActiveDate(d.date)}
              className={`flex flex-col items-center min-w-[3.5rem] py-4 rounded-3xl transition-all duration-300 ${
                activeDate === d.date ? "active-pill" : "text-gray-400 bg-white border border-gray-100"
              }`}
            >
              <span className="text-[10px] font-bold mb-1 uppercase tracking-wider">{d.day}</span>
              <span className="text-lg font-black">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 space-y-8">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black uppercase italic tracking-tight">Active Leagues</h2>
            <button className="text-[10px] text-gray-400 font-bold uppercase">See All</button>
          </div>
          <div className="flex gap-3 no-scrollbar overflow-x-auto pb-2">
            {LEAGUES.map((l) => (
              <button key={l.id} className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2.5 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-tight hover:bg-gray-50 transition-colors">
                <span className="bg-gray-50 p-1.5 rounded-full">{l.icon}</span>
                {l.name}
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <h2 className="text-lg font-black uppercase italic tracking-tight mb-4">Upcoming Matches</h2>
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