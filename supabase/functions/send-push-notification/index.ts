import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@warikiru.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  userIds: string[];
  title: string;
  body: string;
  url?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Web Push crypto helpers using Web Crypto API
async function generatePushHeaders(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string
) {
  // Import web-push for Deno
  const webPush = await import(
    "https://esm.sh/web-push@3.6.7"
  );

  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  await webPush.sendNotification(
    {
      endpoint,
      keys: { p256dh, auth },
    },
    payload
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userIds, title, body, url } = (await req.json()) as PushRequest;

    if (!userIds?.length || !title || !body) {
      return jsonResponse({ error: "userIds, title e body são obrigatórios" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all push subscriptions for the given users
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    if (!subscriptions?.length) {
      return jsonResponse({ sent: 0, message: "Nenhuma subscription encontrada" });
    }

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await generatePushHeaders(sub.endpoint, sub.p256dh, sub.auth, payload);
        sent++;
      } catch (err) {
        console.error(`Push failed for ${sub.endpoint}:`, err);
        failed++;
        // If subscription is expired (410 Gone), remove it
        if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    return jsonResponse({ sent, failed });
  } catch (err) {
    console.error("send-push-notification error:", err);
    return jsonResponse({ error: "Erro interno" }, 500);
  }
});
