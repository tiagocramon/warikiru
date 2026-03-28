import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://00-divisor-de-contas.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  groupId: string;
  email: string;
  name: string;
  percentage: number;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildInviteUrl(groupId: string) {
  return `${SITE_URL}/convite?group=${groupId}`;
}

function isExistingUserError(message: string) {
  return /already.*registered|already been registered|user already exists/i.test(
    message
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      {
        error:
          "Secrets da função incompletos. Verifique SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
      },
      500
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Não autenticado." }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    return jsonResponse({ error: "Sessão inválida." }, 401);
  }

  try {
    const body = (await req.json()) as InviteRequest;
    const groupId = body.groupId?.trim();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const percentage = Number(body.percentage);

    if (!groupId || !email || !name || Number.isNaN(percentage)) {
      return jsonResponse({ error: "Dados do convite inválidos." }, 400);
    }

    const { data: group, error: groupError } = await userClient
      .from("groups")
      .select("id, owner_id")
      .eq("id", groupId)
      .single();

    if (groupError || !group) {
      return jsonResponse({ error: "Grupo não encontrado." }, 404);
    }

    if (group.owner_id !== user.id) {
      return jsonResponse(
        { error: "Apenas o dono do grupo pode enviar convites." },
        403
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const redirectTo = buildInviteUrl(groupId);

    const { data: member, error: insertError } = await userClient
      .from("group_members")
      .insert({
        group_id: groupId,
        invited_email: email,
        name,
        percentage,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !member) {
      return jsonResponse(
        { error: insertError?.message || "Não foi possível criar o convite." },
        400
      );
    }

    let deliveryMode: "invite" | "magiclink" = "invite";
    let deliveryError: Error | null = null;

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: { invited_to_group_id: groupId },
      }
    );

    if (inviteError) {
      if (isExistingUserError(inviteError.message)) {
        deliveryMode = "magiclink";

        const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { error: magicLinkError } = await publicClient.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: redirectTo,
          },
        });

        if (magicLinkError) {
          deliveryError = magicLinkError;
        }
      } else {
        deliveryError = inviteError;
      }
    }

    if (deliveryError) {
      await userClient.from("group_members").delete().eq("id", member.id);
      return jsonResponse(
        {
          error:
            deliveryError.message ||
            "Não foi possível enviar o convite por e-mail.",
        },
        400
      );
    }

    return jsonResponse({
      message: "Convite enviado com sucesso.",
      mode: deliveryMode,
    });
  } catch (error) {
    console.error("Error in invite-group-member:", error);
    return jsonResponse({ error: "Erro interno ao enviar convite." }, 500);
  }
});
