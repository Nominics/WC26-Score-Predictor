import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendNotificationToUsers, NotificationType } from "@/lib/notifications/send-notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * High-frequency cron route for live score synchronization.
 * Finalized for production use.
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

function parseKickoffToUtc(localDate: string) {
  if (!localDate) return null;
  const dt = DateTime.fromFormat(localDate, "MM/dd/yyyy HH:mm", {
    zone: "America/New_York",
  });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

function mapStatus(game: WorldCupApiGame) {
  if (game.finished === "TRUE" || game.time_elapsed === "finished") return "finished";
  if (game.time_elapsed === "notstarted") return "scheduled";
  const elapsed = parseInt(game.time_elapsed);
  if (game.time_elapsed === "live" || (!isNaN(elapsed) && elapsed >= 0)) return "live";
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

    // 2. Environment Variables
    const apiUrl = process.env.FIXTURES_API_URL || "https://worldcup26.ir/get/games";
    const apiKey = process.env.FIXTURES_API_KEY || process.env.WC_API_TOKEN;

    if (!apiKey) {
      return NextResponse.json({ error: "API token missing" }, { status: 500 });
    }

    // 3. Fetch API Data
    const apiResponse = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (!apiResponse.ok) {
      return NextResponse.json({ error: `API failed: ${apiResponse.status}` }, { status: 500 });
    }

    const apiData = (await apiResponse.json()) as WorldCupApiResponse;
    const apiGames = apiData.games || [];

    // 4. Fetch current DB state
    const { data: dbFixtures, error: fixturesError } = await supabaseAdmin.from("fixtures").select("*");
    if (fixturesError) throw fixturesError;

    const { data: profiles, error: profilesError } = await supabaseAdmin.from("profiles").select("id");
    if (profilesError) throw profilesError;

    const userIds = profiles?.map(p => p.id) || [];
    const fixtureMap = new Map(dbFixtures?.map(f => [f.external_id, f]) || []);

    const results = {
      success: true,
      liveMatchesChecked: 0,
      fixturesUpdated: 0,
      goalsDetected: 0,
      scorerUpdates: 0,
      notificationsCreated: 0,
      pushAttempted: 0,
      pushSent: 0,
      pushFailed: 0
    };

    const updatesToUpsert: any[] = [];

    for (const game of apiGames) {
      const status = mapStatus(game);
      const existing = fixtureMap.get(game.id);
      
      if (!existing) continue;

      // 5. Production Live Detection
      // A match is "live interest" if it's currently live OR it just finished.
      const isActuallyLive = status === "live" && game.time_elapsed !== "notstarted";
      const isJustFinished = existing.status === "live" && status === "finished";
      
      if (!isActuallyLive && !isJustFinished) continue;

      results.liveMatchesChecked++;

      const homeScore = parseScore(game.home_score, status);
      const awayScore = parseScore(game.away_score, status);
      const cleanScorers = (val?: string | null) => (val === "null" || !val ? null : val);
      const homeScorers = cleanScorers(game.home_scorers);
      const awayScorers = cleanScorers(game.away_scorers);
      const apiKickoff = parseKickoffToUtc(game.local_date);

      // 6. Change Detection Logic & Specific Event Keys

      // A. Match Started (Scheduled -> Live)
      if (existing.status === 'scheduled' && status === 'live') {
        const eventKey = `match-start:${existing.id}`;
        const notified = await handleMatchEvent({
          fixtureId: existing.id,
          type: 'match_started',
          title: 'MATCH STARTED',
          emoji: '🟢',
          message: `${game.home_team_name_en} vs ${game.away_team_name_en} is underway!`,
          eventKey,
          userIds
        });
        if (notified) results.notificationsCreated++;
      }

      // B. Goal Detected (Score Change)
      if (existing.home_score !== homeScore || existing.away_score !== awayScore) {
        const whoScored = (homeScore ?? 0) > (existing.home_score ?? 0) 
          ? game.home_team_name_en 
          : (awayScore ?? 0) > (existing.away_score ?? 0) 
            ? game.away_team_name_en 
            : null;

        if (whoScored) {
          results.goalsDetected++;
          const eventKey = `goal:${existing.id}:${homeScore}-${awayScore}`;
          const notified = await handleMatchEvent({
            fixtureId: existing.id,
            type: 'team_scored',
            title: 'GOAL!',
            emoji: '⚽',
            message: `${whoScored} SCORED! ${game.home_team_name_en} ${homeScore} - ${awayScore} ${game.away_team_name_en}`,
            eventKey,
            userIds,
            metadata: { homeScore, awayScore, scorerTeam: whoScored }
          });
          if (notified) results.notificationsCreated++;
        }
      }

      // C. Scorer List Updated
      if (existing.home_scorers !== homeScorers || existing.away_scorers !== awayScorers) {
        if (homeScorers || awayScorers) {
          results.scorerUpdates++;
          // Use content-based hash for deduplication
          const scorersHash = `${homeScorers || ''}-${awayScorers || ''}`.substring(0, 50);
          const eventKey = `scorer-update:${existing.id}:${scorersHash}`;
          const notified = await handleMatchEvent({
            fixtureId: existing.id,
            type: 'scorer_updated',
            title: 'SCORERS UPDATED',
            emoji: '🥅',
            message: `Scorer list updated for ${game.home_team_name_en} vs ${game.away_team_name_en}`,
            eventKey,
            userIds,
            metadata: { homeScorers, awayScorers }
          });
          if (notified) results.notificationsCreated++;
        }
      }

      // D. Match Finished (Live -> Finished)
      if (existing.status !== 'finished' && status === 'finished') {
        const eventKey = `match-finished:${existing.id}:${homeScore}-${awayScore}`;
        const notified = await handleMatchEvent({
          fixtureId: existing.id,
          type: 'match_finished',
          title: 'FULL TIME',
          emoji: '🏁',
          message: `FINAL: ${game.home_team_name_en} ${homeScore} - ${awayScore} ${game.away_team_name_en}`,
          eventKey,
          userIds,
          metadata: { homeScore, awayScore }
        });
        if (notified) results.notificationsCreated++;
      }

      // 7. Prepare Database Update (With Kickoff Protection)
      const updatePayload: any = {
        external_id: game.id,
        status,
        home_score: homeScore,
        away_score: awayScore,
        home_scorers: homeScorers,
        away_scorers: awayScorers,
        api_time_elapsed: game.time_elapsed,
        api_finished: game.finished,
        api_kickoff_at: apiKickoff,
        updated_at: new Date().toISOString(),
      };

      // PROTECTION: Only update kickoff_at if NOT manually corrected
      if (!existing.manually_updated_kickoff_at && apiKickoff) {
        updatePayload.kickoff_at = apiKickoff;
      }

      updatesToUpsert.push(updatePayload);
    }

    // 8. Bulk Update Database
    if (updatesToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from("fixtures").upsert(updatesToUpsert, { onConflict: "external_id" });
      if (upsertError) throw upsertError;
      results.fixturesUpdated = updatesToUpsert.length;
    }

    return NextResponse.json(results);

  } catch (err: any) {
    console.error("[Live Score Sync] Critical Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}

/**
 * Internal handler for match events.
 * Manages Pulse insertion and Global Alerts.
 */
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

      // 2. Dispatch Arena Alerts to all users via reusable helper
      await sendNotificationToUsers({
        userIds,
        type: type as NotificationType,
        title: `${emoji} ${title}`,
        body: message,
        data: { fixtureId, ...metadata, url: "/dashboard" },
        eventKeyPrefix: `alert:${eventKey}`
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error("[Match Event Handler] Error:", err);
    return false;
  }
}
