
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";

type WorldCupApiGame = {
  _id: string;
  id: string;
  home_team_id: string;
  away_team_id: string;
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

/**
 * Temporary MVP mapping.
 * The API gives local stadium date/time, but not timezone in the games response.
 * Until we map every stadium_id to its real timezone, we store using America/New_York as fallback.
 */
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
  // Keep scheduled match scores as null.
  // This prevents leaderboard points from calculating before final result.
  if (status === "scheduled") {
    return null;
  }

  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-sync-secret");

    // In local dev, allow empty secret if env is not set, otherwise check it
    const expectedSecret = process.env.SYNC_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiUrl = process.env.FIXTURES_API_URL;
    const apiKey = process.env.FIXTURES_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: "Missing FIXTURES_API_URL or FIXTURES_API_KEY environment variables." },
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

    if (!data || !Array.isArray(data.games)) {
      return NextResponse.json(
        { error: "Invalid API response: games array missing or null" },
        { status: 500 }
      );
    }

    const fixtures = data.games.map((game) => {
      const status = mapStatus(game);

      return {
        external_id: game.id,
        match_number: Number.parseInt(game.id, 10),
        stage: game.type,
        group_name: game.group,
        venue: game.stadium_id ? `Stadium ${game.stadium_id}` : null,

        home_team:
          game.home_team_name_en ||
          game.home_team_label ||
          "TBD",

        away_team:
          game.away_team_name_en ||
          game.away_team_label ||
          "TBD",

        home_flag: null,
        away_flag: null,

        kickoff_at: parseKickoffToUtc(game.local_date),

        status,
        home_score: parseScore(game.home_score, status),
        away_score: parseScore(game.away_score, status),
      };
    });

    const { error } = await supabaseAdmin
      .from("fixtures")
      .upsert(fixtures, {
        onConflict: "external_id",
      });

    if (error) {
      return NextResponse.json(
        { error: `Supabase Error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: fixtures.length,
    });
  } catch (err: any) {
    console.error("Sync Route Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
