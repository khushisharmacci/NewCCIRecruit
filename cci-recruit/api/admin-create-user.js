import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, apikey"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { email, password, role = "recruiter", full_name, company_id = "default" } = body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password && password.trim() ? password.trim() : "CCI@Recruit2026!";
    const userName = (full_name && full_name.trim()) || cleanEmail.split("@")[0];

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in server environment variables.",
        needs_config: true,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Check if user already exists in auth.users
    let authUserId = null;

    try {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        console.error("List users error:", listError);
      }

      const existingAuthUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
      }
    } catch (listErr) {
      console.warn("Could not list users:", listErr);
    }

    if (authUserId) {
      // User already exists! Update password, confirm email, and set role metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUserId,
        {
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            full_name: userName,
            role: role,
            company_id: company_id,
          },
        }
      );

      if (updateError) {
        console.error("Update user error:", updateError);
        throw updateError;
      }
    } else {
      // Create new user with confirmed email and password
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: userName,
          role: role,
          company_id: company_id,
        },
      });

      if (createError) {
        // If user already exists in Auth, recover by looking them up and updating
        const errMsg = (createError.message || "").toLowerCase();
        if (errMsg.includes("already registered") || errMsg.includes("email_exists") || createError.status === 422) {
          const { data: retryList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = retryList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (found) {
            authUserId = found.id;
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                full_name: userName,
                role: role,
                company_id: company_id,
              },
            });
            if (updateErr) throw updateErr;
          } else {
            throw createError;
          }
        } else {
          console.error("Create user error:", createError);
          throw createError;
        }
      } else {
        authUserId = createData.user.id;
      }
    }

    // 2. Upsert user in recruiters profile table (strictly existing columns only)
    let existingRecruiter = null;
    const { data: recByAuth } = await supabaseAdmin
      .from("recruiters")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (recByAuth) {
      existingRecruiter = recByAuth;
    } else {
      const { data: recByEmail } = await supabaseAdmin
        .from("recruiters")
        .select("id")
        .ilike("email", cleanEmail)
        .maybeSingle();

      if (recByEmail) {
        existingRecruiter = recByEmail;
      }
    }

    const recruiterPayload = {
      auth_user_id: authUserId,
      email: cleanEmail,
      full_name: userName,
      role: role,
      company_id: company_id,
    };

    if (existingRecruiter) {
      const { error: recruiterUpdateError } = await supabaseAdmin
        .from("recruiters")
        .update(recruiterPayload)
        .eq("id", existingRecruiter.id);

      if (recruiterUpdateError) {
        console.error("Recruiter table update error:", recruiterUpdateError);
        throw recruiterUpdateError;
      }
    } else {
      const { error: recruiterInsertError } = await supabaseAdmin
        .from("recruiters")
        .insert(recruiterPayload);

      if (recruiterInsertError) {
        console.error("Recruiter table insert error:", recruiterInsertError);
        throw recruiterInsertError;
      }
    }

    return res.status(200).json({
      success: true,
      message: "User successfully created and activated",
      credentials: {
        email: cleanEmail,
        password: cleanPassword,
        role: role,
        full_name: userName,
      },
    });
  } catch (error) {
    console.error("Admin user creation failed:", error);
    return res.status(500).json({
      error: error.message || "Failed to create user account",
    });
  }
}
