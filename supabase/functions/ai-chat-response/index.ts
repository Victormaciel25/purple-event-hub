import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // fetch/XHR polyfill for OpenAI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { chat_id, message_id } = body as { chat_id?: string; message_id?: string };

    if (!chat_id || !message_id) {
      return new Response(JSON.stringify({ error: "chat_id and message_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase envs");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!openAIApiKey) {
      console.error("OPENAI_API_KEY not set");
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticated client (user context) for reads
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service role client for privileged writes (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify user session
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load chat
    const { data: chat, error: chatErr } = await supabaseUser
      .from("chats")
      .select("*")
      .eq("id", chat_id)
      .maybeSingle();
    if (chatErr || !chat) {
      console.error("Chat load error", chatErr);
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic guard: only respond to messages sent by the non-owner (i.e., the inquirer)
    const { data: msg, error: msgErr } = await supabaseUser
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("id", message_id)
      .maybeSingle();
    if (msgErr || !msg) {
      console.error("Message load error", msgErr);
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only consider responding if the last message wasn't sent by the owner
    const isFromOwner = msg.sender_id === chat.owner_id;
    if (isFromOwner) {
      return new Response(JSON.stringify({ skipped: true, reason: "Owner message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if we already sent an AI response after this message, skip
    const { data: existingAi } = await supabaseUser
      .from("messages")
      .select("id, created_at")
      .eq("chat_id", chat_id)
      .eq("is_ai_response", true)
      .gt("created_at", msg.created_at as string);
    if (existingAi && existingAi.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Already replied" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine context source (space or vendor) and whether AI is enabled
    let aiEnabled = true;
    let contextTitle = chat.space_name || "Conversa";
    let contextImage = chat.space_image || "";
    let contextDetails = "";

    if (chat.space_id) {
      const { data: space } = await supabaseUser
        .from("spaces")
        .select("id, name, description, price, capacity, address, state, phone, instagram, ai_enabled")
        .eq("id", chat.space_id)
        .maybeSingle();
      if (space) {
        aiEnabled = space.ai_enabled ?? true;
        contextTitle = space.name || contextTitle;
        contextDetails = `Descrição: ${space.description || ""}\nPreço: ${space.price || ""}\nCapacidade: ${space.capacity || ""}\nEndereço: ${space.address || ""} - ${space.state || ""}\nContato: ${space.phone || ""}\nInstagram: ${space.instagram || ""}`;
      }
    } else {
      // Try vendor by owner_id (first approved vendor)
      const { data: vendor } = await supabaseUser
        .from("vendors")
        .select("name, description, category, address, contact_number, instagram, ai_enabled")
        .eq("user_id", chat.owner_id)
        .limit(1)
        .maybeSingle();
      if (vendor) {
        aiEnabled = vendor.ai_enabled ?? true;
        contextTitle = vendor.name || contextTitle;
        contextDetails = `Categoria: ${vendor.category || ""}\nDescrição: ${vendor.description || ""}\nEndereço/Atuação: ${vendor.address || ""}\nContato: ${vendor.contact_number || ""}\nInstagram: ${vendor.instagram || ""}`;
      }
    }

    if (!aiEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "AI disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt for OpenAI
    const systemPrompt = `
Você é um assistente do iParty Brasil que responde em português do Brasil, de forma educada, útil e concisa.
Você está respondendo em nome de: ${contextTitle}.
Use as informações de contexto abaixo para responder perguntas de clientes. Se não souber algo, seja transparente e sugera próximas etapas (por exemplo: pedir datas, número de convidados, tipo de evento).
Nunca compartilhe dados sensíveis. Evite prometer disponibilidade exata: peça a data/horário.
Se perguntarem sobre valores, responda com a faixa/valor do contexto quando existir e ofereça detalhamento.
Se o usuário pedir contato, forneça o telefone/Instagram do contexto quando disponível.
`; 

    const userPrompt = `
Mensagem do cliente: "${msg.content}"

Contexto do espaço/fornecedor:
${contextDetails || "(sem detalhes disponíveis)"}
`;

    // Call OpenAI
    const aiRes = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const aiText: string = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    if (!aiText) {
      return new Response(JSON.stringify({ skipped: true, reason: "Empty AI response" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert AI message as owner using service role
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert({
        chat_id,
        sender_id: chat.owner_id, // reply on behalf of owner
        content: aiText,
        is_ai_response: true,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("AI message insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to insert AI message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update chat last message fields
    await supabaseAdmin
      .from("chats")
      .update({
        last_message: aiText.slice(0, 300),
        last_message_time: new Date().toISOString(),
        last_message_sender_id: chat.owner_id,
        has_unread: true,
      })
      .eq("id", chat_id);

    return new Response(JSON.stringify({ ok: true, message_id: inserted?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ai-chat-response error:", error?.message || error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
