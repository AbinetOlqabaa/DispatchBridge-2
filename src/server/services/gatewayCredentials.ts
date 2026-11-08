/**
 * External Gateway & Cloud Messaging Credentials Configuration
 * Configured in accordance with production release requirements.
 */

export interface ExternalGatewayConfig {
  // Twilio / SMS Gateway
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  isSmsConfigured: boolean;

  // WhatsApp Business / Meta Cloud API Gateway
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  isWhatsAppConfigured: boolean;

  // Persistent Database Configuration
  firestoreProjectId?: string;
  firestoreDatabaseId?: string;
  isFirestoreConfigured: boolean;
}

export function getGatewayCredentials(): ExternalGatewayConfig {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
  const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
  const twilioFrom = process.env.TWILIO_FROM_NUMBER || '';

  const waToken = process.env.WHATSAPP_API_TOKEN || '';
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const waAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';

  return {
    twilioAccountSid: twilioSid ? `${twilioSid.slice(0, 6)}••••••••${twilioSid.slice(-4)}` : undefined,
    twilioFromNumber: twilioFrom || undefined,
    isSmsConfigured: Boolean(twilioSid && twilioToken && twilioFrom),

    whatsappPhoneNumberId: waPhoneId ? `${waPhoneId.slice(0, 4)}••••` : undefined,
    whatsappBusinessAccountId: waAccountId ? `${waAccountId.slice(0, 4)}••••` : undefined,
    isWhatsAppConfigured: Boolean(waToken && waPhoneId),

    firestoreProjectId: process.env.FIREBASE_PROJECT_ID || 'molten-cyclist-sc70r',
    firestoreDatabaseId: process.env.FIRESTORE_DATABASE_ID || 'ai-studio-dispatchbridgede-94c180b1-9baf-460b-a29c-ab89fe9c25be',
    isFirestoreConfigured: true,
  };
}

/**
 * Dispatch real or simulated SMS via Twilio API
 */
export async function dispatchExternalSms(
  to: string,
  body: string
): Promise<{ success: boolean; providerMessageId?: string; error?: string; isLive: boolean }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams({ To: to, From: from, Body: body });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Twilio API error HTTP ${response.status}: ${errorText}`, isLive: true };
      }

      const data = (await response.json()) as any;
      return { success: true, providerMessageId: data.sid, isLive: true };
    } catch (err: any) {
      return { success: false, error: err.message, isLive: true };
    }
  }

  // Fallback / Staging mode: securely log receipt in outbox
  console.log(`[SMS GATEWAY DISPATCH] To: ${to} | Body: ${body}`);
  return {
    success: true,
    providerMessageId: `sms_sim_${Date.now()}`,
    isLive: false,
  };
}

/**
 * Dispatch real or simulated WhatsApp alert via Meta Cloud API
 */
export async function dispatchExternalWhatsApp(
  to: string,
  message: string
): Promise<{ success: boolean; providerMessageId?: string; error?: string; isLive: boolean }> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (token && phoneId) {
    try {
      const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
      const cleanPhone = to.replace(/[^0-9]/g, '');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `WhatsApp API error HTTP ${response.status}: ${errorText}`, isLive: true };
      }

      const data = (await response.json()) as any;
      return {
        success: true,
        providerMessageId: data?.messages?.[0]?.id || `wa_${Date.now()}`,
        isLive: true,
      };
    } catch (err: any) {
      return { success: false, error: err.message, isLive: true };
    }
  }

  console.log(`[WHATSAPP GATEWAY DISPATCH] To: ${to} | Message: ${message}`);
  return {
    success: true,
    providerMessageId: `wa_sim_${Date.now()}`,
    isLive: false,
  };
}
