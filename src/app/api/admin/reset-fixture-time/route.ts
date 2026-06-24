import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { fixtureId } = await req.json();

    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixtureId" }, { status: 400 });
    }

    const { data: fixture, error: fixtureError } = await supabaseAdmin
      .from("fixtures")
      .select("id, home_team, away_team, kickoff_at, api_kickoff_at")
      .eq("id", fixtureId)
      .single();

    if (fixtureError || !fixture) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    if (!fixture.api_kickoff_at) {
      return NextResponse.json(
        { error: "API kickoff time is not available for this fixture." },
        { status: 400 }
      );
    }

    const { data: updatedFixture, error: updateError } = await supabaseAdmin
      .from("fixtures")
      .update({
        kickoff_at: fixture.api_kickoff_at,
        manually_updated_kickoff_at: false,
        manual_kickoff_at_updated_at: null,
        manual_kickoff_at_updated_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fixtureId)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    try {
      await supabaseAdmin.from("match_pulse_events").insert({
        event_type: "admin_notice",
        fixture_id: fixtureId,
        user_id: user.id,
        title: "MATCH TIME RESET",
        message: `${fixture.home_team} vs ${fixture.away_team} kickoff time was reset to API time.`,
        emoji: "🔄",
        metadata: {
          fixture_id: fixtureId,
          old_kickoff_at: fixture.kickoff_at,
          api_kickoff_at: fixture.api_kickoff_at,
        },
        event_key: `fixture-time-reset:${fixtureId}:${fixture.api_kickoff_at}`,
      });
    } catch (pulseError) {
      console.error("Pulse insert failed:", pulseError);
    }

    return NextResponse.json({
      success: true,
      fixture: updatedFixture,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to reset fixture time" },
      { status: 500 }
    );
  }
}
