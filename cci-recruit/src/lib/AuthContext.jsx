import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      return;
    }

    let { data: recruiter, error } = await supabase
      .from("recruiters")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (!recruiter) {
      const { data } = await supabase
        .from("recruiters")
        .select("*")
        .ilike("email", authUser.email)
        .maybeSingle();

      recruiter = data || null;

      // Link auth_user_id if found by email but missing id
      if (recruiter && !recruiter.auth_user_id) {
        try {
          await supabase
            .from("recruiters")
            .update({ auth_user_id: authUser.id })
            .eq("id", recruiter.id);
        } catch (linkErr) {
          console.warn("Could not link auth_user_id:", linkErr);
        }
      }
    }

    // Auto-heal: If user signed in (e.g. Google OAuth) but has no record in recruiters yet
    if (!recruiter && authUser) {
      const userMeta = authUser.user_metadata || {};
      const fullName = userMeta.full_name || userMeta.name || authUser.email?.split("@")[0] || "User";
      const initialRole = userMeta.role || "recruiter";
      const companyId = userMeta.company_id || "default";

      try {
        const { data: created, error: insertError } = await supabase
          .from("recruiters")
          .insert({
            auth_user_id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            role: initialRole,
            company_id: companyId,
            account_status: "active",
          })
          .select()
          .maybeSingle();

        if (created) {
          recruiter = created;
        } else if (insertError) {
          // Retry without account_status if column does not exist
          const { data: fallbackCreated } = await supabase
            .from("recruiters")
            .insert({
              auth_user_id: authUser.id,
              email: authUser.email,
              full_name: fullName,
              role: initialRole,
              company_id: companyId,
            })
            .select()
            .maybeSingle();

          if (fallbackCreated) {
            recruiter = fallbackCreated;
          }
        }
      } catch (insertErr) {
        console.warn("Auto-creation of recruiter profile failed:", insertErr);
      }
    }

    if (error) {
      console.error("Recruiter lookup error:", error);
    }

    const mergedUser = {
      ...authUser,
      role: recruiter?.role || authUser?.user_metadata?.role || "recruiter",
      company_id: recruiter?.company_id || authUser?.user_metadata?.company_id || "default",
      ...(recruiter || {}),
    };
    setUser(mergedUser);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      await loadProfile(authUser);

      setIsLoadingAuth(false);
    };

    initializeAuth();

        const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("AUTH EVENT", _event);
        console.log("SESSION", session);
        
        // Intercept password reset link clicks and redirect to the reset form
        if (_event === "PASSWORD_RECOVERY") {
          window.location.href = "/reset-password";
          return;
        }

        await loadProfile(session?.user);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);