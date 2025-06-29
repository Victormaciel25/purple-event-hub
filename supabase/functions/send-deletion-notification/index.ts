
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
  console.log("=== SEND DELETION NOTIFICATION - INICIO ===");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processando requisição de notificação de exclusão");
    
    // Parse request body
    const requestBody = await req.text();
    console.log("Request body raw:", requestBody);
    
    const requestData: DeletionNotificationRequest = JSON.parse(requestBody);
    console.log("Dados da notificação recebidos:", {
      type: requestData.type,
      itemName: requestData.itemName,
      userEmail: requestData.userEmail,
      userName: requestData.userName,
      hasReason: !!requestData.deletionReason
    });

    const {
      type,
      itemName,
      userEmail,
      userName,
      deletionReason,
    } = requestData;

    // Validate required fields
    if (!type || !itemName || !userEmail || !userName || !deletionReason) {
      console.error("Campos obrigatórios ausentes:", {
        type: !!type,
        itemName: !!itemName,
        userEmail: !!userEmail,
        userName: !!userName,
        deletionReason: !!deletionReason
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("Resend API Key:", resendApiKey ? "Configurada" : "NÃO CONFIGURADA");
    
    if (!resendApiKey) {
      console.error("ERRO CRÍTICO: RESEND_API_KEY não encontrada nas variáveis de ambiente");
      return new Response(
        JSON.stringify({ error: "Email service not configured - RESEND_API_KEY missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Initialize Resend
    const resend = new Resend(resendApiKey);
    console.log("Resend inicializado com sucesso");

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

    console.log(`Enviando email de notificação de exclusão:`);
    console.log(`- Para: ${userEmail}`);
    console.log(`- Assunto: ${subject}`);
    console.log(`- Tipo: ${itemTypeText}`);
    console.log(`- Item: ${itemName}`);

    const emailResponse = await resend.emails.send({
      from: "iParty Brasil <suporte@ipartybrasil.com>",
      to: [userEmail],
      subject: subject,
      html: emailHtml,
    });

    console.log("Resposta do Resend:", emailResponse);

    if (emailResponse.error) {
      console.error("ERRO DO RESEND:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao enviar email",
          details: emailResponse.error 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ EMAIL DE NOTIFICAÇÃO ENVIADO COM SUCESSO!");
    console.log("Email ID:", emailResponse.data?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      message: "Notificação de exclusão enviada com sucesso",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("ERRO CRÍTICO na função de notificação de exclusão:", error);
    console.error("Stack trace:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
