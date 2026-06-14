
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Bell, RefreshCw, Trophy } from "lucide-react"
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
  const [isSyncing, setIsSyncing] = useState(false)
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
    if (!user) return
    setIsLoading(true)
    try {
      const { data: fixturesData, error: fError } = await supabase
        .from("fixtures")
        .select("*")
        .order("kickoff_at", { ascending: true })
      
      if (fError) throw fError
      setFixtures(fixturesData || [])

      const { data: predData, error: pError } = await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", user.id)
      
      if (pError) throw pError
      setPredictions(predData || [])

    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not load match data.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      // No need for client-side secret if the server checks session
      const res = await fetch('/api/fixtures/sync', {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Sync Complete", description: `Updated ${data.count} fixtures.` })
        fetchData()
      } else {
        throw new Error(data.error || data.details || 'Sync failed')
      }
    } catch (error: any) {
      console.error("Sync Error:", error)
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message === "Unauthorized" ? "Access denied. Try logging in again." : error.message,
      })
    } finally {
      setIsSyncing(false)
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
      toast({ variant: "destructive", title: "Error", description: "Failed to save pick." })
    } else {
      setPredictions(prev => {
        const existingIdx = prev.findIndex(p => p.fixture_id === fId)
        if (existingIdx > -1) {
          const updated = [...prev]
          updated[existingIdx] = { ...updated[existingIdx], home_score: h, away_score: a }
          return updated
        }
        return [...prev, { fixture_id: fId, home_score: h, away_score: a, user_id: user.id }]
      })
      toast({ title: "Prediction Saved", description: "Your pick has been locked in!" })
    }
  }

  if (authLoading || (isLoading && user)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-primary font-black italic animate-pulse uppercase tracking-widest text-2xl">WC26</div>
          <div className="h-1 w-32 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 pt-12 pb-6 flex justify-between items-center bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="space-y-1">
          <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            MATCH CENTER
          </h1>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">World Cup 2026 Edition</p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-full bg-gray-50 border border-gray-100 h-10 w-10 active:scale-95 transition-transform"
          >
            <RefreshCw className={`h-4 w-4 text-gray-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full bg-gray-50 border border-gray-100 h-10 w-10">
            <Bell className="h-5 w-5 text-gray-400" />
          </Button>
        </div>
      </header>

      <div className="px-6 mb-8 mt-4">
        <div className="flex justify-between items-center no-scrollbar overflow-x-auto gap-4 py-2">
          {DATES.map((d) => (
            <button
              key={d.date}
              onClick={() => setActiveDate(d.date)}
              className={`flex flex-col items-center min-w-[3.5rem] py-4 rounded-3xl transition-all duration-300 ${
                activeDate === d.date ? "active-pill" : "text-gray-400 bg-white border border-gray-100 hover:border-primary/20"
              }`}
            >
              <span className="text-[10px] font-bold mb-1 uppercase tracking-wider">{d.day}</span>
              <span className="text-lg font-black">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="px-6 space-y-8 max-w-2xl mx-auto">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black uppercase italic tracking-tight">Available Fixtures</h2>
            <span className="bg-primary/10 text-primary text-[9px] font-black px-3 py-1 rounded-full uppercase italic">Live Sync</span>
          </div>
          
          {fixtures.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <div className="space-y-6 max-w-xs mx-auto">
                <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                  <RefreshCw className="h-8 w-8 text-gray-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-gray-900 font-black uppercase text-sm tracking-tight">Arena is Empty</p>
                  <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest leading-relaxed">
                    Hit the sync button in the header to populate the latest match schedules.
                  </p>
                </div>
                <Button onClick={handleSync} disabled={isSyncing} className="bg-primary text-white font-black uppercase rounded-full px-8">
                  Populate Arena
                </Button>
              </div>
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
