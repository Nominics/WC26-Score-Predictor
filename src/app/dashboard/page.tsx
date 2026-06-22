
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Zap, Activity, ChevronRight, Loader2, Star } from "lucide-react"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { UserAvatar } from "@/components/user-avatar"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/layout/notification-bell"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function Dashboard() {
  const { user: authUser, profile, loading: authLoading, stats, useLifeline } = useAuth()
  const { toast } = useToast()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [supporters, setSupporters] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && authUser && profile && !profile.display_name) {
      router.replace("/onboarding")
    }
  }, [authUser, profile, authLoading, router])

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

      return () => {
        supabase.removeChannel(fixturesChannel)
        supabase.removeChannel(predictionsChannel)
      }
    }
  }, [authUser])

  useEffect(() => {
    if (activeDate && scrollContainerRef.current) {
      const activeTab = document.getElementById(`date-tab-${activeDate}`)
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [activeDate])

  const fetchData = async () => {
    if (!authUser) return
    try {
      const [fRes, pRes, sRes] = await Promise.all([
        supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true }),
        supabase.from("predictions").select("fixture_id, predicted_home_score, predicted_away_score").eq("user_id", authUser.id),
        supabase.from("fixture_prediction_supporters").select("*")
      ])
      
      if (fRes.error) throw fRes.error
      if (pRes.error) throw pRes.error
      if (sRes.error) throw sRes.error

      setFixtures(fRes.data || [])
      setPredictions(pRes.data || [])
      setSupporters(sRes.data || [])

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
      .limit(10)
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
          user_id: authUser?.id,
          fixture_id: fixtureId,
          predicted_home_score: Number(h),
          predicted_away_score: Number(a),
        }, { onConflict: 'user_id,fixture_id' })

      if (error) throw error

      toast({ 
        title: isLifeline ? "Lifeline Used!" : "Success", 
        description: isLifeline ? "Prediction updated during the match!" : "Pick locked in!" 
      })
      fetchData()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message || "Failed to save pick." })
    }
  }

  if (authLoading && fixtures.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-2 text-foreground leading-none uppercase">
              <div className="relative h-6 w-6 shrink-0">
                <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
              </div>
              MATCH <span className="text-primary">CENTER</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Global Arena</p>
               {stats && (
                 <div className="flex items-center gap-1.5">
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <span className="text-[9px] font-black text-primary uppercase italic">Rank #{stats.rank}</span>
                   <span className="text-[9px] font-black text-foreground uppercase">({stats.points} pts)</span>
                   <span className="h-0.5 w-0.5 rounded-full bg-border" />
                   <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                      <Zap className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-500">{stats.lifelines}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 mb-10">
        <Card className="rounded-[2.5rem] border-0 shadow-2xl overflow-hidden bg-card transition-all hover:shadow-primary/5">
          <div className="px-6 py-3 bg-secondary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Activity</h3>
            </div>
            <div className="flex items-center gap-1.5">
               <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Match Pulse</span>
            </div>
          </div>
          <ScrollArea className="h-[220px]">
            <div className="p-3 space-y-2">
              {activityLogs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Waiting for match action...</p>
                </div>
              ) : (
                activityLogs.map((log) => {
                  const isManual = log.action === 'manual_points_awarded'
                  
                  return (
                    <div key={log.id} className="flex gap-4 p-4 bg-card rounded-[2rem] border border-border items-center transition-all hover:bg-muted/50 shadow-sm group">
                      <UserAvatar profile={log} className="h-9 w-9" />
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs uppercase tracking-tight text-foreground">{log.display_name}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border whitespace-nowrap",
                            isManual 
                              ? (log.points_awarded > 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20")
                              : "bg-muted text-muted-foreground border-border"
                          )}>
                            {isManual 
                              ? `${log.points_awarded > 0 ? '+' : ''}${log.points_awarded} Bonus`
                              : (log.action === 'prediction_created' ? 'locked in' : 'updated')
                            }
                          </span>
                        </div>
                        {isManual ? (
                          <p className="text-[10px] font-bold text-muted-foreground italic truncate mt-0.5">
                            "{log.reason}"
                          </p>
                        ) : (
                          <p className="font-black text-primary uppercase italic text-[12px] tracking-tight truncate mt-0.5 group-hover:text-foreground transition-colors">
                            {log.home_team} vs {log.away_team}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end">
                         <span className="text-[8px] text-muted-foreground font-black uppercase block">
                          {hasMounted ? DateTime.fromISO(log.created_at).toRelative() : '...'}
                        </span>
                        {isManual ? <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 mt-1" /> : <ChevronRight className="h-3 w-3 text-muted-foreground mt-1" />}
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
        <div className="px-6 py-4 sticky top-[56px] bg-background/95 backdrop-blur-xl z-30 border-b border-border shadow-sm">
          <div ref={scrollContainerRef} className="flex items-center no-scrollbar overflow-x-auto gap-4 max-w-2xl mx-auto">
            {dateTabs.map((d) => (
              <button
                id={`date-tab-${d.iso}`}
                key={d.iso}
                onClick={() => setActiveDate(d.iso)}
                className={cn(
                  "flex flex-col items-center min-w-[4.5rem] py-3 rounded-[2rem] transition-all duration-300 border-2",
                  activeDate === d.iso 
                    ? "bg-primary border-primary text-primary-foreground shadow-2xl scale-105" 
                    : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:bg-muted shadow-sm"
                )}
              >
                <span className={cn("text-[8px] font-black uppercase mb-0.5 tracking-widest", activeDate === d.iso ? "text-primary-foreground/80" : "text-muted-foreground")}>{d.day}</span>
                <span className="text-xl font-black leading-none">{d.date}</span>
                <span className={cn("text-[9px] font-black uppercase mt-0.5 tracking-tighter", activeDate === d.iso ? "text-primary-foreground/80" : "text-muted-foreground")}>{d.month}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-4 py-8 space-y-8 max-w-2xl mx-auto">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-primary rounded-full" />
            <h2 className="text-sm font-black uppercase italic text-foreground tracking-tight">
              {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Schedule'}
            </h2>
          </div>
          {displayFixtures.some(f => f.status === 'live') && (
            <div className="flex items-center gap-2 bg-emerald-500 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase italic animate-pulse shadow-lg">
              <div className="h-1.5 w-1.5 rounded-full bg-black" /> Live Now
            </div>
          )}
        </div>

        {isLoading && fixtures.length === 0 ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 bg-card rounded-[2.5rem] animate-pulse border-0 shadow-xl" />
            ))}
          </div>
        ) : displayFixtures.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-[2.5rem] border-2 border-dashed border-border shadow-inner mx-2">
            <p className="text-muted-foreground font-black uppercase text-[11px] tracking-[0.3em]">No matches scheduled</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayFixtures.map((fixture) => {
              const pred = predictions.find(p => p.fixture_id === fixture.id)
              const supportersForFixture = supporters.filter(s => s.fixture_id === fixture.id)
              return (
                <FixtureCard 
                  key={fixture.id} 
                  fixture={fixture} 
                  initialHome={pred?.predicted_home_score}
                  initialAway={pred?.predicted_away_score}
                  onSave={handlePredict}
                  lifelinesRemaining={stats?.lifelines || 0}
                  userProfile={profile}
                  supporters={supportersForFixture}
                  currentUserId={authUser?.id}
                />
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
