"use client"

import { FIXTURES, MOCK_USERS, MOCK_PREDICTIONS } from "@/lib/mock-data"
import { MainNav } from "@/components/layout/main-nav"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Matrix() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <MainNav />
      <header className="p-6 bg-gradient-to-b from-blue-500/10 to-transparent">
        <h1 className="text-3xl font-black italic tracking-tighter">PREDICTION MATRIX</h1>
        <p className="text-[10px] text-gray-400 uppercase font-bold">Compare your picks with everyone else</p>
      </header>

      <main className="p-2 overflow-x-auto">
        <div className="min-w-max bg-white/5 rounded-xl border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white font-black uppercase text-[10px]">Player</TableHead>
                {FIXTURES.map(f => (
                  <TableHead key={f.id} className="text-center text-white font-black uppercase text-[10px]">
                    {f.homeTeam.code} vs {f.awayTeam.code}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map(user => (
                <TableRow key={user.id} className="border-white/5 hover:bg-white/10">
                  <TableCell className="font-bold text-xs text-secondary uppercase whitespace-nowrap">{user.displayName}</TableCell>
                  {FIXTURES.map(f => {
                    const p = MOCK_PREDICTIONS.find(pred => pred.userId === user.id && pred.fixtureId === f.id)
                    return (
                      <TableCell key={f.id} className="text-center">
                        <span className="bg-white/5 px-2 py-1 rounded font-black text-sm border border-white/5">
                          {p ? `${p.homeScore} - ${p.awayScore}` : '-'}
                        </span>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}
