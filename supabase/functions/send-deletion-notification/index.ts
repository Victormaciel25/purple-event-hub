
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeletionNotificationRequest {
  type: 'space' | 'vendor';
  itemName: string;
  userEmail: string;
  userName: string;
  deletionReason: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Send deletion notification function called");
    
    const requestData: DeletionNotificationRequest = await req.json();
    console.log("Deletion notification data received:", requestData);

    const {
      type,
      itemName,
      userEmail,
      userName,
      deletionReason,
    } = requestData;

    // Validate required fields
    if (!type || !itemName || !userEmail || !userName || !deletionReason) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const itemTypeText = type === 'space' ? 'espaço' : 'fornecedor';
    const subject = `Seu ${itemTypeText} foi removido - iParty Brasil`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #dc3545; margin: 0;">Notificação de Remoção - iParty Brasil</h2>
        </div>
        
        <p>Olá ${userName},</p>
        
        <p>Informamos que seu ${itemTypeText} <strong>"${itemName}"</strong> foi removido da plataforma iParty Brasil.</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #856404; margin: 0 0 10px 0;">Motivo da remoção:</h3>
          <p style="margin: 0; color: #856404;">${deletionReason}</p>
        </div>
        
        <p>Se você acredita que houve um engano ou gostaria de esclarecer alguma questão, entre em contato conosco respondendo este email.</p>
        
        <p>Agradecemos pela compreensão.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <div style="text-align: center; color: #666; font-size: 14px;">
          <p><strong>iParty Brasil</strong></p>
          <p>Conectando pessoas aos melhores espaços e fornecedores para eventos</p>
          <p><small>Este é um email automático. Para suporte, responda esta mensagem.</small></p>
        </div>
      </div>
    `;

    console.log(`Sending deletion notification email to ${userEmail}`);

    const emailResponse = await resend.emails.send({
      from: "iParty Brasil <suporte@ipartybrasil.com>",
      to: [userEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Deletion notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending deletion notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
