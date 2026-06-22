
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
          const kickoff = parseKickoffToUtc(game.local_date);
          const homeScore = status !== "scheduled" ? parseInt(game.home_score) : null;
          const awayScore = status !== "scheduled" ? parseInt(game.away_score) : null;
          
          const cleanScorers = (val?: string | null) => (val === "null" || !val ? null : val);
          const homeScorers = cleanScorers(game.home_scorers);
          const awayScorers = cleanScorers(game.away_scorers);

          const existing = fixtureMap.get(game.id);

          if (existing) {
            // 1. Match Started Pulse
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

            // 2. Score & Goal Pulse
            if ((existing.home_score !== homeScore || existing.away_score !== awayScore) && status !== 'scheduled') {
              const whoScored = (homeScore ?? 0) > (existing.home_score ?? 0) ? homeTeam : (awayScore ?? 0) > (existing.away_score ?? 0) ? awayTeam : null;
              
              if (whoScored) {
                createPulseEvent({
                  fixtureId: existing.id,
                  type: 'goal',
                  emoji: '⚽',
                  title: "GOAL",
                  message: `${whoScored} scored! ${homeTeam} ${homeScore ?? 0} - ${awayScore ?? 0} ${awayTeam}`,
                  eventKey: `goal:${game.id}:${homeScore}-${awayScore}`,
                  metadata: { homeScore, awayScore, scorerTeam: whoScored }
                });
              } else {
                createPulseEvent({
                  fixtureId: existing.id,
                  type: 'score_update',
                  emoji: '📊',
                  title: "SCORE UPDATE",
                  message: `${homeTeam} ${homeScore ?? 0} - ${awayScore ?? 0} ${awayTeam}`,
                  eventKey: `score:${game.id}:${homeScore}-${awayScore}`,
                  metadata: { homeScore, awayScore }
                });
              }
            }

            // 3. Scorer Update Pulse
            if ((existing.home_scorers !== homeScorers || existing.away_scorers !== awayScorers) && (homeScorers || awayScorers)) {
              const newScorers = [homeScorers, awayScorers].filter(Boolean).join(' • ');
              createPulseEvent({
                fixtureId: existing.id,
                type: 'scorer_update',
                emoji: '🥅',
                title: "SCORER UPDATE",
                message: `${homeTeam} vs ${awayTeam}: ${newScorers}`,
                eventKey: `scorer:${game.id}:${homeScorers || ''}:${awayScorers || ''}`,
                metadata: { homeScorers, awayScorers }
              });
            }

            // 4. Match Finished Pulse
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
            kickoff_at: kickoff,
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

        const { error: upsertError } = await supabaseAdmin
          .from("fixtures")
          .upsert(fixturesToUpsert, { onConflict: "external_id" });
        
        if (!upsertError) syncedFixtures = fixturesToUpsert.length;
      }
    }

    // 2. LEADERBOARD RANK CHANGE DETECTION
    const { data: leaderboard } = await supabaseAdmin.from("leaderboard").select("user_id, total_points");
    if (leaderboard) {
      const rankedData = leaderboard
        .sort((a, b) => b.total_points - a.total_points)
        .map((u, i) => ({ ...u, rank: i + 1 }));

      for (const entry of rankedData) {
        const { data: snapshot } = await supabaseAdmin
          .from("leaderboard_rank_snapshots")
          .select("*")
          .eq("user_id", entry.user_id)
          .maybeSingle();

        if (snapshot && snapshot.rank !== entry.rank) {
          const improved = entry.rank < snapshot.rank;
          await sendNotification({
            userId: entry.user_id,
            type: 'rank_changed',
            title: improved ? "Rank Up!" : "Rank Changed",
            body: improved 
              ? `You've moved up to Rank #${entry.rank}! Keep it up.` 
              : `Your global rank is now #${entry.rank}. Check the leaderboard!`,
            data: { url: "/leaderboard", rank: entry.rank },
            eventKey: `rank:${entry.user_id}:${entry.rank}:${entry.total_points}`
          });
        }

        await supabaseAdmin.from("leaderboard_rank_snapshots").upsert({
          user_id: entry.user_id,
          rank: entry.rank,
          total_points: entry.total_points,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }
    }

    // 3. PREDICTION REMINDERS
    const now = DateTime.now().toUTC();
    const intervals = [
      { label: '8h', minutes: 8 * 60 },
      { label: '4h', minutes: 4 * 60 },
      { label: '2h', minutes: 2 * 60 },
      { label: '15m', minutes: 15 }
    ];

    for (const interval of intervals) {
      const windowStart = now.plus({ minutes: interval.minutes });
      const windowEnd = windowStart.plus({ minutes: 15 });

      const { data: upcomingFixtures } = await supabaseAdmin
        .from('fixtures')
        .select('*')
        .gte('kickoff_at', windowStart.toISO())
        .lt('kickoff_at', windowEnd.toISO())
        .eq('status', 'scheduled');

      if (!upcomingFixtures?.length) continue;

      for (const fixture of upcomingFixtures) {
        const { data: usersToRemind } = await supabaseAdmin
          .rpc('get_users_needing_reminders', { 
            f_id: fixture.id, 
            r_type: interval.label 
          });

        if (!usersToRemind?.length) continue;

        for (const user of usersToRemind) {
          const eventKey = `reminder:${user.id}:${fixture.id}:${interval.label}`;
          await sendNotification({
            userId: user.id,
            type: 'prediction_reminder',
            title: "Prediction Reminder",
            body: `${fixture.home_team} vs ${fixture.away_team} starts soon. Lock your score pick now!`,
            data: { url: "/dashboard", fixtureId: fixture.id },
            eventKey
          });
          
          await supabaseAdmin.from('prediction_reminder_logs').insert({
            user_id: user.id,
            fixture_id: fixture.id,
            reminder_type: interval.label
          }).catch(() => {});
          
          remindersSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedFixtures,
      remindersSent
    });

  } catch (err: any) {
    console.error("Cron execution error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Creates a Match Pulse Event and broadcasts it to all users
 */
async function createPulseEvent({ 
  fixtureId, type, emoji, title, message, eventKey, metadata = {} 
}: { 
  fixtureId: string, 
  type: string, 
  emoji: string, 
  title: string, 
  message: string, 
  eventKey: string,
  metadata?: any 
}) {
  try {
    // 1. Check for duplicate Pulse Event
    const { data: existing } = await supabaseAdmin
      .from("match_pulse_events")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();
    
    if (existing) return;

    // 2. Insert into match_pulse_events table
    await supabaseAdmin.from("match_pulse_events").insert({
      fixture_id: fixtureId,
      event_type: type,
      emoji,
      title,
      message,
      event_key: eventKey,
      metadata
    });

    // 3. Broadcast as a notification to all users
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
    if (!profiles) return;
    
    const batchSize = 50;
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize);
      await Promise.all(batch.map(profile => 
        sendNotification({
          userId: profile.id,
          type: 'fixture_time_updated' as NotificationType,
          title: `${emoji} ${title}`,
          body: message,
          eventKey
        })
      ));
    }
  } catch (err) {
    console.error("Pulse Event Error:", err);
  }
}
