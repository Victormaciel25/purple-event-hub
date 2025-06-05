
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  reporterName: string;
  reporterEmail: string;
  reporterPhone?: string;
  reportedItemName: string;
  reportedItemUrl: string;
  reportType: string;
  description: string;
  imageUrls?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const reportData: ReportRequest = await req.json();

    const {
      reporterName,
      reporterEmail,
      reporterPhone,
      reportedItemName,
      reportedItemUrl,
      reportType,
      description,
      imageUrls = [],
    } = reportData;

    // Create HTML content with images
    let imagesHtml = "";
    if (imageUrls.length > 0) {
      imagesHtml = `
        <h3>Imagens anexadas:</h3>
        ${imageUrls.map((url, index) => `
          <p><a href="${url}" target="_blank">Imagem ${index + 1}</a></p>
        `).join("")}
      `;
    }

    const emailHtml = `
      <h2>Nova Denúncia Recebida</h2>
      
      <h3>Informações do Denunciante:</h3>
      <p><strong>Nome:</strong> ${reporterName}</p>
      <p><strong>Email:</strong> ${reporterEmail}</p>
      ${reporterPhone ? `<p><strong>Telefone:</strong> ${reporterPhone}</p>` : ""}
      
      <h3>Item Denunciado:</h3>
      <p><strong>Tipo:</strong> ${reportType}</p>
      <p><strong>Nome:</strong> ${reportedItemName}</p>
      <p><strong>Link:</strong> <a href="${reportedItemUrl}" target="_blank">${reportedItemUrl}</a></p>
      
      <h3>Descrição da Denúncia:</h3>
      <p>${description.replace(/\n/g, '<br>')}</p>
      
      ${imagesHtml}
      
      <hr>
      <p><small>Esta denúncia foi enviada através do sistema iParty Brasil em ${new Date().toLocaleString('pt-BR')}.</small></p>
    `;

    const emailResponse = await resend.emails.send({
      from: "Sistema iParty <noreply@ipartybrasil.com>",
      to: ["suporte@ipartybrasil.com"],
      subject: `Nova Denúncia: ${reportType} - ${reportedItemName}`,
      html: emailHtml,
    });

    console.log("Report email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending report email:", error);
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
