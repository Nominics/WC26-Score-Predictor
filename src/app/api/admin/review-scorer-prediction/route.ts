import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendNotification } from "@/lib/notifications/send-notification";

/**
 * API Route for Admin Review of Scorer Predictions
 * POST /api/admin/review-scorer-prediction
 */
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

    // Verify requesting user is a superadmin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { predictionId, result, note } = await req.json();

    if (!predictionId || !result) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch prediction with related data for notification/pulse
    const { data: prediction, error: fetchError } = await supabaseAdmin
      .from("predictions")
      .select(`
        id,
        user_id,
        fixture_id,
        predicted_scorer_name,
        scorer_prediction_status,
        fixtures (home_team, away_team),
        profiles (display_name)
      `)
      .eq("id", predictionId)
      .single();

    if (fetchError || !prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    if (!prediction.predicted_scorer_name) {
      return NextResponse.json({ error: "No scorer prediction to review." }, { status: 400 });
    }

    const points = result === "correct" ? 2 : 0;
    const status = result === "correct" ? "correct" : "incorrect";

    // 2. Update the prediction record
    const { data: updatedPrediction, error: updateError } = await supabaseAdmin
      .from("predictions")
      .update({
        scorer_prediction_status: status,
        scorer_prediction_points: points,
        scorer_reviewed_by: user.id,
        scorer_reviewed_at: new Date().toISOString(),
        scorer_admin_note: note || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", predictionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. If correct, trigger notifications and pulse event
    if (result === "correct") {
      const eventKey = `scorer-bonus:${predictionId}`;
      const playerName = (prediction.profiles as any)?.display_name || "A player";
      const scorerName = prediction.predicted_scorer_name;
      const fixtureName = `${(prediction.fixtures as any)?.home_team} vs ${(prediction.fixtures as any)?.away_team}`;

      // Arena Alert (Notification)
      await sendNotification({
        userId: prediction.user_id,
        type: 'bonus_points',
        title: "Scorer Bonus!",
        body: `You received +2 points for correctly predicting ${scorerName} to score in ${fixtureName}.`,
        eventKey,
        data: {
          fixture_id: prediction.fixture_id,
          prediction_id: predictionId,
          points: 2,
          reason: "correct_scorer_prediction"
        }
      });

      // Match Pulse Event (Public Feed)
      try {
        await supabaseAdmin.from("match_pulse_events").insert({
          event_type: "bonus_points",
          title: "SCORER BONUS",
          emoji: "🎯",
          message: `${playerName} received +2 points for predicting ${scorerName} to score.`,
          user_id: prediction.user_id,
          fixture_id: prediction.fixture_id,
          metadata: { 
            prediction_id: predictionId, 
            scorer_name: scorerName, 
            points: 2 
          },
          event_key: eventKey
        });
      } catch (pulseErr) {
        console.error("Pulse event failed during review:", pulseErr);
      }
    }

    return NextResponse.json({ success: true, prediction: updatedPrediction });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
