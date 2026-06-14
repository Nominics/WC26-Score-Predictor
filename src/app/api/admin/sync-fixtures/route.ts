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
  const number = parseInt(value, 10);
  return isFinite(number) ? number : null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiUrl = process.env.FIXTURES_API_URL;
    const apiKey = process.env.FIXTURES_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: "API Configuration missing" }, { status: 500 });
    }

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: `API failed: ${response.status}` }, { status: 500 });
    }

    const data = (await response.json()) as WorldCupApiResponse;
    
    const fixtures = data.games.map((game) => {
      const status = mapStatus(game);
      const kickoffUtc = parseKickoffToUtc(game.local_date);
      const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
      const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";

      return {
        external_id: game.id,
        match_number: parseInt(game.id, 10),
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
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upsertError } = await supabaseAdmin
      .from("fixtures")
      .upsert(fixtures, { onConflict: "external_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: fixtures.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
