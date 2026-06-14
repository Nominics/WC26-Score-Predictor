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

  if (!dt.isValid) {
    throw new Error(`Invalid local_date from API: ${localDate}`);
  }

  return dt.toUTC().toISO();
}

function mapStatus(game: WorldCupApiGame) {
  if (game.finished === "TRUE" || game.time_elapsed === "finished") {
    return "finished";
  }

  if (game.time_elapsed === "live") {
    return "live";
  }

  return "scheduled";
}

function parseScore(value: string, status: string) {
  if (status === "scheduled") return null;

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

export async function GET(req: Request) {
  // Authorization check for Cron
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const nowIso = new Date().toISOString();

  // 1. Fetch fixtures due for sync (kickoff + 110 mins) that haven't been synced yet
  const { data: dueFixtures, error: dueError } = await supabaseAdmin
    .from("fixtures")
    .select("id, external_id, home_team, away_team, kickoff_at, result_sync_due_at, result_sync_attempts")
    .lte("result_sync_due_at", nowIso)
    .is("result_synced_at", null)
    .order("kickoff_at", { ascending: true })
    .limit(10);

  if (dueError) {
    return NextResponse.json({ error: dueError.message }, { status: 500 });
  }

  if (!dueFixtures || dueFixtures.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No fixtures currently due for result sync.",
      synced: 0,
    });
  }

  // 2. Fetch Latest Data from World Cup API
  const apiUrl = process.env.FIXTURES_API_URL;
  const apiKey = process.env.FIXTURES_API_KEY;

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "Missing FIXTURES_API_URL or FIXTURES_API_KEY" },
      { status: 500 }
    );
  }

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Fixture API failed with status ${response.status}` },
      { status: 500 }
    );
  }

  const data = (await response.json()) as WorldCupApiResponse;
  const dueExternalIds = new Set(dueFixtures.map((fixture) => fixture.external_id));
  const apiGamesDue = data.games.filter((game) => dueExternalIds.has(game.id));

  // 3. Prepare Updates
  const updates = apiGamesDue.map((game) => {
    const status = mapStatus(game);
    const existingFixture = dueFixtures.find(f => f.external_id === game.id);
    const kickoffUtc = parseKickoffToUtc(game.local_date);
    const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
    const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";

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
      kickoff_at: kickoffUtc,
      status,
      home_score: parseScore(game.home_score, status),
      away_score: parseScore(game.away_score, status),
      // Mark as synced if finished
      result_synced_at: status === 'finished' ? new Date().toISOString() : null,
      // Increment attempts
      result_sync_attempts: (existingFixture?.result_sync_attempts || 0) + 1,
      // If not finished, push the next check 10 minutes into the future
      result_sync_due_at: status !== 'finished' 
        ? DateTime.now().plus({ minutes: 10 }).toUTC().toISO()
        : existingFixture?.result_sync_due_at
    };
  });

  // 4. Upsert to Supabase
  if (updates.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("fixtures")
      .upsert(updates, {
        onConflict: "external_id",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    due_count: dueFixtures.length,
    processed_count: updates.length,
    matches: updates.map((f) => ({
      match: `${f.home_team} vs ${f.away_team}`,
      status: f.status,
      synced: !!f.result_synced_at
    }))
  });
}
