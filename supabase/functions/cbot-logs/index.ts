import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const botToken = url.searchParams.get('botId')

    if (!botToken) throw new Error("Missing botId parameter")

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const cleanToken = botToken.trim(); 

    // --- STEP 1: VALIDATE USER (Same as get-signal) ---
    const { data: userProfile, error: userError } = await supabase
      .from('bot_signals')
      .select('user_id, is_active')
      .eq('bot_token', cleanToken)
      .maybeSingle();

    if (userError || !userProfile) {
        return new Response(JSON.stringify({ error: "TOKEN_NOT_FOUND", token_received: cleanToken }), { 
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // --- STEP 2: INSERT LOG ---
    // Read the log message submitted securely from the C# HTTP Post request
    const { message } = await req.json();

    if (message) {
        await supabase.from('cbot_logs').insert({ user_id: userProfile.user_id, message });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
