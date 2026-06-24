import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  const { data: dueFixtures, error: dueError } = await supabaseAdmin
    .from("fixtures")
    .select("*")
    .lte("result_sync_due_at", nowIso)
    .is("result_synced_at", null)
    .order("kickoff_at", { ascending: true })
    .limit(10);

  if (dueError) return NextResponse.json({ error: dueError.message }, { status: 500 });
  if (!dueFixtures || dueFixtures.length === 0) return NextResponse.json({ success: true, message: "No fixtures due.", synced: 0 });

  const apiUrl = process.env.FIXTURES_API_URL;
  const apiKey = process.env.FIXTURES_API_KEY;

  if (!apiUrl || !apiKey) return NextResponse.json({ error: "Config missing" }, { status: 500 });

  const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: `API failed: ${response.status}` }, { status: 500 });

  const data = (await response.json()) as WorldCupApiResponse;
  const fixtureMap = new Map(dueFixtures.map(f => [f.external_id, f]));
  const apiGamesDue = data.games.filter((game) => fixtureMap.has(game.id));

  const updates = apiGamesDue.map((game) => {
    const status = mapStatus(game);
    const existing = fixtureMap.get(game.id);
    const apiKickoff = parseKickoffToUtc(game.local_date);
    const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
    const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";

    // Respect manual kickoff override
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
      api_kickoff_at: apiKickoff,
      status,
      home_score: parseScore(game.home_score, status),
      away_score: parseScore(game.away_score, status),
      result_synced_at: status === 'finished' ? new Date().toISOString() : null,
      result_sync_attempts: (existing?.result_sync_attempts || 0) + 1,
      result_sync_due_at: status !== 'finished' 
        ? DateTime.now().plus({ minutes: 10 }).toUTC().toISO()
        : existing?.result_sync_due_at
    };
  });

  if (updates.length > 0) {
    const { error: upsertError } = await supabaseAdmin.from("fixtures").upsert(updates, { onConflict: "external_id" });
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, processed_count: updates.length });
}
