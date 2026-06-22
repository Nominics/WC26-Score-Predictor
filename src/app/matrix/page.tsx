
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Zap, LayoutGrid, Trophy, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
import { ModeToggle } from "@/components/mode-toggle"
import { UserAvatar } from "@/components/user-avatar"
import { AppLoadingScreen } from "@/components/layout/app-loading-screen"
import Image from "next/image"
import { DateTime } from "luxon"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function Matrix() {
  const { user, profile, stats, loading: authLoading } = useAuth()
  const [profiles, setProfiles] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user && profile && !profile.display_name) {
      router.replace("/onboarding")
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading])

  const fetchData = async () => {
    try {
      const [pRes, fRes, prRes, lRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, favorite_team, profile_icon_key").order("display_name"),
        supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true }),
        supabase.from("predictions").select("*"),
        supabase.from("leaderboard").select("user_id, total_points")
      ])
      
      if (pRes.error) throw pRes.error
      if (fRes.error) throw fRes.error
      if (prRes.error) throw prRes.error
      if (lRes.error) throw lRes.error

      setProfiles(pRes.data || [])
      setFixtures(fRes.data || [])
      setPredictions(prRes.data || [])
      setLeaderboard(lRes.data || [])
    } catch (err) {
      console.error("Matrix fetch error:", err)
    } finally {
      setLoadingData(false)
    }
  }

  const getPlayerPoints = (userId: string) => {
    return leaderboard.find(l => l.user_id === userId)?.total_points || 0
  }

  const getCellData = (userId: string, fixture: any) => {
    const pred = predictions.find(p => p.user_id === userId && p.fixture_id === fixture.id)
    if (!pred) return { text: "-", color: "bg-muted/30 text-muted-foreground border-border/50", points: null }

    const text = `${pred.predicted_home_score} - ${pred.predicted_away_score}`
    
    if (fixture.status !== 'finished') {
      return { text, color: "bg-card/50 text-foreground border-border/50", points: null }
    }

    if (fixture.home_score === pred.predicted_home_score && fixture.away_score === pred.predicted_away_score) {
      return { 
        text, 
        color: "bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20", 
        points: "+3" 
      }
    }

    const fixtureResult = Math.sign((fixture.home_score || 0) - (fixture.away_score || 0))
    const predResult = Math.sign(pred.predicted_home_score - pred.predicted_away_score)
    if (fixtureResult === predResult) {
      return { 
        text, 
        color: "bg-green-500/15 text-green-600 border-green-500/30", 
        points: "+1" 
      }
    }

    return { 
      text, 
      color: "bg-muted/50 text-muted-foreground border-border/50 opacity-40", 
      points: null 
    }
  }

  if (authLoading || (loadingData && profiles.length === 0)) {
    return <AppLoadingScreen />
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-background/80 backdrop-blur-2xl border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 drop-shadow-xl">
              <Image src="/logo.png" alt="Arena Logo" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter text-foreground uppercase leading-none flex items-center gap-1">
                STRATEGY <span className="text-primary">MATRIX</span>
              </h1>
              <p className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mt-0.5">Heat Map</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <PwaInstallButton />
            <ProfileSheet />
          </div>
        </div>
      </header>

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="bg-card/40 backdrop-blur-2xl rounded-[3rem] border border-border/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent bg-muted/30">
                  <TableHead className="text-muted-foreground font-black uppercase text-[10px] py-12 px-10 sticky left-0 bg-background/95 backdrop-blur-md z-20 border-r border-border/50">
                    <div className="flex flex-col gap-1">
                      <span className="opacity-40 tracking-[0.3em]">FIXTURE</span>
                      <span className="text-foreground text-lg italic tracking-tighter">PREDICTIONS</span>
                    </div>
                  </TableHead>
                  {fixtures.map(f => (
                    <TableHead key={f.id} className="text-center py-8 px-6 min-w-[160px] border-r border-border/50 last:border-0">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest opacity-60">
                          {DateTime.fromISO(f.kickoff_at).toFormat('LLL dd')}
                        </span>
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center justify-between gap-3 bg-muted/50 px-3 py-1.5 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-2">
                              {f.home_flag && <div className="relative h-4 w-6 rounded-sm overflow-hidden border border-white/10"><Image src={f.home_flag} alt="" fill className="object-cover" /></div>}
                              <span className="text-[11px] font-black text-foreground">{f.home_team.substring(0,3).toUpperCase()}</span>
                            </div>
                            <span className="text-[12px] font-black text-primary italic">{f.home_score ?? '-'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 bg-muted/50 px-3 py-1.5 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-2">
                              {f.away_flag && <div className="relative h-4 w-6 rounded-sm overflow-hidden border border-white/10"><Image src={f.away_flag} alt="" fill className="object-cover" /></div>}
                              <span className="text-[11px] font-black text-foreground">{f.away_team.substring(0,3).toUpperCase()}</span>
                            </div>
                            <span className="text-[12px] font-black text-primary italic">{f.away_score ?? '-'}</span>
                          </div>
                        </div>
                        {f.status === 'finished' ? (
                           <span className="bg-primary text-black px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest italic shadow-lg shadow-primary/20">Final</span>
                        ) : f.status === 'live' ? (
                           <span className="bg-emerald-500 text-black px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">Live</span>
                        ) : (
                           <span className="bg-muted text-muted-foreground/60 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">MD {f.matchday}</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map(p => (
                  <TableRow key={p.id} className="border-border/30 hover:bg-primary/[0.02] transition-colors">
                    <TableCell className="px-10 py-8 sticky left-0 bg-background/90 backdrop-blur-md z-10 border-r border-border/50 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-4">
                        <UserAvatar profile={p} className="h-10 w-10 shadow-xl border-primary/20" />
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase tracking-tight text-foreground whitespace-nowrap">{p.display_name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Trophy className="h-3 w-3 text-primary opacity-60" />
                            <span className="text-[10px] font-black text-primary uppercase italic">
                              {getPlayerPoints(p.id)} <span className="text-muted-foreground not-italic opacity-40">PTS</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {fixtures.map(f => {
                      const { text, color, points } = getCellData(p.id, f)
                      return (
                        <TableCell key={f.id} className="text-center p-6">
                          <div className="relative inline-block">
                            <div className={cn(
                              "flex items-center justify-center min-w-[80px] h-12 rounded-2xl font-black text-[14px] border transition-all duration-300",
                              color
                            )}>
                              <span className="tabular-nums tracking-tighter">{text}</span>
                            </div>
                            {points && (
                              <div className="absolute -top-3 -right-3 bg-foreground border border-background rounded-full w-7 h-7 flex items-center justify-center shadow-xl scale-90">
                                <span className={cn(
                                  "text-[10px] font-black text-background italic",
                                )}>
                                  {points}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  )
}
