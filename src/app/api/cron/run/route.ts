import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getTeamFlagUrl } from "@/lib/team-flags";
import webpush from "web-push";

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

// Configure Web Push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@zikura.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

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
    let disabledSubscriptions = 0;

    // 1. MATCH SYNC
    const apiUrl = process.env.FIXTURES_API_URL;
    const apiKey = process.env.FIXTURES_API_KEY;

    if (apiUrl && apiKey) {
      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as WorldCupApiResponse;
        const fixtures = data.games.map((game) => {
          const status = (game.finished === "TRUE" || game.time_elapsed === "finished") ? "finished" : (game.time_elapsed === "live" ? "live" : "scheduled");
          const homeTeam = game.home_team_name_en || game.home_team_label || "TBD";
          const awayTeam = game.away_team_name_en || game.away_team_label || "TBD";
          const kickoff = parseKickoffToUtc(game.local_date);

          const cleanScorers = (val?: string | null) => (val === "null" || !val ? null : val);

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
            home_score: status !== "scheduled" ? parseInt(game.home_score) : null,
            away_score: status !== "scheduled" ? parseInt(game.away_score) : null,
            updated_at: new Date().toISOString(),
            // Extended mapping
            home_scorers: cleanScorers(game.home_scorers),
            away_scorers: cleanScorers(game.away_scorers),
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
          .upsert(fixtures, { onConflict: "external_id" });
        
        if (!upsertError) syncedFixtures = fixtures.length;
      }
    }

    // 2. PREDICTION REMINDERS
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
        const { data: usersToRemind, error: rpcError } = await supabaseAdmin
          .rpc('get_users_needing_reminders', { 
            f_id: fixture.id, 
            r_type: interval.label 
          });

        if (rpcError) {
          console.error("RPC Error fetching reminder targets:", rpcError.message);
          continue;
        }

        if (!usersToRemind?.length) continue;

        for (const user of usersToRemind) {
          const { data: subs } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('enabled', true);

          if (!subs?.length) continue;

          const payload = JSON.stringify({
            title: "Prediction Reminder",
            body: `${fixture.home_team} vs ${fixture.away_team} starts soon. Lock your score pick now!`,
            url: "/dashboard"
          });

          let successfullySentToAny = false;

          for (const sub of subs) {
            try {
              await webpush.sendNotification(sub.subscription, payload);
              remindersSent++;
              successfullySentToAny = true;
            } catch (err: any) {
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supabaseAdmin.from('push_subscriptions').update({ enabled: false }).eq('id', sub.id);
                disabledSubscriptions++;
              }
            }
          }

          if (successfullySentToAny) {
            await supabaseAdmin.from('prediction_reminder_logs').insert({
              user_id: user.id,
              fixture_id: fixture.id,
              reminder_type: interval.label
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedFixtures,
      remindersSent,
      disabledSubscriptions
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
