
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTeamFlagUrl } from "@/lib/team-flags";

type WorldCupApiGame = {
  id: string;
  home_score: string;
  away_score: string;
  group: string;
  matchday: string;
  local_date: string;
  stadium_id: string;
  finished: "TRUE" | "FALSE";
  time_elapsed: string;
  type: string;
  home_team_name_en?: string;
  away_team_name_en?: string;
  home_team_label?: string;
  away_team_label?: string;
};

type WorldCupApiResponse = {
  games: WorldCupApiGame[];
};

function parseKickoffToUtc(localDate: string) {
  const dt = DateTime.fromFormat(localDate, "MM/dd/yyyy HH:mm", {
    zone: "America/New_York",
  });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

function mapStatus(game: WorldCupApiGame) {
  if (game.finished === "TRUE" || game.time_elapsed === "finished") return "finished";
  if (game.time_elapsed === "live") return "live";
  return "scheduled";
}

function parseScore(value: string, status: string) {
  if (status === "scheduled") return null;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-sync-secret");
    const expectedSecret = process.env.SYNC_SECRET || 'your-secret-here';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (secret !== expectedSecret && !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiUrl = process.env.FIXTURES_API_URL;
    const apiKey = process.env.FIXTURES_API_KEY;

    if (!apiUrl || !apiKey) return NextResponse.json({ error: "Env vars missing" }, { status: 500 });

    const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: `API failed: ${response.status}` }, { status: 500 });

    const data = (await response.json()) as WorldCupApiResponse;
    const { data: existingFixtures } = await supabaseAdmin.from("fixtures").select("*");
    const fixtureMap = new Map(existingFixtures?.map(f => [f.external_id, f]) || []);

    const fixtures = data.games.map((game) => {
      const status = mapStatus(game);
      const apiKickoff = parseKickoffToUtc(game.local_date);
      const existing = fixtureMap.get(game.id);
      const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
      const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";

      // Respect manual override
      const finalKickoff = (existing?.manually_updated_kickoff_at) 
        ? existing.kickoff_at 
        : apiKickoff;

      return {
        external_id: game.id,
        match_number: Number.parseInt(game.id, 10),
        stage: game.type,
        group_name: game.group,
        venue: game.stadium_id ? `Stadium ${game.stadium_id}` : null,
        home_team: homeTeam,
        away_team: awayTeam,
        home_flag: getTeamFlagUrl(homeTeam),
        away_flag: getTeamFlagUrl(awayTeam),
        kickoff_at: finalKickoff,
        status,
        home_score: parseScore(game.home_score, status),
        away_score: parseScore(game.away_score, status),
        result_sync_due_at: DateTime.fromISO(finalKickoff!)
          .plus({ minutes: 110 })
          .toUTC()
          .toISO(),
        result_sync_attempts: existing?.result_sync_attempts || 0,
        result_synced_at: existing?.result_synced_at || null,
      };
    });

    const { error } = await supabaseAdmin.from("fixtures").upsert(fixtures, { onConflict: "external_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: fixtures.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
