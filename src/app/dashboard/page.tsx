"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchData()
      
      const fixturesChannel = supabase
        .channel('fixtures-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => fetchData())
        .subscribe()

      const predictionsChannel = supabase
        .channel('predictions-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions', filter: `user_id=eq.${user.id}` }, () => fetchData())
        .subscribe()

      return () => {
        supabase.removeChannel(fixturesChannel)
        supabase.removeChannel(predictionsChannel)
      }
    }
  }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      const { data: fixturesData, error: fError } = await supabase
        .from("fixtures")
        .select("*")
        .order("kickoff_at", { ascending: true })
      
      if (fError) throw fError
      setFixtures(fixturesData || [])

      if (fixturesData && fixturesData.length > 0 && !activeDate) {
        const firstDate = DateTime.fromISO(fixturesData[0].kickoff_at).toISODate()
        setActiveDate(firstDate)
      }

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

  const displayFixtures = useMemo(() => {
    if (!activeDate) return fixtures.slice(0, 10)
    return fixtures.filter(f => DateTime.fromISO(f.kickoff_at).toISODate() === activeDate)
  }, [fixtures, activeDate])

  const handlePredict = async (fixtureId: string, h: number, a: number) => {
    if (!user) return

    const { error } = await supabase
      .from("predictions")
      .upsert({
        fixture_id: fixtureId,
        user_id: user.id,
        home_score: h,
        away_score: a,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fixture_id,user_id' })

    if (error) {
      const isLocked = error.message.toLowerCase().includes('lock') || error.code === '42501'
      toast({ 
        variant: "destructive", 
        title: isLocked ? "Prediction Locked" : "Error", 
        description: isLocked ? "Window is closed for this match." : "Failed to save pick." 
      })
    } else {
      toast({ title: "Success", description: "Pick locked in!" })
      fetchData()
    }
  }

  if (authLoading || (isLoading && fixtures.length === 0)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 pt-12 pb-6 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            MATCH CENTER
          </h1>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time Arena</p>
        </div>
      </header>

      {dateTabs.length > 0 && (
        <div className="px-6 py-4 sticky top-[92px] bg-gray-50/80 backdrop-blur-md z-30 border-b border-gray-100/50">
          <div className="flex items-center no-scrollbar overflow-x-auto gap-3 max-w-2xl mx-auto">
            {dateTabs.map((d) => (
              <button
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                className={cn(
                  "flex flex-col items-center min-w-[4rem] py-3 rounded-2xl transition-all border",
                  activeDate === d.iso ? "active-pill border-primary" : "bg-white border-gray-100 text-gray-400"
                )}
              >
                <span className="text-[9px] font-bold uppercase mb-0.5">{d.day}</span>
                <span className="text-lg font-black leading-none">{d.date}</span>
                <span className="text-[8px] font-black uppercase mt-0.5">{d.month}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-6 py-8 space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase italic text-gray-400 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Loading...'}
          </h2>
        </div>

        {displayFixtures.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed">
            <p className="text-gray-400 font-bold uppercase text-[10px]">No matches scheduled for this date</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayFixtures.map((fixture) => {
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
        )}
      </main>
    </div>
  )
}