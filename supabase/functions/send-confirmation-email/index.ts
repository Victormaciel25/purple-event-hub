
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
  console.log("=== CONFIRMATION EMAIL FUNCTION CALLED ===");
  console.log("Request method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log("=== CONFIRMATION PAYLOAD RECEIVED ===");
    console.log("Full payload:", JSON.stringify(payload, null, 2));

    const { user, email_data } = payload;
    const { token_hash, email_action_type, redirect_to, site_url } = email_data;

    console.log("=== EMAIL DATA ===");
    console.log("Email action type:", email_action_type);
    console.log("User email:", user.email);

    // Só processar emails de confirmação de cadastro
    if (email_action_type !== 'signup') {
      console.log(`=== IGNORING EMAIL TYPE: ${email_action_type} - NOT A SIGNUP CONFIRMATION ===`);
      return new Response(
        JSON.stringify({ success: true, message: `Ignored email type: ${email_action_type}` }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Construir a URL de confirmação
    const baseUrl = site_url.replace('/auth/v1', '');
    const confirmUrl = `${baseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to || 'https://www.ipartybrasil.com'}`;

    console.log("=== SENDING CONFIRMATION EMAIL ===");
    console.log("Sending to:", user.email);
    console.log("Confirmation URL:", confirmUrl);

    const firstName = user.user_metadata?.first_name || "Usuário";

    const emailResponse = await resend.emails.send({
      from: "Suporte iParty <suporte@ipartybrasil.com>",
      to: [user.email],
      subject: "Confirme seu cadastro - iParty",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirme seu cadastro - iParty</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.ipartybrasil.com/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png" alt="iParty" style="width: 80px; height: auto;">
            <h1 style="color: #8B5CF6; margin: 20px 0;">Bem-vindo ao iParty!</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Olá, ${firstName}!</h2>
            
            <p style="margin-bottom: 20px;">
              Obrigado por se cadastrar no iParty! Para completar seu cadastro e começar a usar nossa plataforma, clique no botão abaixo para confirmar seu email.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmUrl}" 
                 style="background-color: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Confirmar Email
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Se o botão acima não funcionar, copie e cole o seguinte link em seu navegador:
            </p>
            <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 5px; font-size: 12px;">
              ${confirmUrl}
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
    });

    console.log("=== CONFIRMATION EMAIL SENT SUCCESSFULLY ===");
    console.log("Resend response:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("=== ERROR SENDING CONFIRMATION EMAIL ===");
    console.error("Error details:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send confirmation email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
