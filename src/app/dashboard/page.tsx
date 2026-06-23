"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { MainNav } from "@/components/layout/main-nav"
import { FixtureCard } from "@/components/fixtures/fixture-card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Zap, ChevronRight, Radio } from "lucide-react"
import { DateTime } from "luxon"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/layout/notification-bell"
import { useRouter } from "next/navigation"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"
import Image from "next/image"
import Link from "next/link"

const APP_ZONE = "Indian/Maldives"

export default function Dashboard() {
  const { user: authUser, profile, loading: authLoading, stats, useLifeline } = useAuth()
  const { toast } = useToast()
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [supporters, setSupporters] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!authUser) {
        router.replace("/")
      } else if (profile && !profile.display_name) {
        router.replace("/onboarding")
      }
    }
  }, [authUser, profile, authLoading, router])

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchData()
      fetchActivity()
      
      const fixturesChannel = supabase
        .channel('fixtures-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => fetchData())
        .subscribe()

      const pulseChannel = supabase
        .channel('pulse-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_pulse_events' }, () => fetchActivity())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchActivity())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predictions' }, () => fetchActivity())
        .subscribe()

      const handleFocus = () => fetchData()
      window.addEventListener('focus', handleFocus)

      return () => {
        supabase.removeChannel(fixturesChannel)
        supabase.removeChannel(pulseChannel)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [authUser?.id, authLoading])

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
        supabase.from("fixture_prediction_supporters").select("*").order("updated_at", { ascending: false })
      ])
      
      if (fRes.error) throw fRes.error
      if (pRes.error) throw pRes.error
      if (sRes.error) throw sRes.error

      setFixtures(fRes.data || [])
      setPredictions(pRes.data || [])
      setSupporters(sRes.data || [])

      if (fRes.data && fRes.data.length > 0) {
        const now = DateTime.now().setZone(APP_ZONE).toISODate()
        
        const nearestMatch = fRes.data.find((f: any) => 
          DateTime.fromISO(f.kickoff_at).setZone(APP_ZONE).toISODate() >= now
        )

        const calculatedDate = nearestMatch 
          ? DateTime.fromISO(nearestMatch.kickoff_at).setZone(APP_ZONE).toISODate() 
          : DateTime.fromISO(fRes.data[fRes.data.length - 1].kickoff_at).setZone(APP_ZONE).toISODate()

        const currentMatches = fRes.data.filter((f: any) => 
          DateTime.fromISO(f.kickoff_at).setZone(APP_ZONE).toISODate() === activeDate
        )

        if (!activeDate || (currentMatches.length === 0)) {
          setActiveDate(calculatedDate)
        }
      }

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchActivity = async () => {
    const { data } = await supabase
      .from("match_pulse_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
    setActivityLogs(data || [])
  }

  const dateTabs = useMemo(() => {
    const dates = new Set<string>()
    fixtures.forEach(f => {
      if (f.kickoff_at) {
        const d = DateTime.fromISO(f.kickoff_at).setZone(APP_ZONE).toISODate()
        if (d) dates.add(d)
      }
    })
    return Array.from(dates).sort().map(d => {
      const dt = DateTime.fromISO(d).setZone(APP_ZONE)
      return {
        iso: d,
        day: dt.toFormat('ccc'),
        date: dt.toFormat('dd'),
        month: dt.toFormat('MMM')
      }
    })
  }, [fixtures])

  const displayFixtures = useMemo(() => {
    if (!activeDate) return []
    return fixtures.filter(f => 
      DateTime.fromISO(f.kickoff_at).setZone(APP_ZONE).toISODate() === activeDate
    )
  }, [fixtures, activeDate])

  const handlePredict = async (fixtureId: string, h: number, a: number, isLifeline: boolean) => {
    const newH = Number(h)
    const newA = Number(a)

    const existing = predictions.find(p => p.fixture_id === fixtureId)
    if (existing && 
        existing.predicted_home_score === newH && 
        existing.predicted_away_score === newA) {
      return
    }

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
          predicted_home_score: newH,
          predicted_away_score: newA,
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

  if (authLoading || (authUser && isLoadingData && fixtures.length === 0)) {
    return <AppLoadingScreen />
  }

  return (
    <div className="min-h-screen pb-32 flex flex-col items-center">
      <MainNav />
      <header className="premium-header w-full flex justify-center sticky top-0 z-40">
        <div className="max-w-md w-full flex justify-between items-center h-12 sm:h-14 px-4">
          <div className="flex items-center gap-2.5 overflow-visible">
            <div className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div className="overflow-visible">
              <h1 className="text-lg sm:text-xl leading-none flex items-center gap-1 overflow-visible">
                <span className="premium-gold-gradient-heading">ARENA</span> <span className="text-foreground font-black italic tracking-tighter">CENTER</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5 overflow-visible">
                 {stats && (
                   <div className="flex items-center gap-1.5 overflow-visible">
                     <span className="premium-gold-gradient-heading text-[8px] sm:text-[9px] uppercase italic">Rank #{stats.rank}</span>
                     <span className="h-0.5 w-0.5 rounded-full bg-border" />
                     <div className="flex items-center gap-1 bg-primary/10 px-1 py-0.5 rounded-full border border-primary/20">
                        <Zap className="h-2 w-2 text-primary fill-primary" />
                        <span className="text-[8px] font-black text-primary">{stats.lifelines}</span>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ModeToggle />
            <NotificationBell />
            <PwaInstallButton />
          </div>
        </div>
      </header>

      <div className="max-w-md w-full px-4 pt-4 sm:pt-6 mb-2">
        <Card className="app-glass-card border-primary/5 overflow-visible">
          <div className="px-4 py-2 bg-muted/20 backdrop-blur-md flex items-center justify-between border-b border-border/40 overflow-visible">
            <div className="flex items-center gap-2 overflow-visible">
              <div className="relative flex items-center justify-center overflow-visible">
                <Radio className="h-2.5 w-2.5 text-red-500 animate-pulse relative z-10" />
                <span className="absolute inset-0 bg-red-500/20 rounded-full animate-ping scale-150" />
              </div>
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/80">Arena Pulse</h3>
            </div>
            <Link href="/activity" className="group flex items-center gap-1 overflow-visible">
              <span className="premium-gold-gradient-heading text-[8px] uppercase tracking-widest transition-colors">History</span>
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/30 group-hover:text-primary transition-all" />
            </Link>
          </div>
          
          <ScrollArea className="h-[120px] sm:h-[150px] bg-black/[0.02] dark:bg-white/[0.01]" hideScrollbar>
            <div className="p-2 py-1">
              {activityLogs.length === 0 ? (
                <div className="py-10 text-center opacity-40">
                  <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Awaiting Pulse...</p>
                </div>
              ) : (
                activityLogs.map((log) => {
                  if (log.event_type === 'prediction_updated' && log.metadata?.old_score === log.metadata?.new_score) return null;
                  
                  let displayTitle = log.title;
                  let displayEmoji = log.emoji || '⚽';

                  if (log.event_type === 'prediction_created') {
                    displayTitle = "PICK LOCKED";
                    displayEmoji = "🔥";
                  } else if (log.event_type === 'prediction_updated') {
                    displayTitle = "PICK EDITED";
                    displayEmoji = "✏️";
                  }

                  return (
                    <div key={log.id} className="flex gap-2 py-1.5 border-b border-border/5 last:border-0 items-center group overflow-visible">
                      <span className="shrink-0 text-xs sm:text-sm grayscale-[0.3] group-hover:grayscale-0 transition-all">{displayEmoji}</span>
                      <span className="shrink-0 font-mono text-[8px] text-muted-foreground/60 tabular-nums">
                        {hasMounted ? DateTime.fromISO(log.created_at).toLocal().toFormat('HH:mm') : '--:--'}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-visible">
                        <span className="premium-gold-gradient-heading shrink-0 uppercase tracking-tight text-[8px] min-w-[60px]">
                          {displayTitle}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground/80 truncate leading-none">
                          {log.message}
                        </span>
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
        <div className="w-full flex justify-center py-3 sm:py-5 sticky top-[48px] sm:top-[56px] bg-white/80 dark:bg-slate-950/60 backdrop-blur-2xl z-30 border-b border-border/40 shadow-xl overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-40" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-40" />
          
          <div ref={scrollContainerRef} className="flex items-center no-scrollbar overflow-x-auto gap-2 px-4 sm:px-6 max-w-md w-full scroll-smooth">
            {dateTabs.map((d) => {
              const isActive = activeDate === d.iso
              return (
                <button
                  id={`date-tab-${d.iso}`}
                  key={d.iso}
                  onClick={() => setActiveDate(d.iso)}
                  className={cn(
                    "flex flex-col items-center min-w-[3.8rem] h-20 sm:h-24 py-2 sm:py-3 rounded-[1.4rem] sm:rounded-[1.8rem] transition-all duration-500 border-2 relative isolate",
                    isActive 
                      ? "premium-gold-gradient-bg border-yellow-300 text-black shadow-2xl scale-[1.03] z-20 ring-4 ring-yellow-400/20" 
                      : "bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 shadow-sm"
                  )}
                >
                  <span className={cn(
                    "text-[6px] sm:text-[8px] font-black uppercase mb-0.5 tracking-[0.2em] transition-colors", 
                    isActive ? "text-black/60" : "text-muted-foreground/60"
                  )}>
                    {d.day}
                  </span>
                  <span className={cn(
                    "text-lg sm:text-2xl font-black leading-tight tracking-tighter transition-transform duration-500",
                    isActive && "scale-110 drop-shadow-sm"
                  )}>
                    {d.date}
                  </span>
                  <span className={cn(
                    "text-[7px] sm:text-[9px] font-black uppercase mt-0.5 tracking-tighter transition-colors", 
                    isActive ? "text-black/60" : "text-muted-foreground/60"
                  )}>
                    {d.month}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <main className="max-w-md w-full px-4 py-6 sm:py-8 space-y-6 sm:space-y-10 pb-32">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-1 premium-gold-gradient-bg rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <h2 className="text-[12px] sm:text-sm font-black uppercase italic text-foreground tracking-[0.15em]">
              {activeDate ? DateTime.fromISO(activeDate).setZone(APP_ZONE).toFormat('MMMM dd, yyyy') : 'Schedule'}
            </h2>
          </div>
          {displayFixtures.some(f => f.status === 'live') && (
            <div className="status-pill pill-live px-3 py-1 text-[8px] sm:text-[9px]">
              <div className="h-1 w-1 rounded-full bg-black" /> LIVE
            </div>
          )}
        </div>

        {displayFixtures.length === 0 ? (
          <div className="text-center py-20 app-surface-panel border-dashed border-2 mx-2">
            <p className="text-muted-foreground font-black uppercase text-[10px] tracking-[0.3em]">No matches scheduled</p>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {displayFixtures.map((fixture) => {
              const myPrediction = predictions.find(p => p.fixture_id === fixture.id)
              const supportersForFixture = supporters.filter(s => s.fixture_id === fixture.id)
              return (
                <FixtureCard 
                  key={fixture.id} 
                  fixture={fixture} 
                  myPrediction={myPrediction}
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
