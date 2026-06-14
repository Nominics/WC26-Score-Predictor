
"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Zap, Activity, ChevronRight, Loader2 } from "lucide-react"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { getTeamFlagUrl } from "@/lib/team-flags"

export default function Dashboard() {
  const { user: authUser, loading: authLoading, stats, useLifeline } = useAuth()
  const { toast } = useToast()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (authUser) {
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
  }, [authUser])

  const fetchData = async () => {
    if (!authUser) return
    try {
      const [fRes, pRes] = await Promise.all([
        supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true }),
        supabase.from("predictions").select("*").eq("user_id", authUser.id)
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
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) throw new Error("No authenticated user session found.")

      if (isLifeline) {
        try {
          await useLifeline()
        } catch (e: any) {
          toast({ variant: "destructive", title: "Lifeline Failed", description: e.message || "Could not deduct lifeline." })
          return
        }
      }

      const { error } = await supabase
        .from("predictions")
        .upsert({
          user_id: currentUser.id,
          fixture_id: fixtureId,
          predicted_home_score: Number(h),
          predicted_away_score: Number(a),
        }, { onConflict: 'user_id,fixture_id' })

      if (error) {
        console.error("Prediction save error:", error)
        throw error
      }

      toast({ 
        title: isLifeline ? "Lifeline Used!" : "Success", 
        description: isLifeline ? "Prediction updated during the match!" : "Pick locked in!" 
      })
      fetchData()
    } catch (error: any) {
      console.error("HandlePredict outer error:", error)
      toast({ 
        variant: "destructive", 
        title: "Save Failed", 
        description: error.message || "Failed to save pick." 
      })
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
      <header className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2 text-gray-900 leading-none">
              <Trophy className="h-5 w-5 text-primary" />
              MATCH CENTER
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Global Arena</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-gray-900 uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-gray-200" />
                   <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full border border-yellow-100">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-600">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 mb-10">
        <Card className="rounded-[2rem] border-0 shadow-2xl overflow-hidden bg-white">
          <div className="px-6 py-3 bg-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Updates</h3>
            </div>
            <div className="flex items-center gap-1.5">
               <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Match Pulse</span>
            </div>
          </div>
          <ScrollArea className="h-[180px]">
            <div className="p-3 space-y-2">
              {activityLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Waiting for match action...</p>
                </div>
              ) : (
                activityLogs.map((log) => {
                  const flagUrl = getTeamFlagUrl(log.favorite_team)
                  return (
                    <div key={log.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-50 items-center transition-all hover:bg-gray-50/50 shadow-sm">
                      <Avatar className="h-9 w-9 border-2 border-white shadow-md">
                        {flagUrl ? (
                          <AvatarImage src={flagUrl} className="object-cover" />
                        ) : (
                          <AvatarFallback className="bg-primary/5 text-primary font-black text-[11px]">
                            {getInitials(log.display_name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs uppercase tracking-tight text-gray-900">{log.display_name}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase px-2 py-0.5 bg-gray-50 rounded-full border border-gray-100">
                            {log.action === 'prediction_created' ? 'locked in' : 'updated'}
                          </span>
                        </div>
                        <p className="font-black text-primary uppercase italic text-[12px] tracking-tight truncate mt-0.5">
                          {log.home_team} vs {log.away_team}
                        </p>
                      </div>
                      <div className="text-right">
                         <span className="text-[8px] text-gray-300 font-black uppercase block">
                          {DateTime.fromISO(log.created_at).toRelative()}
                        </span>
                        <ChevronRight className="h-3 w-3 text-gray-100 inline-block mt-1" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {dateTabs.length > 0 && (
        <div className="px-6 py-4 sticky top-[56px] bg-white/95 backdrop-blur-xl z-30 border-b border-gray-100 shadow-sm">
          <div className="flex items-center no-scrollbar overflow-x-auto gap-4 max-w-2xl mx-auto">
            {dateTabs.map((d) => (
              <button
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                className={cn(
                  "flex flex-col items-center min-w-[4.5rem] py-3 rounded-2xl transition-all duration-300 border-2",
                  activeDate === d.iso 
                    ? "bg-primary border-primary text-white shadow-2xl scale-105" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-primary/20 hover:bg-gray-50 shadow-sm"
                )}
              >
                <span className={cn("text-[8px] font-black uppercase mb-0.5 tracking-widest", activeDate === d.iso ? "text-white/80" : "text-gray-400")}>{d.day}</span>
                <span className="text-xl font-black leading-none">{d.date}</span>
                <span className={cn("text-[9px] font-black uppercase mt-0.5 tracking-tighter", activeDate === d.iso ? "text-white/80" : "text-gray-400")}>{d.month}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-4 py-8 space-y-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-primary rounded-full" />
            <h2 className="text-sm font-black uppercase italic text-gray-900 tracking-tight">
              {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Schedule'}
            </h2>
          </div>
          {displayFixtures.some(f => f.status === 'live') && (
            <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase italic animate-pulse shadow-lg">
              <div className="h-1.5 w-1.5 rounded-full bg-white" /> Live Now
            </div>
          )}
        </div>

        {isLoading && fixtures.length === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 bg-white rounded-[2.5rem] animate-pulse border-0 shadow-xl" />
            ))}
          </div>
        ) : displayFixtures.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 shadow-inner mx-2">
            <p className="text-gray-300 font-black uppercase text-[11px] tracking-[0.3em]">No matches scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
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
