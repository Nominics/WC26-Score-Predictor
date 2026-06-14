"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MainNav } from "@/components/layout/main-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"

export default function Matrix() {
  const [data, setData] = useState<any[]>([])
  const [fixtures, setFixtures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchMatrix()
  }, [])

  const fetchMatrix = async () => {
    try {
      // Fetch predictions via the matrix view
      const { data: matrixData, error: mError } = await supabase
        .from("prediction_matrix")
        .select("*")
      
      if (mError) throw mError

      // Fetch fixtures to get headers
      const { data: fixData, error: fError } = await supabase
        .from("fixtures")
        .select("id, home_team, away_team")
        .order("kickoff_at", { ascending: true })
      
      if (fError) throw fError

      setFixtures(fixData || [])
      setData(matrixData || [])
    } catch (err) {
      console.error("Matrix fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-8 bg-gradient-to-b from-primary/20 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">PREDICTION MATRIX</h1>
        <p className="text-[10px] text-gray-400 uppercase font-bold mt-1">Global Strategy Board</p>
      </header>

      <main className="p-4 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="min-w-max bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                  <TableHead className="text-white font-black uppercase text-[10px] py-6 px-6">Player</TableHead>
                  {fixtures.map(f => (
                    <TableHead key={f.id} className="text-center text-white font-black uppercase text-[10px] py-6">
                      {f.home_team.substring(0,3)} v {f.away_team.substring(0,3)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={fixtures.length + 1} className="text-center py-20 text-gray-500 font-bold uppercase text-[10px]">
                      No predictions recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map(row => (
                    <TableRow key={row.user_id} className="border-white/5 hover:bg-white/10 transition-colors">
                      <TableCell className="font-bold text-xs text-primary uppercase whitespace-nowrap px-6">{row.display_name}</TableCell>
                      {fixtures.map(f => (
                        <TableCell key={f.id} className="text-center">
                          <span className="bg-white/5 px-3 py-1.5 rounded-xl font-black text-[11px] border border-white/5 tabular-nums">
                            {row[`f_${f.id}`] || '-'}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  )
}