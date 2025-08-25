
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

interface WebhookPayload {
  user: {
    id: string;
    email: string;
    user_metadata: {
      first_name?: string;
      last_name?: string;
    };
  };
  email_data: EmailData;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== EMAIL HANDLER FUNCTION STARTED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== READING REQUEST BODY ===");
    const rawBody = await req.text();
    console.log("Raw request body:", rawBody);
    
    if (!rawBody) {
      console.error("Empty request body received");
      return new Response(
        JSON.stringify({ success: false, error: "Empty request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("=== PARSING JSON PAYLOAD ===");
    const payload: WebhookPayload = JSON.parse(rawBody);
    console.log("Parsed payload:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    
    console.log("=== VALIDATING PAYLOAD STRUCTURE ===");
    console.log("User exists:", !!user);
    console.log("Email data exists:", !!email_data);
    
    if (!user || !email_data) {
      console.error("Missing user or email_data in payload");
      console.error("User:", user);
      console.error("Email data:", email_data);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid payload structure" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { token_hash, email_action_type, redirect_to, site_url } = email_data;

    console.log("=== EMAIL DATA DETAILS ===");
    console.log("Email action type:", email_action_type);
    console.log("User email:", user.email);
    console.log("User ID:", user.id);
    console.log("Token hash exists:", !!token_hash);
    console.log("Site URL:", site_url);
    console.log("Redirect to:", redirect_to);

    // Verificar se temos a API key do Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("Resend API key exists:", !!resendApiKey);
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not found in environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const firstName = user.user_metadata?.first_name || "Usuário";
    const baseUrl = site_url.replace('/auth/v1', '');
    
    console.log("=== PROCESSING EMAIL TYPE ===");
    console.log("Processing email type:", email_action_type);
    console.log("First name for email:", firstName);
    console.log("Base URL:", baseUrl);

    let emailPayload;
    let emailType;

    if (email_action_type === 'signup') {
      console.log("=== PROCESSING CONFIRMATION EMAIL ===");
      emailType = "confirmation";
      
      const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || 'https://www.ipartybrasil.com'}`;
      console.log("Confirmation URL:", confirmationUrl);

      emailPayload = {
        from: "Suporte iParty <suporte@ipartybrasil.com>",
        to: [user.email],
        subject: "Confirme sua conta - iParty",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirme sua conta - iParty</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://www.ipartybrasil.com/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png" alt="iParty" style="width: 80px; height: auto;">
              <h1 style="color: #8B5CF6; margin: 20px 0;">Confirme sua Conta</h1>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">Bem-vindo, ${firstName}!</h2>
              
              <p style="margin-bottom: 20px;">
                Obrigado por se cadastrar no iParty! Para completar seu cadastro e começar a usar nossa plataforma, confirme seu email clicando no botão abaixo.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${confirmationUrl}" 
                   style="background-color: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Confirmar Email
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Se o botão acima não funcionar, copie e cole o seguinte link em seu navegador:
              </p>
              <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px;">
                ${confirmationUrl}
              </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 14px;">
              <p>Se você não se cadastrou no iParty, pode ignorar este email com segurança.</p>
              <p>Este link expira em 24 horas.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p>© 2024 iParty Brasil. Todos os direitos reservados.</p>
            </div>
          </body>
          </html>
        `,
      };

    } else if (email_action_type === 'recovery') {
      console.log("=== PROCESSING PASSWORD RECOVERY EMAIL ===");
      emailType = "password recovery";
      
      // URL para a página de redefinição de senha
      const resetUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=https://www.ipartybrasil.com/reset-password`;
      console.log("Reset URL:", resetUrl);

      emailPayload = {
        from: "Suporte iParty <suporte@ipartybrasil.com>",
        to: [user.email],
        subject: "Redefinir senha - iParty",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redefinir senha - iParty</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://www.ipartybrasil.com/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png" alt="iParty" style="width: 80px; height: auto;">
              <h1 style="color: #8B5CF6; margin: 20px 0;">Redefinir Senha</h1>
            </div>
            
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">Olá, ${firstName}!</h2>
              
              <p style="margin-bottom: 20px;">
                Você solicitou a redefinição de senha para sua conta no iParty. Para criar uma nova senha, clique no botão abaixo.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Redefinir Senha
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Se o botão acima não funcionar, copie e cole o seguinte link em seu navegador:
              </p>
              <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px;">
                ${resetUrl}
              </p>
            </div>
            
            <div style="text-align: center; color: #666; font-size: 14px;">
              <p>Se você não solicitou esta redefinição, pode ignorar este email com segurança.</p>
              <p>Este link expira em 1 hora.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p>© 2024 iParty Brasil. Todos os direitos reservados.</p>
            </div>
          </body>
          </html>
        `,
      };

    } else {
      console.log(`=== IGNORING EMAIL TYPE: ${email_action_type} ===`);
      return new Response(
        JSON.stringify({ success: true, message: `Ignored email type: ${email_action_type}` }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("=== SENDING EMAIL VIA RESEND ===");
    console.log("Email type:", emailType);
    console.log("Sending to:", user.email);
    console.log("From:", emailPayload.from);
    console.log("Subject:", emailPayload.subject);

    const emailResponse = await resend.emails.send(emailPayload);

    console.log("=== EMAIL SENT SUCCESSFULLY ===");
    console.log("Email type:", emailType);
    console.log("Resend response:", JSON.stringify(emailResponse, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${emailType} email sent successfully`, 
        emailId: emailResponse.data?.id,
        emailType: emailType
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("=== ERROR SENDING EMAIL ===");
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor.name);
    console.error("Error details:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send email",
        errorType: error.constructor.name
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
