import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-chat-id, x-message-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== AI CHAT RESPONSE START ===");
  
  try {
    // Try to parse JSON body but also support query params and headers as fallback
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.warn("JSON body missing or invalid, will try fallbacks:", e);
    }

    const url = new URL(req.url);
    const qpChat = url.searchParams.get("chat_id") || undefined;
    const qpMsg = url.searchParams.get("message_id") || undefined;
    const hdrChat = req.headers.get("x-chat-id") || undefined;
    const hdrMsg = req.headers.get("x-message-id") || undefined;

    const chat_id = (body?.chat_id as string) || qpChat || hdrChat;
    const message_id = (body?.message_id as string) || qpMsg || hdrMsg;

    console.log("Resolved params:", { chat_id, message_id, hasBody: !!body?.chat_id || !!body?.message_id, qp: { qpChat, qpMsg }, hdr: { hdrChat, hdrMsg } });

    if (!chat_id || !message_id) {
      console.error("Missing required parameters after fallbacks");
      return new Response(JSON.stringify({ error: "chat_id and message_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    console.log("Environment check:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      hasOpenAIKey: !!openAIApiKey
    });

    if (!supabaseUrl || !serviceRoleKey || !openAIApiKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for all operations to bypass RLS issues
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log("Supabase client created");

    // Get the authorization header and extract the user ID from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Invalid authorization header");
      return new Response(JSON.stringify({ error: "Invalid authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse JWT to get user ID with proper base64url decoding
    const token = authHeader.replace("Bearer ", "");
    
    // Helper function for base64url decoding
    function base64urlDecode(str: string): string {
      // Convert base64url to base64 by replacing URL-safe characters and adding padding
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if necessary
      while (base64.length % 4) {
        base64 += '=';
      }
      return atob(base64);
    }
    
    let userId: string;
    try {
      const payloadStr = base64urlDecode(token.split('.')[1]);
      const payload = JSON.parse(payloadStr);
      userId = payload.sub;
      console.log("✅ JWT decoded successfully, user ID:", userId);
    } catch (jwtError) {
      console.error("🔴 JWT decode error:", jwtError);
      return new Response(JSON.stringify({ error: "Invalid JWT token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("User ID from token:", userId);

    if (!userId) {
      console.error("No user ID in token");
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load chat
    console.log("Loading chat:", chat_id);
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chat_id)
      .maybeSingle();
      
    console.log("Chat query result:", { chat, error: chatErr });
    
    if (chatErr || !chat) {
      console.error("Chat load error", chatErr);
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this chat
    if (chat.user_id !== userId && chat.owner_id !== userId) {
      console.error("User access denied:", { userId, chatUserId: chat.user_id, chatOwnerId: chat.owner_id });
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the message
    console.log("Loading message:", message_id);
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, chat_id")
      .eq("id", message_id)
      .maybeSingle();
      
    console.log("Message query result:", { msg, error: msgErr });
    
    if (msgErr || !msg) {
      console.error("Message load error", msgErr);
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify message belongs to the specified chat (additional security check)
    if (msg.chat_id !== chat_id) {
      console.error("🔴 Message/chat ID mismatch:", { msgChatId: msg.chat_id, expectedChatId: chat_id });
      return new Response(JSON.stringify({ error: "Message does not belong to specified chat" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only respond to messages sent by the non-owner (inquirer)
    const isFromOwner = msg.sender_id === chat.owner_id;
    console.log("📋 Message sender check:", { senderID: msg.sender_id, ownerID: chat.owner_id, isFromOwner });
    
    if (isFromOwner) {
      console.log("⏭️ SKIPPED - Message from owner (AI only responds to inquirers)");
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: "Owner message - AI only responds to customer inquiries",
        details: { sender_id: msg.sender_id, owner_id: chat.owner_id }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing AI response to avoid duplicates
    console.log("Checking for existing AI responses after:", msg.created_at);
    const { data: existingAi } = await supabase
      .from("messages")
      .select("id, created_at")
      .eq("chat_id", chat_id)
      .eq("is_ai_response", true)
      .gt("created_at", msg.created_at as string);
      
    console.log("Existing AI responses:", existingAi);
    
    if (existingAi && existingAi.length > 0) {
      console.log("⏭️ SKIPPED - AI already replied to this message");
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: "Already replied", 
        existing_responses: existingAi.length 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get context information
    let aiEnabled = true;
    let contextTitle = chat.space_name || chat.vendor_name || "Conversa";
    let contextDetails = "";

    console.log("Getting context for:", { spaceId: chat.space_id, vendorId: chat.vendor_id });

    if (chat.space_id) {
      const { data: space, error: spaceErr } = await supabase
        .from("spaces")
        .select("id, name, description, price, capacity, address, state, phone, instagram, ai_enabled")
        .eq("id", chat.space_id)
        .maybeSingle();
        
      console.log("Space context:", { space, error: spaceErr });
      
      if (space) {
        aiEnabled = space.ai_enabled ?? true;
        contextTitle = space.name || contextTitle;
        contextDetails = `Descrição: ${space.description || ""}\nPreço: ${space.price || ""}\nCapacidade: ${space.capacity || ""}\nEndereço: ${space.address || ""} - ${space.state || ""}\nContato: ${space.phone || ""}\nInstagram: ${space.instagram || ""}`;
      }
    } else if (chat.vendor_id) {
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("name, description, category, address, contact_number, instagram, ai_enabled")
        .eq("id", chat.vendor_id)
        .maybeSingle();
        
      console.log("Vendor context:", { vendor, error: vendorErr });
      
      if (vendor) {
        aiEnabled = vendor.ai_enabled ?? true;
        contextTitle = vendor.name || contextTitle;
        contextDetails = `Categoria: ${vendor.category || ""}\nDescrição: ${vendor.description || ""}\nEndereço/Atuação: ${vendor.address || ""}\nContato: ${vendor.contact_number || ""}\nInstagram: ${vendor.instagram || ""}`;
      }
    } else {
      // Fallback: try to find vendor by owner_id
      console.log("Fallback: searching vendor by owner_id:", chat.owner_id);
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("name, description, category, address, contact_number, instagram, ai_enabled")
        .eq("user_id", chat.owner_id)
        .limit(1)
        .maybeSingle();
        
      console.log("Fallback vendor context:", { vendor, error: vendorErr });
      
      if (vendor) {
        aiEnabled = vendor.ai_enabled ?? true;
        contextTitle = vendor.name || contextTitle;
        contextDetails = `Categoria: ${vendor.category || ""}\nDescrição: ${vendor.description || ""}\nEndereço/Atuação: ${vendor.address || ""}\nContato: ${vendor.contact_number || ""}\nInstagram: ${vendor.instagram || ""}`;
      }
    }

    console.log("AI enabled check:", aiEnabled);
    
    if (!aiEnabled) {
      console.log("⏭️ SKIPPED - AI disabled for this space/vendor");
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: "AI disabled for this space/vendor",
        context: contextTitle
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate OpenAI prompt
    console.log("Generating AI response with context:", { contextTitle, hasDetails: !!contextDetails });
    
    const systemPrompt = `Você é um assistente do iParty Brasil que responde em português do Brasil, de forma educada, útil e concisa.
Você está respondendo em nome de: ${contextTitle}.
Use as informações de contexto abaixo para responder perguntas de clientes. Se não souber algo, seja transparente e sugira próximas etapas (por exemplo: pedir datas, número de convidados, tipo de evento).
Nunca compartilhe dados sensíveis. Evite prometer disponibilidade exata: peça a data/horário.
Se perguntarem sobre valores, responda com a faixa/valor do contexto quando existir e ofereça detalhamento.
Se o usuário pedir contato, forneça o telefone/Instagram do contexto quando disponível.`;

    const userPrompt = `Mensagem do cliente: "${msg.content}"

Contexto do espaço/fornecedor:
${contextDetails || "(sem detalhes disponíveis)"}`;

    console.log("Calling OpenAI API...");
    
    // Call OpenAI API
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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

    console.log("OpenAI response status:", aiRes.status);

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenAI error:", errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const aiText = aiJson?.choices?.[0]?.message?.content?.trim() || "";
    
    console.log("AI response received:", { hasResponse: !!aiText, length: aiText.length });
    
    if (!aiText) {
      console.log("⏭️ SKIPPED - Empty AI response from OpenAI");
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: "Empty AI response",
        openai_response: aiJson
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert AI message using service role client
    console.log("Inserting AI message...");
    const { data: inserted, error: insertErr } = await supabase
      .from("messages")
      .insert({
        chat_id,
        sender_id: chat.owner_id, // reply on behalf of owner
        content: aiText,
        is_ai_response: true,
      })
      .select("id")
      .single();

    console.log("Insert result:", { inserted, error: insertErr });

    if (insertErr) {
      console.error("AI message insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to insert AI message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update chat last message fields
    console.log("Updating chat last message...");
    const { error: updateErr } = await supabase
      .from("chats")
      .update({
        last_message: aiText.slice(0, 300),
        last_message_time: new Date().toISOString(),
        last_message_sender_id: chat.owner_id,
        has_unread: true,
      })
      .eq("id", chat_id);

    if (updateErr) {
      console.error("Chat update error:", updateErr);
    }

    console.log("=== AI CHAT RESPONSE SUCCESS ===");
    return new Response(JSON.stringify({ ok: true, message_id: inserted?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("=== AI CHAT RESPONSE ERROR ===", error?.message || error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});