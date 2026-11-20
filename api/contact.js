const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FORMSUBMIT_ENDPOINT = "https://formsubmit.co/ajax/";
const SITE_ORIGIN = "https://hasnain-portfolio-snowy.vercel.app";
const DEFAULT_TO_EMAIL = "hhnain1006@gmail.com";
const DEFAULT_FROM_EMAIL = "Hasnain Portfolio <onboarding@resend.dev>";
const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:\s@"]+@[^\s@]+\.[^\s@]{2,}$/i;

function jsonResponse(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function cleanSingleLine(value, maxLength) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanMessage(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml({ name, email, topic, subject, message, submittedAt }) {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeTopic = escapeHtml(topic || "General");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const safeTime = escapeHtml(submittedAt);

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#0b0e14;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#eef3fb;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#121722;border:1px solid #242d3d;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:22px 24px;border-bottom:1px solid #242d3d;background:linear-gradient(135deg,#131d29,#141625);">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#61f6d6;">Portfolio Contact · ${safeTopic}</div>
        <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;color:#f7faff;">${safeSubject}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;background:#0d1119;border:1px solid #1f2735;border-radius:12px;">
          <tr>
            <td style="padding:12px 16px;font-size:13px;line-height:1.6;color:#c2cce0;">
              <strong style="color:#ffffff;">From:</strong> ${safeName}<br>
              <strong style="color:#ffffff;">Reply-to:</strong> <a href="mailto:${safeEmail}" style="color:#61f6d6;text-decoration:none;">${safeEmail}</a><br>
              <strong style="color:#ffffff;">Submitted:</strong> ${safeTime}
            </td>
          </tr>
        </table>
        <div style="font-size:14px;line-height:1.7;color:#e6edf8;background:#0d1119;border:1px solid #1f2735;border-radius:12px;padding:16px;">
          ${safeMessage}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET() {
  return jsonResponse({
    ok: true,
    service: "contact",
    configured: Boolean(process.env.RESEND_API_KEY?.trim())
  });
}

export async function POST(request) {
  const startedAt = Date.now();

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 24576) {
      return jsonResponse({ ok: false, error: "Payload is too large." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ ok: false, error: "Invalid request payload." }, 400);
  }

  // Silently accept honeypot bot submissions without hitting the mail provider.
  if (String(body.website ?? "").trim().length > 0) {
    return jsonResponse({ ok: true, id: "filtered", latencyMs: Date.now() - startedAt });
  }

  const name = cleanSingleLine(body.name, 100);
  const email = cleanSingleLine(body.email, 160).toLowerCase();
  const topic = cleanSingleLine(body.topic, 60) || "Collaboration";
  const subject = cleanSingleLine(body.subject, 160);
  const message = cleanMessage(body.message, 4000);

  if (name.length < 2) {
    return jsonResponse({ ok: false, field: "name", error: "Please enter your name (at least 2 characters)." }, 400);
  }
  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse({ ok: false, field: "email", error: "Please enter a valid email address." }, 400);
  }
  if (subject.length < 2) {
    return jsonResponse({ ok: false, field: "subject", error: "Please add a short subject line." }, 400);
  }
  if (message.length < 5) {
    return jsonResponse({ ok: false, field: "message", error: "Please write a message (at least 5 characters)." }, 400);
  }

  const toEmail = cleanSingleLine(process.env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL, 160) || DEFAULT_TO_EMAIL;
  const fromEmail = cleanSingleLine(process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL, 160) || DEFAULT_FROM_EMAIL;
  const submittedAt = new Date().toISOString();

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.VERCEL || process.env.ALLOW_FORMSUBMIT_RELAY) {
      try {
        const relayOrigin = request.headers.get("origin") || SITE_ORIGIN;
        const fsRes = await fetch(FORMSUBMIT_ENDPOINT + encodeURIComponent(toEmail), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Origin: relayOrigin,
            Referer: `${relayOrigin}/`,
            "User-Agent": "Mozilla/5.0 (compatible; HasnainPortfolio/1.0)"
          },
          body: JSON.stringify({
            name,
            email,
            _replyto: email,
            topic,
            _subject: `[Portfolio · ${topic}] ${subject} — ${name}`,
            message,
            _template: "box",
            _captcha: "false"
          }),
          signal: AbortSignal.timeout(4500)
        });
        const fsData = await fsRes.json().catch(() => ({}));
        if (fsRes.ok && (fsData?.success === "true" || fsData?.success === true)) {
          return jsonResponse({
            ok: true,
            id: "formsubmit",
            relay: "formsubmit",
            latencyMs: Date.now() - startedAt
          });
        }
      } catch (err) {
        console.warn("[contact] Server relay unavailable, deferring to client relay", err?.message || err);
      }
    }

    console.error("[contact] Missing RESEND_API_KEY environment variable.");
    return jsonResponse(
      {
        ok: false,
        code: "EMAIL_NOT_CONFIGURED",
        relay: "client",
        toEmail,
        error: "Server key not set; switching to direct browser delivery."
      },
      503
    );
  }

  const textBody = [
    `Portfolio Contact (${topic})`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    `Submitted: ${submittedAt}`,
    "",
    message
  ].join("\n");

  try {
    const upstream = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "hasnain-portfolio/1.0"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `[Portfolio · ${topic}] ${subject} — ${name}`,
        text: textBody,
        html: buildEmailHtml({ name, email, topic, subject, message, submittedAt })
      }),
      signal: AbortSignal.timeout(8000)
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("[contact] Resend API error", upstream.status, data);
      return jsonResponse(
        {
          ok: false,
          code: "UPSTREAM_ERROR",
          error: data?.message || "Could not send message right now. Please try again or email directly."
        },
        502
      );
    }

    return jsonResponse({
      ok: true,
      id: data?.id || null,
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    console.error("[contact] Resend request failed", error);
    return jsonResponse(
      {
        ok: false,
        code: "NETWORK_ERROR",
        error: "Mail request timed out. Please try again or send via your email app."
      },
      504
    );
  }
}
