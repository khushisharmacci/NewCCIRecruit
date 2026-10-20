import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables in Edge Function.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json().catch(() => ({}));
    const { email, password, role = "recruiter", full_name, company_id = "default" } = body;

    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password && password.trim() ? password.trim() : "CCI@Recruit2026!";
    const userName = (full_name && full_name.trim()) || cleanEmail.split("@")[0];

    // 1. Check if user exists in Auth
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("List users error:", listError);
    }

    const existingAuthUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === cleanEmail
    );

    let authUserId = null;

    if (existingAuthUser) {
      // User already exists! Update their password and confirm their email
      authUserId = existingAuthUser.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: userName,
            role: role,
          },
        }
      );

      if (updateError) {
        console.error("Update user error:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    } else {
      // Create user with password and confirm email immediately
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: userName,
          role: role,
        },
      });

      if (createError) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: createError.message }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      authUserId = createData.user.id;
    }

    // 2. Upsert in recruiters table
    const { data: existingRecruiter } = await supabaseAdmin
      .from("recruiters")
      .select("id")
      .or(`auth_user_id.eq.${authUserId},email.ilike.${cleanEmail}`)
      .maybeSingle();

    if (existingRecruiter) {
      await supabaseAdmin
        .from("recruiters")
        .update({
          auth_user_id: authUserId,
          email: cleanEmail,
          full_name: userName,
          role: role,
          account_status: "active",
          company_id: company_id,
        })
        .eq("id", existingRecruiter.id);
    } else {
      await supabaseAdmin
        .from("recruiters")
        .insert({
          auth_user_id: authUserId,
          email: cleanEmail,
          full_name: userName,
          role: role,
          account_status: "active",
          company_id: company_id,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User successfully created and activated",
        credentials: {
          email: cleanEmail,
          password: cleanPassword,
          role: role,
          full_name: userName,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("quick-handler error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
