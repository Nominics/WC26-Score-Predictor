import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/send-notification";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

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

    const { targetUserId, points, reason } = await req.json();

    if (!targetUserId || points === undefined || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const pointsInt = parseInt(points, 10);

    // 1. Get target user's display name for the pulse event
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", targetUserId)
      .single();

    const displayName = targetProfile?.display_name || "A player";

    // 2. Insert the manual point award
    const { error: insertError } = await supabaseAdmin
      .from("manual_point_awards")
      .insert({
        user_id: targetUserId,
        awarded_by: user.id,
        points: pointsInt,
        reason
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Create a Match Pulse Event (Public Feed)
    try {
      const pulseMessage = `${displayName} received ${pointsInt > 0 ? '+' : ''}${pointsInt} points — ${reason}`;
      const { error: pulseError } = await supabaseAdmin.from("match_pulse_events").insert({
        event_type: "bonus_points",
        emoji: "🎁",
        title: "BONUS POINTS",
        message: pulseMessage,
        user_id: targetUserId,
        metadata: {
          points: pointsInt,
          reason,
          awarded_by: user.id
        }
      });
      if (pulseError) console.error("Pulse event insertion failed:", pulseError);
    } catch (pulseErr) {
      console.error("Pulse event exception:", pulseErr);
    }

    // 4. Send Private Notification to the recipient
    await sendNotification({
      userId: targetUserId,
      type: 'bonus_points',
      title: "Bonus Points Awarded!",
      body: `You received ${pointsInt > 0 ? '+' : ''}${pointsInt} points: "${reason}"`,
      data: { url: "/dashboard", points: pointsInt }
    });

    // 5. Broadcast the "Pulse" to all users
    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("id");
    if (allProfiles) {
      const batchSize = 50;
      for (let i = 0; i < allProfiles.length; i += batchSize) {
        const batch = allProfiles.slice(i, i + batchSize);
        await Promise.all(batch.map(p => 
          sendNotification({
            userId: p.id,
            type: 'bonus_points',
            title: "🎁 BONUS POINTS",
            body: `${displayName} received ${pointsInt > 0 ? '+' : ''}${pointsInt} points — ${reason}`,
            eventKey: `bonus:${targetUserId}:${Date.now()}`
          })
        ));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
