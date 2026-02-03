import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  username: string;
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Neautorizovaný přístup" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create a client with the user's token to verify they're an organizer
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Check if the caller has organizer role
    const { data: { user: callerUser } } = await userClient.auth.getUser();
    if (!callerUser) {
      return new Response(
        JSON.stringify({ error: "Neautorizovaný přístup" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: callerRoles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id);

    const isOrganizer = callerRoles?.some((r) => r.role === "organizer");
    if (!isOrganizer) {
      return new Response(
        JSON.stringify({ error: "Pouze organizátor může vytvářet uživatele" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse the request
    const { username, password }: CreateUserRequest = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Přezdívka a heslo jsou povinné" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate username
    if (username.length < 2 || username.length > 30) {
      return new Response(
        JSON.stringify({ error: "Přezdívka musí mít 2-30 znaků" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate password
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Heslo musí mít alespoň 6 znaků" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate a fake email from username (for Supabase auth)
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@ls.ls`;

    // Check if username already exists in profiles
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "Uživatel s touto přezdívkou již existuje" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if email already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === email);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "Uživatel s touto přezdívkou již existuje" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
      },
    });

    if (createError || !newUser?.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Nepodařilo se vytvořit uživatele" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update the profile to require password change
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ requires_password_change: true })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // User was created but profile update failed - not critical
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Uživatel @${username} byl vytvořen`,
        email,
        user_id: newUser.user.id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in admin-create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Interní chyba serveru" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
