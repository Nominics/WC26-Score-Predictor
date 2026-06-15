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

    const { targetUserId, points, reason } = await req.json();

    if (!targetUserId || !points || points === 0 || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from("manual_point_awards")
      .insert({
        user_id: targetUserId,
        awarded_by: user.id,
        points: parseInt(points, 10),
        reason
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
