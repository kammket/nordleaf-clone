export const prerender = false;

import type { APIRoute } from 'astro';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface OrderPayload {
  orderId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  method: 'bank' | 'btc';
  total: number;
  items: OrderItem[];
}

function fmt(n: number): string {
  return `€${n.toFixed(2).replace('.', ',')}`;
}

async function sendEmail(apiKey: string, from: string, to: string[], subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Resend API ${res.status}: ${body}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Fetch error: ${err?.message || String(err)}` };
  }
}

function buildOrderEmailHtml(order: OrderPayload): string {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e8ede9;font-size:14px;color:#333;">${item.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8ede9;font-size:14px;color:#666;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e8ede9;font-size:14px;color:#1a472a;font-weight:600;text-align:right;">${fmt(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * 0.19;

  const paymentSection =
    order.method === 'bank'
      ? `
      <div style="background:#f8faf9;border:1px solid #e8ede9;border-radius:8px;padding:20px;margin-top:20px;">
        <h3 style="margin:0 0 12px;color:#1a472a;font-size:16px;">Zahlungsanweisungen</h3>
        <p style="margin:0 0 16px;font-size:13px;color:#666;">Wir werden dir in Kürze eine separate E-Mail mit den Bankdaten und genauen Zahlungsanweisungen zusenden.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="background:#e8f5e9;"><td style="padding:8px 6px;font-size:13px;color:#1a472a;font-weight:600;border-radius:4px 0 0 4px;">Bestellnummer</td><td style="padding:8px 6px;font-size:14px;font-weight:700;color:#1a472a;border-radius:0 4px 4px 0;">${order.orderId}</td></tr>
          <tr style="background:#e8f5e9;"><td style="padding:8px 6px;font-size:13px;color:#1a472a;font-weight:600;border-radius:4px 0 0 4px;">Betrag</td><td style="padding:8px 6px;font-size:14px;font-weight:700;color:#1a472a;border-radius:0 4px 4px 0;">${fmt(order.total)}</td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:13px;color:#1a472a;background:#e8f5e9;border:1px solid #c8e6c9;border-radius:6px;padding:12px;">
          ✅ Sobald du die Zahlung durchgeführt hast, antworte bitte auf diese E-Mail mit deinem Zahlungsbeleg oder deiner Überweisungsbestätigung. Wir bearbeiten und versenden deine Bestellung dann schnellstmöglich.
        </p>
      </div>`
      : `
      <div style="background:#fff8f0;border:1px solid #fde0b0;border-radius:8px;padding:20px;margin-top:20px;">
        <h3 style="margin:0 0 8px;color:#d48806;font-size:16px;">Bitcoin-Zahlung</h3>
        <p style="margin:0;font-size:13px;color:#a0723c;">Bitte überweise den BTC-Betrag an die auf der Bestellseite angezeigte Adresse. Die Bestellung wird nach Bestätigung der Transaktion bearbeitet.</p>
      </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e8ede9;">
      <!-- Header -->
      <div style="background:#1a472a;padding:24px 28px;text-align:center;">
        <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">Grunapotheke</h1>
      </div>

      <div style="padding:28px;">
        <!-- Order confirmed -->
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;background:#e8f5e9;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
            <span style="font-size:24px;">✓</span>
          </div>
          <h2 style="margin:0 0 4px;color:#1a472a;font-size:18px;">Bestellung bestätigt!</h2>
          <p style="margin:0;font-size:14px;color:#666;">Bestellnummer: <strong style="color:#1a472a;font-family:monospace;">${order.orderId}</strong></p>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom:20px;">
          <p style="margin:0;font-size:14px;color:#333;">
            <strong>${order.firstName} ${order.lastName}</strong><br>
            ${order.street}<br>
            ${order.zip} ${order.city}<br>
            ${order.country === 'DE' ? 'Deutschland' : order.country === 'AT' ? 'Österreich' : 'Schweiz'}
          </p>
        </div>

        <!-- Items -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:#f8faf9;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Produkt</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Menge</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#999;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Preis</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <!-- Totals -->
        <div style="border-top:1px solid #e8ede9;padding-top:12px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;font-size:14px;color:#666;">Zwischensumme</td><td style="padding:4px 0;font-size:14px;color:#333;text-align:right;font-weight:600;">${fmt(subtotal)}</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#666;">Versand</td><td style="padding:4px 0;font-size:14px;color:#333;text-align:right;font-weight:600;">€20,00</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#666;">MwSt. (19%)</td><td style="padding:4px 0;font-size:14px;color:#333;text-align:right;font-weight:600;">${fmt(tax)}</td></tr>
            <tr style="border-top:2px solid #1a472a;"><td style="padding:10px 0 0;font-size:16px;color:#1a472a;font-weight:700;">Gesamt</td><td style="padding:10px 0 0;font-size:18px;color:#1a472a;text-align:right;font-weight:800;">${fmt(order.total)}</td></tr>
          </table>
        </div>

        <!-- Payment Details -->
        ${paymentSection}
      </div>

      <!-- Footer -->
      <div style="background:#f8faf9;padding:20px 28px;border-top:1px solid #e8ede9;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#999;">Bei Fragen kontaktiere uns unter info@grunapotheke.com</p>
        <p style="margin:0;font-size:11px;color:#ccc;">© ${new Date().getFullYear()} Grunapotheke. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildAdminEmailHtml(order: OrderPayload): string {
  const itemList = order.items
    .map((i) => `• ${i.name} × ${i.quantity} = ${fmt(i.price * i.quantity)}`)
    .join('<br>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:white;border-radius:12px;border:1px solid #e8ede9;padding:28px;">
      <h2 style="margin:0 0 16px;color:#1a472a;font-size:18px;">🛒 Neue Bestellung: ${order.orderId}</h2>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Kunde:</strong> ${order.firstName} ${order.lastName}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>E-Mail:</strong> ${order.email}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Telefon:</strong> ${order.phone}</p>
      <p style="margin:0 0 8px;font-size:14px;"><strong>Adresse:</strong> ${order.street}, ${order.zip} ${order.city}</p>
      <p style="margin:0 0 16px;font-size:14px;"><strong>Zahlung:</strong> ${order.method === 'bank' ? 'Banküberweisung' : 'Bitcoin'}</p>
      <div style="background:#f8faf9;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 8px;font-size:13px;color:#666;font-weight:600;">Artikel:</p>
        <p style="margin:0;font-size:14px;color:#333;">${itemList}</p>
      </div>
      <p style="margin:0;font-size:18px;font-weight:800;color:#1a472a;">Gesamt: ${fmt(order.total)}</p>
    </div>
  </div>
</body>
</html>`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Try Cloudflare runtime env first, then Astro env, then process.env
    const runtime = (locals as any)?.runtime;
    const apiKey = runtime?.env?.RESEND_API_KEY || import.meta.env.RESEND_API_KEY || (typeof process !== 'undefined' && process.env?.RESEND_API_KEY);
    
    console.log('ENV check - runtime exists:', !!runtime);
    console.log('ENV check - runtime.env exists:', !!runtime?.env);
    console.log('ENV check - API key found:', !!apiKey);
    console.log('ENV check - API key source:', runtime?.env?.RESEND_API_KEY ? 'runtime' : import.meta.env.RESEND_API_KEY ? 'import.meta' : 'fallback/none');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured', debug: { hasRuntime: !!runtime, hasRuntimeEnv: !!runtime?.env } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const order: OrderPayload = await request.json();

    // Validate required fields
    const required = ['orderId', 'firstName', 'lastName', 'email', 'method', 'total', 'items'] as const;
    for (const field of required) {
      if (!order[field]) {
        return new Response(
          JSON.stringify({ error: `Missing field: ${field}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fromAddress = runtime?.env?.EMAIL_FROM || import.meta.env.EMAIL_FROM || 'Grunapotheke <info@grunapotheke.com>';
    const adminEmail = runtime?.env?.ADMIN_EMAIL || import.meta.env.ADMIN_EMAIL || 'info@grunapotheke.com';

    console.log('Sending email to:', order.email, 'from:', fromAddress);

    // Send customer confirmation email
    const customerResult = await sendEmail(
      apiKey,
      fromAddress,
      [order.email],
      `Bestellbestätigung – ${order.orderId}`,
      buildOrderEmailHtml(order),
    );

    if (!customerResult.success) {
      console.error('Customer email error:', customerResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send confirmation email', detail: customerResult.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send admin notification email
    const adminResult = await sendEmail(
      apiKey,
      fromAddress,
      [adminEmail],
      `Neue Bestellung: ${order.orderId} – ${fmt(order.total)}`,
      buildAdminEmailHtml(order),
    );

    if (!adminResult.success) {
      console.error('Admin email error:', adminResult.error);
    }

    return new Response(
      JSON.stringify({ success: true, orderId: order.orderId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Order API error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: err?.message || String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
