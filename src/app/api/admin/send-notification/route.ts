
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendNotification, NotificationType } from "@/lib/notifications/send-notification";

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

    const { targetUserIds, allUsers, title, message, type = 'manual_admin' } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and Message are required" }, { status: 400 });
    }

    let userIds: string[] = [];

    if (allUsers) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id");
      userIds = profiles?.map(p => p.id) || [];
    } else if (targetUserIds && Array.isArray(targetUserIds)) {
      userIds = targetUserIds;
    }

    if (userIds.length === 0) {
      return NextResponse.json({ error: "No target users found" }, { status: 400 });
    }

    // Send notifications in batches to avoid timeouts
    const batchSize = 50;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      await Promise.all(batch.map(userId => 
        sendNotification({
          userId,
          type: type as NotificationType,
          title,
          body: message,
          data: { url: "/dashboard" }
        })
      ));
    }

    return NextResponse.json({ success: true, sentCount: userIds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
