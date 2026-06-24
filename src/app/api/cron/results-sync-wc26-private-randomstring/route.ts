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

export async function GET() {
  const nowIso = new Date().toISOString();

  // Fetch fixtures that are due for a result check
  const { data: dueFixtures, error: dueError } = await supabaseAdmin
    .from("fixtures")
    .select("*")
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
      message: "No fixtures due for result sync.",
      synced: 0,
    });
  }

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
  const fixtureMap = new Map(dueFixtures.map(f => [f.external_id, f]));
  const apiGamesDue = data.games.filter((game) => fixtureMap.has(game.id));

  const updates = apiGamesDue.map((game) => {
    const status = mapStatus(game);
    const apiKickoff = parseKickoffToUtc(game.local_date);
    const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
    const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";
    const existing = fixtureMap.get(game.id);

    // Rule: Protect manually corrected kickoff times
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
      manually_updated_kickoff_at: existing?.manually_updated_kickoff_at ?? false,
      status,
      home_score: parseScore(game.home_score, status),
      away_score: parseScore(game.away_score, status),
      result_sync_due_at: DateTime.fromISO(finalKickoff!)
        .plus({ minutes: 110 })
        .toUTC()
        .toISO(),
      result_synced_at: status === 'finished' ? new Date().toISOString() : null,
      result_sync_attempts: (existing?.result_sync_attempts || 0) + 1,
    };
  });

  const { error: upsertError } = await supabaseAdmin
    .from("fixtures")
    .upsert(updates, {
      onConflict: "external_id",
    });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    due: dueFixtures.length,
    synced: updates.length,
    matches: updates.map((fixture) => ({
      match_number: fixture.match_number,
      home_team: fixture.home_team,
      away_team: fixture.away_team,
      status: fixture.status,
      score: `${fixture.home_score ?? "-"}-${fixture.away_score ?? "-"}`,
    })),
  });
}