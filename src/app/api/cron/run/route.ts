
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTeamFlagUrl } from "@/lib/team-flags";
import { sendNotification, NotificationType } from "@/lib/notifications/send-notification";

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
  home_team_name_fa?: string;
  away_team_name_fa?: string;
};

type WorldCupApiResponse = {
  games: WorldCupApiGame[];
};

function parseKickoffToUtc(localDate: string) {
  const dt = DateTime.fromFormat(localDate, "MM/dd/yyyy HH:mm", { zone: "America/New_York" });
  return dt.isValid ? dt.toUTC().toISO() : null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let syncedFixtures = 0;
    let remindersSent = 0;
    let rankChangesDetected = 0;

    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("id, display_name, last_known_rank");

    // 1. MATCH SYNC & PULSE DETECTION
    const apiUrl = process.env.FIXTURES_API_URL;
    const apiKey = process.env.FIXTURES_API_KEY;

    if (apiUrl && apiKey) {
      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as WorldCupApiResponse;
        
        const { data: existingFixtures } = await supabaseAdmin.from("fixtures").select("*");
        const fixtureMap = new Map(existingFixtures?.map(f => [f.external_id, f]) || []);

        const fixturesToUpsert = data.games.map((game) => {
          const status = (game.finished === "TRUE" || game.time_elapsed === "finished") ? "finished" : (game.time_elapsed === "live" ? "live" : "scheduled");
          const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
          const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";
          const apiKickoff = parseKickoffToUtc(game.local_date);
          const homeScore = status !== "scheduled" ? parseInt(game.home_score) : null;
          const awayScore = status !== "scheduled" ? parseInt(game.away_score) : null;
          
          const cleanScorers = (val?: string | null) => (val === "null" || !val ? null : val);
          const homeScorers = cleanScorers(game.home_scorers);
          const awayScorers = cleanScorers(game.away_scorers);

          const existing = fixtureMap.get(game.id);
          const finalKickoff = (existing?.manually_updated_kickoff_at) ? existing.kickoff_at : apiKickoff;

          if (existing) {
            // Match Started
            if (existing.status !== 'live' && status === 'live') {
              createPulseEvent({
                fixtureId: existing.id,
                type: 'match_started',
                emoji: '🟢',
                title: "MATCH STARTED",
                message: `${homeTeam} vs ${awayTeam} is underway`,
                eventKey: `start:${game.id}`
              });
            }

            // Score & Goal
            if ((existing.home_score !== homeScore || existing.away_score !== awayScore) && status !== 'scheduled') {
              const whoScored = (homeScore ?? 0) > (existing.home_score ?? 0) ? homeTeam : (awayScore ?? 0) > (existing.away_score ?? 0) ? awayTeam : null;
              
              if (whoScored) {
                createPulseEvent({
                  fixtureId: existing.id,
                  type: 'team_scored',
                  emoji: '⚽',
                  title: "GOAL!",
                  message: `${whoScored} scored! ${homeTeam} ${homeScore ?? 0} - ${awayScore ?? 0} ${awayTeam}`,
                  eventKey: `goal:${game.id}:${homeScore}-${awayScore}`,
                  metadata: { homeScore, awayScore, scorerTeam: whoScored }
                });
              }
            }

            // Scorer Update
            if ((existing.home_scorers !== homeScorers || existing.away_scorers !== awayScorers) && (homeScorers || awayScorers)) {
              createPulseEvent({
                fixtureId: existing.id,
                type: 'scorer_updated',
                emoji: '🥅',
                title: "SCORER UPDATED",
                message: `${homeTeam} vs ${awayTeam} scorer list updated.`,
                eventKey: `scorer:${game.id}:${homeScorers || ''}:${awayScorers || ''}`,
                metadata: { homeScorers, awayScorers }
              });
            }

            // Match Finished
            if (existing.status !== 'finished' && status === 'finished') {
              createPulseEvent({
                fixtureId: existing.id,
                type: 'match_finished',
                emoji: '🏁',
                title: "FULL TIME",
                message: `${homeTeam} ${homeScore ?? 0} - ${awayScore ?? 0} ${awayTeam}`,
                eventKey: `final:${game.id}`,
                metadata: { homeScore, awayScore }
              });
            }
          }

          return {
            external_id: game.id,
            match_number: parseInt(game.id, 10),
            stage: game.type,
            group_name: game.group,
            home_team: homeTeam,
            away_team: awayTeam,
            home_flag: getTeamFlagUrl(homeTeam),
            away_flag: getTeamFlagUrl(awayTeam),
            kickoff_at: finalKickoff,
            status,
            home_score: homeScore,
            away_score: awayScore,
            updated_at: new Date().toISOString(),
            home_scorers: homeScorers,
            away_scorers: awayScorers,
            home_team_name_fa: game.home_team_name_fa ?? null,
            away_team_name_fa: game.away_team_name_fa ?? null,
            api_time_elapsed: game.time_elapsed,
            api_finished: game.finished,
            stadium_id: game.stadium_id,
            matchday: game.matchday,
          };
        });

        const { error: upsertError } = await supabaseAdmin.from("fixtures").upsert(fixturesToUpsert, { onConflict: "external_id" });
        if (!upsertError) syncedFixtures = fixturesToUpsert.length;
      }
    }

    // 2. PREDICTION REMINDERS
    const windows = [
      { label: '15m', minutes: 15 },
      { label: '2h', minutes: 120 },
      { label: '4h', minutes: 240 },
      { label: '8h', minutes: 480 }
    ];

    const now = DateTime.now();
    for (const window of windows) {
      const windowStart = now.plus({ minutes: window.minutes - 5 }).toUTC().toISO();
      const windowEnd = now.plus({ minutes: window.minutes + 5 }).toUTC().toISO();

      const { data: upcomingFixtures } = await supabaseAdmin
        .from("fixtures")
        .select("id, home_team, away_team")
        .gte("kickoff_at", windowStart)
        .lte("kickoff_at", windowEnd);

      if (upcomingFixtures && upcomingFixtures.length > 0) {
        for (const fixture of upcomingFixtures) {
          const { data: predictions } = await supabaseAdmin.from("predictions").select("user_id").eq("fixture_id", fixture.id);
          const predictedUserIds = new Set(predictions?.map(p => p.user_id) || []);
          const targetUsers = allProfiles?.filter(u => !predictedUserIds.has(u.id)) || [];

          for (const user of targetUsers) {
            await sendNotification({
              userId: user.id,
              type: 'prediction_reminder',
              title: "Prediction Reminder",
              body: `${fixture.home_team} vs ${fixture.away_team} starts soon. Lock your pick.`,
              eventKey: `reminder:${window.label}:${fixture.id}:${user.id}`,
              data: { fixtureId: fixture.id, window: window.label }
            });
            remindersSent++;
          }
        }
      }
    }

    // 3. RANK CHANGE DETECTION
    const { data: leaderboard } = await supabaseAdmin.from("leaderboard").select("user_id, total_points").order("total_points", { ascending: false });
    if (leaderboard && allProfiles) {
      const userRankMap = new Map();
      leaderboard.forEach((entry, index) => {
        if (!userRankMap.has(entry.total_points)) {
          userRankMap.set(entry.total_points, index + 1);
        }
      });

      for (const profile of allProfiles) {
        const currentPoints = leaderboard.find(l => l.user_id === profile.id)?.total_points || 0;
        const currentRank = userRankMap.get(currentPoints);
        const oldRank = profile.last_known_rank;

        if (oldRank && currentRank && oldRank !== currentRank) {
          await sendNotification({
            userId: profile.id,
            type: 'rank_changed',
            title: "Rank Changed",
            body: `You moved from Rank #${oldRank} to Rank #${currentRank}.`,
            eventKey: `rank:${profile.id}:${Date.now()}`,
            data: { old_rank: oldRank, new_rank: currentRank }
          });
          rankChangesDetected++;
        }
        
        // Update snapshot
        if (currentRank !== oldRank) {
          await supabaseAdmin.from("profiles").update({ last_known_rank: currentRank }).eq("id", profile.id);
        }
      }
    }

    return NextResponse.json({ success: true, syncedFixtures, remindersSent, rankChangesDetected });
  } catch (err: any) {
    console.error("Cron execution error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function createPulseEvent({ 
  fixtureId, type, emoji, title, message, eventKey, metadata = {} 
}: { 
  fixtureId: string, type: string, emoji: string, title: string, message: string, eventKey: string, metadata?: any 
}) {
  try {
    const { data: existing } = await supabaseAdmin.from("match_pulse_events").select("id").eq("event_key", eventKey).maybeSingle();
    if (existing) return;

    await supabaseAdmin.from("match_pulse_events").insert({
      fixture_id: fixtureId, event_type: type, emoji, title, message, event_key: eventKey, metadata
    });

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    if (profiles) {
      const batchSize = 50;
      for (let i = 0; i < profiles.length; i += batchSize) {
        const batch = profiles.slice(i, i + batchSize);
        await Promise.all(batch.map(profile => 
          sendNotification({
            userId: profile.id,
            type: type as NotificationType,
            title: `${emoji} ${title}`,
            body: message,
            eventKey: `pulse:${eventKey}:${profile.id}`
          })
        ));
      }
    }
  } catch (err) { console.error("Pulse Event Exception:", err); }
}
