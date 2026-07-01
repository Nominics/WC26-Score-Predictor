
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTeamFlagUrl } from "@/lib/team-flags";
import { sendNotificationToUsers, NotificationType } from "@/lib/notifications/send-notification";

/**
 * High-frequency cron route for live score synchronization.
 * Target: Run every 1-2 minutes during match windows.
 */

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
  home_scorers?: string | null;
  away_scorers?: string | null;
};

type WorldCupApiResponse = {
  games: WorldCupApiGame[];
};

function mapStatus(game: WorldCupApiGame) {
  if (game.finished === "TRUE" || game.time_elapsed === "finished") return "finished";
  if (game.time_elapsed === "live" || (parseInt(game.time_elapsed) >= 0)) return "live";
  return "scheduled";
}

function parseScore(value: string, status: string) {
  if (status === "scheduled") return null;
  const number = parseInt(value, 10);
  return isFinite(number) ? number : null;
}

export async function POST(req: Request) {
  try {
    // 1. Authentication
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch API Data
    const apiUrl = process.env.FIXTURES_API_URL;
    const apiKey = process.env.FIXTURES_API_KEY;
    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: "API configuration missing" }, { status: 500 });
    }

    const apiResponse = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!apiResponse.ok) {
      return NextResponse.json({ error: `API failed: ${apiResponse.status}` }, { status: 500 });
    }

    const apiData = (await apiResponse.json()) as WorldCupApiResponse;
    const apiGames = apiData.games || [];

    // 3. Fetch current DB state for comparison
    const { data: dbFixtures } = await supabaseAdmin.from("fixtures").select("*");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    const userIds = profiles?.map(p => p.id) || [];
    
    const fixtureMap = new Map(dbFixtures?.map(f => [f.external_id, f]) || []);

    const results = {
      liveMatchesChecked: 0,
      fixturesUpdated: 0,
      goalsDetected: 0,
      scorerUpdates: 0,
      notificationsCreated: 0,
    };

    const updatesToUpsert: any[] = [];

    for (const game of apiGames) {
      const status = mapStatus(game);
      const existing = fixtureMap.get(game.id);
      
      if (!existing) continue;

      // Filter for live or recently changed matches
      const isLiveMatch = status === 'live' || (existing.status === 'live' && status === 'finished');
      if (!isLiveMatch) continue;

      results.liveMatchesChecked++;

      const homeScore = parseScore(game.home_score, status);
      const awayScore = parseScore(game.away_score, status);
      const cleanScorers = (val?: string | null) => (val === "null" || !val ? null : val);
      const homeScorers = cleanScorers(game.home_scorers);
      const awayScorers = cleanScorers(game.away_scorers);

      // Change Detection Logic
      
      // A. Match Started
      if (existing.status === 'scheduled' && status === 'live') {
        const eventKey = `match_start:${game.id}`;
        await handleMatchEvent({
          fixtureId: existing.id,
          type: 'match_started',
          title: 'MATCH STARTED',
          emoji: '🟢',
          message: `${game.home_team_name_en} vs ${game.away_team_name_en} is underway!`,
          eventKey,
          userIds
        });
        results.notificationsCreated++;
      }

      // B. Goal Detected
      if (status !== 'scheduled' && (existing.home_score !== homeScore || existing.away_score !== awayScore)) {
        const whoScored = (homeScore ?? 0) > (existing.home_score ?? 0) 
          ? game.home_team_name_en 
          : (awayScore ?? 0) > (existing.away_score ?? 0) 
            ? game.away_team_name_en 
            : null;

        if (whoScored) {
          results.goalsDetected++;
          const eventKey = `goal:${game.id}:${homeScore}-${awayScore}`;
          await handleMatchEvent({
            fixtureId: existing.id,
            type: 'team_scored',
            title: 'GOAL!',
            emoji: '⚽',
            message: `${whoScored} SCORED! ${game.home_team_name_en} ${homeScore} - ${awayScore} ${game.away_team_name_en}`,
            eventKey,
            userIds,
            metadata: { homeScore, awayScore, scorerTeam: whoScored }
          });
          results.notificationsCreated++;
        }
      }

      // C. Scorer List Updated
      if (status !== 'scheduled' && (existing.home_scorers !== homeScorers || existing.away_scorers !== awayScorers)) {
        if (homeScorers || awayScorers) {
          results.scorerUpdates++;
          const eventKey = `scorers:${game.id}:${Date.now()}`; // Scorers can update multiple times
          await handleMatchEvent({
            fixtureId: existing.id,
            type: 'scorer_updated',
            title: 'SCORERS UPDATED',
            emoji: '🥅',
            message: `Scorer list updated for ${game.home_team_name_en} vs ${game.away_team_name_en}`,
            eventKey,
            userIds,
            metadata: { homeScorers, awayScorers }
          });
        }
      }

      // D. Match Finished
      if (existing.status !== 'finished' && status === 'finished') {
        const eventKey = `match_end:${game.id}`;
        await handleMatchEvent({
          fixtureId: existing.id,
          type: 'match_finished',
          title: 'FULL TIME',
          emoji: '🏁',
          message: `FINAL: ${game.home_team_name_en} ${homeScore} - ${awayScore} ${game.away_team_name_en}`,
          eventKey,
          userIds,
          metadata: { homeScore, awayScore }
        });
        results.notificationsCreated++;
      }

      // Prepare Update Object
      const updatePayload: any = {
        external_id: game.id,
        status,
        home_score: homeScore,
        away_score: awayScore,
        home_scorers: homeScorers,
        away_scorers: awayScorers,
        api_time_elapsed: game.time_elapsed,
        api_finished: game.finished,
        updated_at: new Date().toISOString(),
      };

      // Rule: Protect manually corrected kickoff times
      if (!existing.manually_updated_kickoff_at) {
        const apiKickoff = DateTime.fromFormat(game.local_date, "MM/dd/yyyy HH:mm", { zone: "America/New_York" }).toUTC().toISO();
        updatePayload.kickoff_at = apiKickoff;
      }

      updatesToUpsert.push(updatePayload);
    }

    if (updatesToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from("fixtures").upsert(updatesToUpsert, { onConflict: "external_id" });
      if (upsertError) throw upsertError;
      results.fixturesUpdated = updatesToUpsert.length;
    }

    return NextResponse.json({ success: true, ...results });

  } catch (err: any) {
    console.error("[Live Score Sync] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleMatchEvent({
  fixtureId, type, title, emoji, message, eventKey, userIds, metadata = {}
}: {
  fixtureId: string, type: string, title: string, emoji: string, message: string, eventKey: string, userIds: string[], metadata?: any
}) {
  try {
    // 1. Create Public Pulse Event (Deduplicated by event_key)
    const { data: existingPulse } = await supabaseAdmin
      .from("match_pulse_events")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();

    if (!existingPulse) {
      await supabaseAdmin.from("match_pulse_events").insert({
        fixture_id: fixtureId,
        event_type: type,
        title,
        emoji,
        message,
        event_key: eventKey,
        metadata
      });

      // 2. Dispatch Arena Alerts to all users
      await sendNotificationToUsers({
        userIds,
        type: type as NotificationType,
        title: `${emoji} ${title}`,
        body: message,
        data: { fixtureId, ...metadata, url: "/dashboard" },
        eventKeyPrefix: `alert:${eventKey}`
      });
    }
  } catch (err) {
    console.error("[Match Event Handler] Error:", err);
  }
}
