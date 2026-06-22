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
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/layout/notification-bell"
import { useRouter } from "next/navigation"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"
import Image from "next/image"
import Link from "next/link"

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

  // Navigation Logic: Wait for auth to finish loading
  useEffect(() => {
    if (!authLoading) {
      if (!authUser) {
        router.replace("/")
      } else if (profile && !profile.display_name) {
        router.replace("/onboarding")
      }
    }
  }, [authUser, profile, authLoading, router])

  // Data Loading Logic: Only run when auth is ready and user exists
  useEffect(() => {
    if (!authLoading && authUser) {
      fetchData()
      fetchActivity()
      
      const fixturesChannel = supabase
        .channel('fixtures-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fixtures' }, () => fetchData())
        .subscribe()

      const pulseChannel = supabase
        .channel('pulse-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_pulse_events' }, () => fetchActivity())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => fetchActivity())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predictions' }, () => fetchActivity())
        .subscribe()

      return () => {
        supabase.removeChannel(fixturesChannel)
        supabase.removeChannel(pulseChannel)
      }
    }
  }, [authUser?.id, authLoading])

  // Scroll logic for date tabs
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

  // Show branded loading screen if auth is pending or initial user-specific data is loading
  if (authLoading || (authUser && isLoadingData && fixtures.length === 0)) {
    return <AppLoadingScreen />
  }

  return (
    <div className="min-h-screen pb-32">
      <MainNav />
      <header className="premium-header">
        <div className="max-w-2xl mx-auto flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter flex items-center gap-1 leading-none uppercase">
                <span className="premium-gold-gradient-text">ARENA</span> <span className="text-foreground">CENTER</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                 {stats && (
                   <div className="flex items-center gap-1.5">
                     <span className="text-[9px] font-black premium-gold-gradient-text uppercase italic tracking-wider">Rank #{stats.rank}</span>
                     <span className="h-0.5 w-0.5 rounded-full bg-border" />
                     <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                        <Zap className="h-2 w-2 text-primary fill-primary" />
                        <span className="text-[8px] font-black text-primary">{stats.lifelines}</span>
                     </div>
                   </div>
                 )}
              </div>
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

      <div className="max-w-2xl mx-auto px-4 pt-8 mb-4">
        <Card className="app-glass-card border-primary/5 overflow-hidden">
          <div className="px-5 py-3 bg-muted/20 backdrop-blur-md flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <Radio className="h-3 w-3 text-red-500 animate-pulse relative z-10" />
                <span className="absolute inset-0 bg-red-500/20 rounded-full animate-ping scale-150" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/80">Arena Pulse</h3>
            </div>
            <Link href="/activity" className="group flex items-center gap-1.5">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest group-hover:premium-gold-gradient-text transition-colors">History</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
            </Link>
          </div>
          
          <ScrollArea className="h-[180px] bg-black/[0.02] dark:bg-white/[0.01]" hideScrollbar>
            <div className="p-3 py-1">
              {activityLogs.length === 0 ? (
                <div className="py-16 text-center opacity-40">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Waiting for match data...</p>
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
                    <div key={log.id} className="flex gap-3 py-2 border-b border-border/5 last:border-0 items-center group">
                      <span className="shrink-0 text-sm grayscale-[0.3] group-hover:grayscale-0 transition-all scale-90 group-hover:scale-100">{displayEmoji}</span>
                      <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60 tabular-nums">
                        {hasMounted ? DateTime.fromISO(log.created_at).toLocal().toFormat('HH:mm') : '--:--'}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="font-black text-foreground/90 shrink-0 uppercase tracking-tight text-[9px] min-w-[70px]">
                          {displayTitle}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground/80 truncate leading-none">
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
        <div className="py-6 sticky top-[72px] bg-white/80 dark:bg-slate-950/60 backdrop-blur-2xl z-30 border-b border-border/40 shadow-xl overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-40" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-40" />
          
          <div ref={scrollContainerRef} className="flex items-center no-scrollbar overflow-x-auto gap-3 px-6 max-w-2xl mx-auto scroll-smooth">
            {dateTabs.map((d) => {
              const isActive = activeDate === d.iso
              return (
                <button
                  id={`date-tab-${d.iso}`}
                  key={d.iso}
                  onClick={() => setActiveDate(d.iso)}
                  className={cn(
                    "flex flex-col items-center min-w-[4.6rem] py-3.5 rounded-[2rem] transition-all duration-500 border-2 relative isolate",
                    isActive 
                      ? "premium-gold-gradient-bg border-yellow-300 text-black shadow-2xl scale-105 z-20 ring-4 ring-yellow-400/20" 
                      : "bg-white/80 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 shadow-sm"
                  )}
                >
                  <span className={cn(
                    "text-[8px] font-black uppercase mb-0.5 tracking-[0.2em] transition-colors", 
                    isActive ? "text-black/60" : "text-muted-foreground/60"
                  )}>
                    {d.day}
                  </span>
                  <span className={cn(
                    "text-2xl font-black leading-none tracking-tighter transition-transform duration-500",
                    isActive && "scale-110 drop-shadow-sm"
                  )}>
                    {d.date}
                  </span>
                  <span className={cn(
                    "text-[9px] font-black uppercase mt-0.5 tracking-tighter transition-colors", 
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

      <main className="px-4 py-8 space-y-10 max-w-2xl mx-auto">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1.5 premium-gold-gradient-bg rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <h2 className="text-sm font-black uppercase italic text-foreground tracking-widest">
              {activeDate ? DateTime.fromISO(activeDate).toFormat('MMMM dd, yyyy') : 'Schedule'}
            </h2>
          </div>
          {displayFixtures.some(f => f.status === 'live') && (
            <div className="status-pill pill-live px-4 py-1.5 text-[10px]">
              <div className="h-1.5 w-1.5 rounded-full bg-black" /> LIVE ARENA
            </div>
          )}
        </div>

        {displayFixtures.length === 0 ? (
          <div className="text-center py-32 app-surface-panel border-dashed border-2 mx-4">
            <p className="text-muted-foreground font-black uppercase text-[11px] tracking-[0.4em]">No matches scheduled</p>
          </div>
        ) : (
          <div className="space-y-8 px-2">
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