
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Info, Grid2X2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfileSheet } from "@/components/profile/profile-sheet"

export default function Matrix() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pRes, fRes, prRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name").order("display_name"),
        supabase.from("fixtures").select("*").order("kickoff_at", { ascending: true }),
        supabase.from("predictions").select("*")
      ])
      
      if (pRes.error) throw pRes.error
      if (fRes.error) throw fRes.error
      if (prRes.error) throw prRes.error

      setProfiles(pRes.data || [])
      setFixtures(fRes.data || [])
      setPredictions(prRes.data || [])
    } catch (err) {
      console.error("Matrix fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getCellData = (userId: string, fixture: any) => {
    const pred = predictions.find(p => p.user_id === userId && p.fixture_id === fixture.id)
    if (!pred) return { text: "-", color: "bg-gray-50 text-gray-300 border-gray-100", points: null }

    const text = `${pred.predicted_home_score}-${pred.predicted_away_score}`
    
    // Scoring logic
    if (fixture.status !== 'finished') {
      return { text, color: "bg-primary/5 text-primary border-primary/10", points: null }
    }

    // Exact score: +3
    if (fixture.home_score === pred.predicted_home_score && fixture.away_score === pred.predicted_away_score) {
      return { text, color: "bg-green-100 text-green-700 border-green-200", points: "+3" }
    }

    // Correct result: +1
    const fixtureResult = Math.sign((fixture.home_score || 0) - (fixture.away_score || 0))
    const predResult = Math.sign(pred.predicted_home_score - pred.predicted_away_score)
    if (fixtureResult === predResult) {
      return { text, color: "bg-amber-100 text-amber-700 border-amber-200", points: "+1" }
    }

    // Wrong result: +0
    return { text, color: "bg-red-50 text-red-600 border-red-100", points: "+0" }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground pb-32">
      <MainNav />
      <header className="px-6 pt-12 pb-6 bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter flex items-center gap-2 text-gray-900">
              <Grid2X2 className="h-6 w-6 text-primary" />
              STRATEGY MATRIX
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[9px] font-black uppercase text-gray-400">Exact (+3)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[9px] font-black uppercase text-gray-400">Result (+1)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] font-black uppercase text-gray-400">Wrong (+0)</span>
              </div>
            </div>
          </div>
          <ProfileSheet />
        </div>
      </header>

      <main className="px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent bg-gray-50/50">
                    <TableHead className="text-gray-900 font-black uppercase text-[10px] py-6 px-8 sticky left-0 bg-gray-50 z-10 border-r border-gray-100">
                      Player
                    </TableHead>
                    {fixtures.map(f => (
                      <TableHead key={f.id} className="text-center text-gray-900 font-black uppercase text-[10px] py-6 min-w-[100px]">
                        <div className="flex flex-col items-center">
                          <span className="text-gray-400 mb-1">{f.home_team.substring(0,3)} v {f.away_team.substring(0,3)}</span>
                          {f.status === 'finished' ? (
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[9px]">
                              {f.home_score}-{f.away_score}
                            </span>
                          ) : (
                            <span className="text-primary text-[8px] opacity-60 tracking-widest">{f.match_number}</span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(profile => (
                    <TableRow key={profile.id} className="border-gray-50 hover:bg-gray-50/30 transition-colors">
                      <TableCell className="font-bold text-xs text-primary uppercase whitespace-nowrap px-8 sticky left-0 bg-white z-10 border-r border-gray-100">
                        {profile.display_name}
                      </TableCell>
                      {fixtures.map(f => {
                        const { text, color, points } = getCellData(profile.id, f)
                        return (
                          <TableCell key={f.id} className="text-center">
                            <div className={cn(
                              "inline-flex flex-col items-center justify-center min-w-[60px] py-2 rounded-xl font-black text-[12px] border transition-all",
                              color
                            )}>
                              <span className="tabular-nums">{text}</span>
                              {points && (
                                <span className="text-[9px] mt-0.5 opacity-80">{points}</span>
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

        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 flex gap-4 items-start shadow-sm">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Info className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div>
              <p className="text-[11px] text-gray-900 font-black uppercase italic tracking-tight">System Notice</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide leading-relaxed mt-1">
                The matrix reflects live changes. Scoring (+3 for exact, +1 for correct outcome) is applied automatically once a match is marked as finished.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

