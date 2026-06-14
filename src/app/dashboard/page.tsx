
"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState<string | null>(null)
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
      // Fetch fixtures directly from Supabase
      const { data: fixturesData, error: fError } = await supabase
        .from("fixtures")
        .select(`
          id,
          external_id,
          match_number,
          stage,
          group_name,
          venue,
          home_team,
          away_team,
          kickoff_at,
          status,
          home_score,
          away_score
        `)
        .in('status', ['scheduled', 'live'])
        .order("kickoff_at", { ascending: true })
      
      if (fError) throw fError
      setFixtures(fixturesData || [])

      // Set initial active date if fixtures exist
      if (fixturesData && fixturesData.length > 0) {
        const firstDate = DateTime.fromISO(fixturesData[0].kickoff_at).toISODate()
        setActiveDate(firstDate)
      }

      // Fetch user predictions
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
        description: "Could not load match data. Please check your connection.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Generate unique dates for tabs from fixtures
  const dateTabs = useMemo(() => {
    const dates = new Set<string>()
    fixtures.forEach(f => {
      const d = DateTime.fromISO(f.kickoff_at).toISODate()
      if (d) dates.add(d)
    })
    return Array.from(dates).sort().map(d => {
      const dt = DateTime.fromISO(d)
      return {
        iso: d,
        day: dt.toFormat('ccc'),
        date: dt.toFormat('dd'),
        month: dt.toFormat('MMM')
      }
    })
  }, [fixtures])

  // Filter fixtures based on active date
  const displayFixtures = useMemo(() => {
    if (!activeDate) return fixtures.slice(0, 10)
    
    const filtered = fixtures.filter(f => 
      DateTime.fromISO(f.kickoff_at).toISODate() === activeDate
    )

    // Fallback: If for some reason the filtered list is empty, show the next 10 fixtures
    return filtered.length > 0 ? filtered : fixtures.slice(0, 10)
  }, [fixtures, activeDate])

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
          <Loader2 className="h-6 w-6 text-gray-200 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      
      <header className="px-6 pt-12 pb-6 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="space-y-1">
            <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              MATCH CENTER
            </h1>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">World Cup 2026 Edition</p>
          </div>
        </div>
      </header>

      {/* Date Tabs - Dynamically generated from fixtures */}
      {dateTabs.length > 0 && (
        <div className="px-6 mb-8 mt-4 sticky top-[92px] bg-gray-50/80 backdrop-blur-md z-30 py-4 border-b border-gray-100/50">
          <div className="flex items-center no-scrollbar overflow-x-auto gap-3 max-w-2xl mx-auto">
            {dateTabs.map((d) => (
              <button
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                className={cn(
                  "flex flex-col items-center min-w-[4rem] py-3 rounded-2xl transition-all duration-300 border",
                  activeDate === d.iso 
                    ? "active-pill border-primary bg-primary" 
                    : "text-gray-400 bg-white border-gray-100 hover:border-gray-200"
                )}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider mb-0.5">{d.day}</span>
                <span className="text-lg font-black leading-none">{d.date}</span>
                <span className="text-[8px] font-black uppercase mt-0.5">{d.month}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-6 space-y-8 max-w-2xl mx-auto mt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-gray-400" />
              {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Upcoming Matches'}
            </h2>
            <span className="bg-primary/10 text-primary text-[9px] font-black px-3 py-1 rounded-full uppercase italic">
              {displayFixtures.length} Matches
            </span>
          </div>
          
          {fixtures.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
              <div className="space-y-4 max-w-xs mx-auto">
                <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="h-8 w-8 text-gray-200" />
                </div>
                <div className="space-y-2">
                  <p className="text-gray-900 font-black uppercase text-sm tracking-tight">Arena is Empty</p>
                  <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest leading-relaxed">
                    We're preparing the matches. Check back soon for the latest schedule.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {displayFixtures.map((fixture) => {
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
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
