
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

    const { targetUserId, profileIconKey } = await req.json();

    if (!targetUserId || !profileIconKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Assign Icon ONLY if user doesn't already have one
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("profile_icon_key")
      .eq("id", targetUserId)
      .single();

    if (targetProfile?.profile_icon_key) {
      return NextResponse.json({ error: "User already has a profile icon selected." }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        profile_icon_key: profileIconKey,
        profile_icon_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", targetUserId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
