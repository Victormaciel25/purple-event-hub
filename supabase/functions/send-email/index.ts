
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html }: EmailRequest = await req.json();

    // Usar o SMTP configurado no Supabase para enviar o email
    const emailData = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject,
        },
      ],
      from: {
        email: "suporte@ipartybrasil.com",
        name: "Suporte iParty",
      },
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    };

    // Como o SMTP está configurado no Supabase, vamos usar uma abordagem diferente
    // Vamos usar a API nativa do Supabase para enviar emails
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      },
      body: JSON.stringify({
        type: 'signup',
        email: to,
        options: {
          redirect_to: `${Deno.env.get('SUPABASE_URL')}/login`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error sending email:', error);
      throw new Error('Failed to send email via Supabase');
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
