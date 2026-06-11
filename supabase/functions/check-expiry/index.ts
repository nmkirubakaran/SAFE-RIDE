import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async () => {
  try {
    const today    = new Date();
    const in30days = new Date(today);
    in30days.setDate(today.getDate() + 30);

    const todayStr  = today.toISOString().split("T")[0];
    const futureStr = in30days.toISOString().split("T")[0];

    // Step 1 - Get expiring documents
    const { data: docs, error: docsError } = await supabase
      .from("documents")
      .select("user_id, doc_type, expiry_date")
      .lte("expiry_date", futureStr)
      .gte("expiry_date", todayStr);

    if (docsError) throw new Error("Docs query failed: " + docsError.message);
    if (!docs || docs.length === 0)
      return new Response("No expiring documents found", { status: 200 });

    // Step 2 - Get unique user IDs
    const userIds = [...new Set(docs.map((d: any) => d.user_id))];

    // Step 3 - Get email for each user via admin API
    const emailMap: Record<string, string> = {};
    for (const uid of userIds) {
      const { data } = await supabase.auth.admin.getUserById(uid as string);
      if (data?.user?.email) emailMap[uid as string] = data.user.email;
    }

    // Step 4 - Group docs by email
    const byUser: Record<string, any[]> = {};
    for (const doc of docs) {
      const email = emailMap[doc.user_id];
      if (!email) continue;
      if (!byUser[email]) byUser[email] = [];
      byUser[email].push(doc);
    }

    if (Object.keys(byUser).length === 0)
      return new Response("No user emails found", { status: 200 });

    // Step 5 - Send one email per user
    for (const [email, userDocs] of Object.entries(byUser)) {
      const docList = userDocs.map((d: any) => {
        const days = Math.ceil(
          (new Date(d.expiry_date).getTime() - today.getTime()) / (1000*60*60*24)
        );
        return `<li><strong>${d.doc_type}</strong> — expires in <strong>${days} day${days !== 1 ? "s" : ""}</strong> (${d.expiry_date})</li>`;
      }).join("");

      const html = `
        <div style="font-family:sans-serif; max-width:480px; margin:0 auto;">
          <div style="background:#185FA5; color:#fff; padding:20px; border-radius:10px 10px 0 0; text-align:center;">
            <h1 style="margin:0; font-size:20px;">🪖 SafeRide Alert</h1>
            <p style="margin:6px 0 0; opacity:0.9; font-size:13px;">Document expiry reminder</p>
          </div>
          <div style="background:#fff; border:1px solid #e2e8f0; border-top:none; padding:20px; border-radius:0 0 10px 10px;">
            <p style="color:#1a1a2e;">Hi there,</p>
            <p style="color:#64748b;">The following documents are expiring soon:</p>
            <ul style="color:#1a1a2e; line-height:2;">${docList}</ul>
            <p style="color:#64748b; margin-top:16px;">Please renew them before they expire to stay road legal.</p>
            <a href="https://safe-ride-pied.vercel.app/dashboard.html"
               style="display:inline-block; background:#185FA5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; margin-top:10px; font-weight:500;">
              Open SafeRide Dashboard
            </a>
            <p style="color:#94a3b8; font-size:11px; margin-top:20px;">SafeRide Smart Helmet System</p>
          </div>
        </div>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from:    "SafeRide <onboarding@resend.dev>",
          to:      [email],
          subject: "⚠️ Your SafeRide documents are expiring soon!",
          html
        })
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text();
        throw new Error("Resend error: " + errText);
      }
    }

    return new Response(
      `Sent alerts to ${Object.keys(byUser).length} user(s)`, 
      { status: 200 }
    );

  } catch (err: any) {
    return new Response("Error: " + err.message, { status: 500 });
  }
});