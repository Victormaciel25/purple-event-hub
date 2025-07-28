
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  type: string;
  table: string;
  record: any;
  schema: string;
  old_record: any;
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
  };
  email_data: EmailData;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log("Webhook payload received:", payload);

    // Verificar se é um evento de signup
    if (payload.type !== "user.created" && payload.type !== "signup") {
      console.log("Not a signup event, skipping");
      return new Response(JSON.stringify({ message: "Not a signup event" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { user, email_data } = payload;
    
    if (!user || !user.email) {
      console.error("No user or email found in payload");
      return new Response(JSON.stringify({ error: "No user or email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Se o email já foi confirmado, não precisa enviar
    if (user.email_confirmed_at) {
      console.log("Email already confirmed, skipping");
      return new Response(JSON.stringify({ message: "Email already confirmed" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Aguardar 5 segundos antes de enviar o email
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Construir o link de confirmação
    const confirmationLink = email_data 
      ? `${email_data.site_url}/auth/confirm?token_hash=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${encodeURIComponent(email_data.redirect_to || `${email_data.site_url}/login`)}`
      : `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${payload.token_hash}&type=signup&redirect_to=${encodeURIComponent(`${Deno.env.get('SUPABASE_URL')}/login`)}`;

    // Preparar o corpo do email
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://www.ipartybrasil.com/lovable-uploads/b59e9ab5-1380-47bb-b7f4-95ecfc1fe03c.png" alt="iParty" style="width: 80px; height: 80px;">
              <h1 style="color: #6366f1; margin-top: 10px;">iParty</h1>
            </div>
            
            <h2 style="color: #374151;">Confirme seu email</h2>
            
            <p>Olá!</p>
            
            <p>Obrigado por se cadastrar no iParty! Para completar seu cadastro, por favor confirme seu endereço de email clicando no botão abaixo:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationLink}" 
                 style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Confirmar Email
              </a>
            </div>
            
            <p>Se o botão não funcionar, você pode copiar e colar o seguinte link no seu navegador:</p>
            <p style="word-break: break-all; color: #6366f1;">${confirmationLink}</p>
            
            <p>Se você não se cadastrou no iParty, pode ignorar este email.</p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6b7280;">
              Este email foi enviado automaticamente. Por favor, não responda.
            </p>
          </div>
        </body>
      </html>
    `;
    // Enviar email usando o SMTP configurado no Supabase
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        to: user.email,
        subject: 'Confirme seu email - iParty',
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Confirmation email sent successfully to:', user.email);

    return new Response(JSON.stringify({ 
      message: 'Confirmation email sent successfully',
      email: user.email 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
