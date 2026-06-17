
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Grid2X2, Trophy, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"
import { PwaInstallButton } from "@/components/pwa-install-button"
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
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && user && profile && !profile.display_name) {
      router.replace("/onboarding")
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pRes, fRes, prRes, lRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name").order("display_name"),
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
      setLoading(false)
    }
  }

  const getPlayerPoints = (userId: string) => {
    return leaderboard.find(l => l.user_id === userId)?.total_points || 0
  }

  const getCellData = (userId: string, fixture: any) => {
    const pred = predictions.find(p => p.user_id === userId && p.fixture_id === fixture.id)
    if (!pred) return { text: "-", color: "bg-gray-50 text-gray-300 border-gray-100", points: null }

    const text = `${pred.predicted_home_score} - ${pred.predicted_away_score}`
    
    if (fixture.status !== 'finished') {
      return { text, color: "bg-white text-gray-900 border-gray-100", points: null }
    }

    if (fixture.home_score === pred.predicted_home_score && fixture.away_score === pred.predicted_away_score) {
      return { 
        text, 
        color: "bg-green-500 text-white border-green-600 shadow-sm", 
        points: "+3" 
      }
    }

    const fixtureResult = Math.sign((fixture.home_score || 0) - (fixture.away_score || 0))
    const predResult = Math.sign(pred.predicted_home_score - pred.predicted_away_score)
    if (fixtureResult === predResult) {
      return { 
        text, 
        color: "bg-green-50 text-green-700 border-green-200 shadow-sm", 
        points: "+1" 
      }
    }

    return { 
      text, 
      color: "bg-gray-100 text-gray-400 border-gray-200", 
      points: null 
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 py-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-14">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter text-gray-900 uppercase">
              STRATEGY <span className="text-primary">MATRIX</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Live Arena Insights</p>
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

      <main className="px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Compiling the Matrix...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                    <TableHead className="text-gray-400 font-bold uppercase text-[10px] py-10 px-8 sticky left-0 bg-gray-50 z-20 border-r border-gray-100">
                      <div className="flex flex-col">
                        <span>Fixture</span>
                        <span className="text-gray-900 font-black text-lg mt-1">Predictions</span>
                      </div>
                    </TableHead>
                    {fixtures.map(f => (
                      <TableHead key={f.id} className="text-center py-6 px-4 min-w-[140px] border-r border-gray-100 last:border-0">
                        <div className="flex flex-col items-center space-y-2">
                          <span className="text-[9px] font-black uppercase text-gray-400">
                            {DateTime.fromISO(f.kickoff_at).toFormat('LLL dd')}
                          </span>
                          <div className="flex items-center gap-2">
                            {f.home_flag && <div className="relative h-4 w-4 rounded-full overflow-hidden shadow-sm"><Image src={f.home_flag} alt="" fill className="object-cover" /></div>}
                            <span className="text-[10px] font-black text-gray-900">{f.home_team.substring(0,3).toUpperCase()}</span>
                            <span className="text-[10px] font-black text-gray-900">{f.home_score ?? ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {f.away_flag && <div className="relative h-4 w-4 rounded-full overflow-hidden shadow-sm"><Image src={f.away_flag} alt="" fill className="object-cover" /></div>}
                            <span className="text-[10px] font-black text-gray-900">{f.away_team.substring(0,3).toUpperCase()}</span>
                            <span className="text-[10px] font-black text-gray-900">{f.away_score ?? ''}</span>
                          </div>
                          {f.status === 'finished' ? (
                             <span className="bg-green-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest italic">Final</span>
                          ) : (
                             <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">{f.match_number}</span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(profile => (
                    <TableRow key={profile.id} className="border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <TableCell className="px-8 py-6 sticky left-0 bg-white z-10 border-r border-gray-100">
                        <div className="flex flex-col">
                          <span className="font-black text-sm uppercase tracking-tight text-gray-900">{profile.display_name}</span>
                          <span className="text-[10px] font-black text-primary uppercase mt-0.5 italic">
                            {getPlayerPoints(profile.id)} <span className="text-gray-400 not-italic">PTS</span>
                          </span>
                        </div>
                      </TableCell>
                      {fixtures.map(f => {
                        const { text, color, points } = getCellData(profile.id, f)
                        return (
                          <TableCell key={f.id} className="text-center p-4">
                            <div className="relative inline-block">
                              <div className={cn(
                                "flex items-center justify-center min-w-[70px] h-10 rounded-xl font-black text-[13px] border transition-all shadow-sm",
                                color
                              )}>
                                <span className="tabular-nums tracking-tighter">{text}</span>
                              </div>
                              {points && (
                                <div className="absolute -top-2 -right-2 bg-white border border-gray-100 rounded-full w-6 h-6 flex items-center justify-center shadow-md scale-75">
                                  <span className={cn(
                                    "text-[9px] font-black",
                                    points === "+3" ? "text-green-500" : "text-green-600"
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
        )}
      </main>
    </div>
  )
}
