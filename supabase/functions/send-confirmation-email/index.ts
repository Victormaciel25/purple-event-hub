
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// 1) Valida e instancia tudo ANTES de subir o handler
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  console.error("❌ ERRO CRÍTICO: RESEND_API_KEY não encontrada");
  throw new Error("Missing RESEND_API_KEY");
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) {
  console.error("❌ ERRO CRÍTICO: SUPABASE_URL não encontrada");
  throw new Error("Missing SUPABASE_URL");
}

const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
if (!anonKey) {
  console.error("❌ ERRO CRÍTICO: SUPABASE_ANON_KEY não encontrada");
  throw new Error("Missing SUPABASE_ANON_KEY");
}

// Instância única do Resend
const resend = new Resend(resendApiKey);
console.log("🔑 Variáveis de ambiente validadas e Resend inicializado");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
}

interface User {
  id: string;
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}

interface WebhookPayload {
  user: User;
  email_data: EmailData;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("🔔 Email confirmation webhook received:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch (parseError) {
    console.error("❌ Erro ao fazer parse do JSON:", parseError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Invalid JSON payload" 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  console.log("Webhook payload:", JSON.stringify(payload, null, 2));

  // Validar dados essenciais do payload
  const { user, email_data } = payload;
  
  if (!user?.email) {
    console.error("❌ Payload sem user.email");
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Missing user.email in payload" 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  if (!email_data?.token) {
    console.error("❌ Payload sem email_data.token");
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Missing token in email_data" 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const { token, redirect_to, email_action_type } = email_data;

  // Log do token (mascarado para segurança)
  console.log("Token received (masked):", token.substring(0, 8) + "...");

  // Build confirmation URL usando o token correto (não o hash)
  const confirmationUrl = `${supabaseUrl}/auth/v1/verify`
    + `?token=${token}`
    + `&type=${email_action_type}`
    + `&redirect_to=${encodeURIComponent(redirect_to)}`
    + `&apikey=${anonKey}`;
  
  console.log('Confirmation URL:', confirmationUrl);
  
  const firstName = user.user_metadata?.first_name || "Usuário";
  
  // HTML email template with iParty purple colors
  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirme seu email - iParty</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="https://www.ipartybrasil.com/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png" alt="iParty" style="width: 80px; height: 80px;">
        <h1 style="color: #9b87f5; margin: 20px 0;">Bem-vindo ao iParty!</h1>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
        <h2 style="color: #333; margin-bottom: 20px;">Olá, ${firstName}!</h2>
        <p style="margin-bottom: 20px; font-size: 16px;">
          Obrigado por se cadastrar no iParty! Para completar seu cadastro, por favor confirme seu endereço de email clicando no botão abaixo:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmationUrl}" 
             style="background-color: #9b87f5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
            Confirmar Email
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Se o botão não funcionar, copie e cole este link no seu navegador:
        </p>
        <p style="word-break: break-all; background-color: #f1f1f1; padding: 10px; border-radius: 5px; font-size: 12px;">
          ${confirmationUrl}
        </p>
      </div>
      
      <div style="text-align: center; color: #666; font-size: 14px;">
        <p>
          Depois de confirmar seu email, você poderá encontrar os melhores espaços para eventos e fornecedores em nossa plataforma.
        </p>
        <p style="margin-top: 30px;">
          Se você não se cadastrou no iParty, pode ignorar este email com segurança.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          © 2024 iParty. Todos os direitos reservados.
        </p>
      </div>
    </body>
    </html>
  `;

  console.log("📧 Enviando email para:", user.email);
  console.log("📧 De: iParty <onboarding@resend.dev>");

  try {
    const emailResult = await resend.emails.send({
      from: "iParty <onboarding@resend.dev>",
      to: [user.email],
      subject: "Confirme seu email - iParty",
      html: htmlTemplate,
    });

    console.log("✅ Email enviado com sucesso!");
    console.log("📧 Resend result:", emailResult);
    console.log("📧 Email ID:", emailResult.id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResult.id,
      message: "Email de confirmação enviado com sucesso"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (sendError: any) {
    console.error("❌ Erro no envio de email:", sendError);
    console.error("Stack trace:", sendError.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: sendError.message,
        details: sendError.toString(),
        stack: sendError.stack
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
