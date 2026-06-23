
import { supabaseAdmin } from "@/lib/supabase/admin";
import webpush from "web-push";

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@zikura.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export type NotificationType = 
  | 'prediction_reminder' 
  | 'team_scored' 
  | 'scorer_updated' 
  | 'rank_changed' 
  | 'bonus_points' 
  | 'manual_admin' 
  | 'app_update' 
  | 'fixture_time_updated'
  | 'match_started'
  | 'match_finished';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  eventKey?: string;
}

/**
 * Sends a notification by inserting it into the database and optionally sending a Web Push.
 * Uses eventKey to prevent duplicate notifications for the same event per user.
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  data = {},
  eventKey,
}: SendNotificationParams) {
  try {
    // 1. Check for duplicate if eventKey is provided
    if (eventKey) {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("event_key", eventKey)
        .maybeSingle();
      
      if (existing) return;
    }

    // 2. Insert into DB for in-app bell (This is the source of truth for Arena Alerts)
    const { error: dbError } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type,
      title,
      body,
      data,
      event_key: eventKey,
    });

    if (dbError) {
      console.error(`DB Notification error for ${userId}:`, dbError.message);
    }

    // 3. Send Web Push if enabled for this user
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("enabled", true);

    if (subs && subs.length > 0) {
      const payload = JSON.stringify({
        title,
        body,
        url: data.url || "/dashboard",
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
        } catch (err: any) {
          // If subscription is expired or gone, disable it
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").update({ enabled: false }).eq("id", sub.id);
          }
        }
      }
    }
  } catch (err) {
    console.error("Critical error in sendNotification:", err);
  }
}
