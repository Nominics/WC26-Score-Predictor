
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [fixtures, setFixtures] = useState<any[]>([])
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
      fetchData()
    } else if (!authLoading) {
      setIsLoading(false)
    }
  }, [user, authLoading])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch Fixtures
      const { data: fixturesData, error: fError } = await supabase
        .from("fixtures")
        .select("*")
        .order("kickoff_at", { ascending: true })
      
      if (fError) throw fError
      setFixtures(fixturesData || [])

      // Fetch Predictions
      const { data: predData, error: pError } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user?.id)
      
      if (pError) throw pError
      setPredictions(predData || [])

    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not load latest match data.",
      })
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
      // Update local state instead of full refetch for better UX
      setPredictions(prev => {
        const existing = prev.findIndex(p => p.fixture_id === fId)
        if (existing > -1) {
          const updated = [...prev]
          updated[existing] = { ...updated[existing], home_score: h, away_score: a }
          return updated
        }
        return [...prev, { fixture_id: fId, home_score: h, away_score: a }]
      })
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
          Loading Arena...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-white border-b border-gray-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-black italic tracking-tighter">MATCH CENTER</h1>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">World Cup 2026 Edition</p>
        </div>
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
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black uppercase italic tracking-tight">Upcoming Fixtures</h2>
            <span className="bg-primary/10 text-primary text-[9px] font-black px-3 py-1 rounded-full uppercase italic">Live Data</span>
          </div>
          {fixtures.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No fixtures found. Sync required.</p>
            </div>
          ) : (
            fixtures.map((fixture) => {
              const pred = predictions.find(p => p.fixture_id === fixture.external_id)
              return (
                <FixtureCard 
                  key={fixture.external_id} 
                  fixture={fixture} 
                  initialHome={pred?.home_score}
                  initialAway={pred?.away_score}
                  onSave={handlePredict}
                />
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
