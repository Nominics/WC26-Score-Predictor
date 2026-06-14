"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Calendar as CalendarIcon, Loader2, Sparkles, Zap, Activity } from "lucide-react"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function Dashboard() {
  const { user, loading: authLoading, stats, useLifeline } = useAuth()
  const { toast } = useToast()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchData()
      fetchActivity()
      
      const fixturesChannel = supabase
        .channel('fixtures-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => fetchData())
        .subscribe()

      const predictionsChannel = supabase
        .channel('predictions-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => {
           fetchData()
           fetchActivity()
        })
        .subscribe()

      const activityChannel = supabase
        .channel('activity-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchActivity())
        .subscribe()

      return () => {
        supabase.removeChannel(fixturesChannel)
        supabase.removeChannel(predictionsChannel)
        supabase.removeChannel(activityChannel)
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

  const fetchActivity = async () => {
    const { data } = await supabase
      .from("activity_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(7)
    setActivityLogs(data || [])
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
        user_id: user.id,
        fixture_id: fixtureId,
        predicted_home_score: Number(h),
        predicted_away_score: Number(a),
      }, { onConflict: 'user_id,fixture_id' })

    if (error) {
      console.error("Prediction save error:", error)
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message 
      })
    } else {
      toast({ 
        title: isLifeline ? "Lifeline Used!" : "Success", 
        description: isLifeline ? "Prediction updated during the match!" : "Pick locked in!" 
      })
      fetchData()
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "??"
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
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
      <header className="px-6 pt-12 pb-6 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
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

      <div className="max-w-2xl mx-auto px-6 pt-6 mb-10">
        <Card className="rounded-[2.5rem] border-gray-100 shadow-xl overflow-hidden bg-white">
          <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Live Arena Feed</h3>
          </div>
          <ScrollArea className="h-32">
            <div className="p-4 space-y-3">
              {activityLogs.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Waiting for the first whistle...</p>
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex gap-4 p-4 bg-white rounded-3xl border border-gray-50 items-center transition-all hover:bg-gray-50/30">
                    <Avatar className="h-8 w-8 border border-white shadow-sm">
                      <AvatarFallback className="bg-gray-50 text-primary font-black text-[10px]">
                        {getInitials(log.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] truncate">
                        <span className="font-black text-gray-900 uppercase mr-1">{log.display_name}</span>
                        <span className="text-gray-400 font-bold lowercase">
                          {log.action === 'prediction_created' ? 'locked in' : 'updated'} a pick
                        </span>
                      </p>
                      <p className="font-black text-primary uppercase italic text-[11px] tracking-tight truncate">
                        {log.home_team} vs {log.away_team}
                      </p>
                    </div>
                    <span className="text-[8px] text-gray-300 font-black uppercase bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap shadow-sm">
                      {DateTime.fromISO(log.created_at).toRelative()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {dateTabs.length > 0 && (
        <div className="px-6 py-4 sticky top-[92px] bg-white/80 backdrop-blur-md z-30 border-b border-gray-100/50">
          <div className="flex items-center no-scrollbar overflow-x-auto gap-3 max-w-2xl mx-auto">
            {dateTabs.map((d) => (
              <button
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                className={cn(
                  "flex flex-col items-center min-w-[4.5rem] py-3 rounded-2xl transition-all border-2",
                  activeDate === d.iso ? "bg-primary border-primary text-white shadow-xl scale-105" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
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

      <main className="px-6 py-8 space-y-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase italic text-gray-400 tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Loading Schedule...'}
          </h2>
          {displayFixtures.some(f => f.status === 'live') && (
            <div className="flex items-center gap-2 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase italic animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Live Matches
            </div>
          )}
        </div>

        {isLoading && fixtures.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white rounded-[2.5rem] animate-pulse border border-gray-100 shadow-md" />
            ))}
          </div>
        ) : displayFixtures.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
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
                  initialHome={pred?.predicted_home_score}
                  initialAway={pred?.predicted_away_score}
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
