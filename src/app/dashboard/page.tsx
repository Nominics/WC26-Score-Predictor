
"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Calendar as CalendarIcon, Loader2, Sparkles, Zap } from "lucide-react"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"

export default function Dashboard() {
  const { user, loading: authLoading, stats, useLifeline } = useAuth()
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
      const [fRes, pRes] = await Promise.all([
        supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true }),
        supabase.from("predictions").select("*").eq("user_id", user.id)
      ])
      
      if (fRes.error) throw fRes.error
      if (pRes.error) throw pRes.error

      setFixtures(fRes.data || [])
      setPredictions(pRes.data || [])

      if (fRes.data && fRes.data.length > 0 && !activeDate) {
        const now = DateTime.now().toISODate()
        const nearestMatch = fRes.data.find((f: any) => DateTime.fromISO(f.kickoff_at).toISODate() >= now)
        setActiveDate(nearestMatch ? DateTime.fromISO(nearestMatch.kickoff_at).toISODate() : DateTime.fromISO(fRes.data[0].kickoff_at).toISODate())
      }

    } catch (error: any) {
      console.error("Error fetching data:", error)
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

  const handlePredict = async (fixtureId: string, h: number, a: number, isLifeline: boolean) => {
    if (!user) return

    if (isLifeline) {
      try {
        await useLifeline()
      } catch (e) {
        toast({ variant: "destructive", title: "Lifeline Failed", description: "Could not deduct lifeline." })
        return
      }
    }

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
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "Failed to save pick." 
      })
    } else {
      toast({ 
        title: isLifeline ? "Lifeline Used!" : "Success", 
        description: isLifeline ? "Prediction updated during the match!" : "Pick locked in!" 
      })
      fetchData()
    }
  }

  if (authLoading && fixtures.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-primary font-black italic animate-pulse uppercase tracking-widest text-2xl">WC26</div>
          <Loader2 className="h-6 w-6 text-gray-200 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 pt-12 pb-6 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2 text-gray-900">
              <Trophy className="h-6 w-6 text-primary" />
              MATCH CENTER
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Global Arena</p>
               {stats && (
                 <div className="flex items-center gap-2">
                   <span className="h-1 w-1 rounded-full bg-gray-200" />
                   <span className="text-[10px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[10px] font-black text-gray-900 uppercase">({stats.points} pts)</span>
                   <span className="h-1 w-1 rounded-full bg-gray-200" />
                   <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                      <Zap className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-[9px] font-black text-yellow-600">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          <ProfileSheet />
        </div>
      </header>

      {dateTabs.length > 0 && (
        <div className="px-6 py-4 sticky top-[92px] bg-white/80 backdrop-blur-md z-30 border-b border-gray-100/50">
          <div className="flex items-center no-scrollbar overflow-x-auto gap-3 max-w-2xl mx-auto">
            {dateTabs.map((d) => (
              <button
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                className={cn(
                  "flex flex-col items-center min-w-[4.5rem] py-3 rounded-2xl transition-all border-2",
                  activeDate === d.iso ? "bg-primary border-primary text-white shadow-lg scale-105" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                )}
              >
                <span className={cn("text-[9px] font-bold uppercase mb-0.5", activeDate === d.iso ? "text-white/70" : "text-gray-400")}>{d.day}</span>
                <span className="text-lg font-black leading-none">{d.date}</span>
                <span className={cn("text-[8px] font-black uppercase mt-0.5", activeDate === d.iso ? "text-white/70" : "text-gray-400")}>{d.month}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-6 py-8 space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase italic text-gray-400 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Loading Schedule...'}
          </h2>
          {displayFixtures.some(f => f.status === 'live') && (
            <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase italic animate-pulse">
              <Sparkles className="h-3 w-3" /> Live Matches
            </div>
          )}
        </div>

        {isLoading && fixtures.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white rounded-[2.5rem] animate-pulse border border-gray-100 shadow-sm" />
            ))}
          </div>
        ) : displayFixtures.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <p className="text-gray-400 font-bold uppercase text-[10px]">No matches on this date</p>
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
                  lifelinesRemaining={stats?.lifelines || 0}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
