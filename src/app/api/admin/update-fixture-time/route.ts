
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

    const { fixtureId, newKickoffAt } = await req.json();

    if (!fixtureId || !newKickoffAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Update the fixture source of truth kickoff_at and set manual flag
    const { data: fixture, error: updateError } = await supabaseAdmin
      .from("fixtures")
      .update({ 
        kickoff_at: newKickoffAt,
        manually_updated_kickoff_at: true 
      })
      .eq("id", fixtureId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Log the activity securely
    try {
      const { error: logError } = await supabaseAdmin.from("activity_logs").insert({
        user_id: user.id,
        action: "fixture_time_updated",
        fixture_id: fixtureId,
        metadata: {
          home_team: fixture.home_team,
          away_team: fixture.away_team,
          new_time: newKickoffAt
        }
      });
      if (logError) console.error("Log insert failed:", logError);
    } catch (logErr) {
      console.error("Log exception:", logErr);
    }

    return NextResponse.json({ success: true, fixture });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
