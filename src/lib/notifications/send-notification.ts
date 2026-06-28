
import { supabaseAdmin } from "@/lib/supabase/admin";
import webpush from "web-push";

// Initialize web-push with VAPID keys if present
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@arena.com",
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
  sendPush?: boolean;
}

/**
 * Standardized helper to create an in-app notification and optionally send a Web Push.
 * Handles deduplication via eventKey (stored in data.event_key).
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  data = {},
  eventKey,
  sendPush = true,
}: SendNotificationParams) {
  try {
    const finalEventKey = eventKey || data.event_key;
    
    // 1. Deduplication check
    if (finalEventKey) {
      const { data: existing } = await supabaseAdmin
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .filter('data->>event_key', 'eq', finalEventKey)
        .maybeSingle();
      
      if (existing) return { success: true, message: "Duplicate suppressed", id: existing.id };
    }

    // 2. Prepare payload
    const notificationData = {
      ...data,
      event_key: finalEventKey
    };

    // 3. Insert into DB for in-app bell (Primary source of truth)
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body,
        data: notificationData,
      })
      .select()
      .single();

    if (dbError) {
      console.error(`[Notification] DB insert error for ${userId}:`, dbError.message);
      throw dbError;
    }

    // 4. Send Web Push if enabled
    if (sendPush) {
      const hasVapid = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
      if (hasVapid) {
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
            type,
            notificationId: inserted.id
          });

          for (const sub of subs) {
            try {
              await webpush.sendNotification(sub.subscription, payload);
            } catch (err: any) {
              // Cleanup stale subscriptions
              if (err.statusCode === 404 || err.statusCode === 410) {
                await supabaseAdmin.from('push_subscriptions').update({ enabled: false }).eq('id', sub.id);
              }
            }
          }
        }
      }
    }

    return { success: true, id: inserted.id };
  } catch (err) {
    console.error("[Notification] Critical error:", err);
    return { success: false, error: err };
  }
}

/**
 * Batch version of sendNotification.
 * Chunked processing to handle large player counts.
 */
export async function sendNotificationToUsers({
  userIds,
  type,
  title,
  body,
  data = {},
  eventKeyPrefix,
  sendPush = true
}: {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  data?: any;
  eventKeyPrefix?: string;
  sendPush?: boolean;
}) {
  const batchSize = 50;
  let sentCount = 0;

  for (let i = 0; i < userIds.length; i += batchSize) {
    const chunk = userIds.slice(i, i + batchSize);
    await Promise.all(chunk.map(userId => 
      sendNotification({
        userId,
        type,
        title,
        body,
        data,
        eventKey: eventKeyPrefix ? `${eventKeyPrefix}:${userId}` : undefined,
        sendPush
      })
    ));
    sentCount += chunk.length;
  }

  return { success: true, sentCount };
}
