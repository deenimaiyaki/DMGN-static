/**
 * POST /api/contact — project enquiry endpoint (Cloudflare Pages Function).
 *
 * Accepts JSON (fetch) or urlencoded (no-JS form post) and relays the enquiry
 * by email. Credentials live only in Cloudflare environment variables and are
 * never exposed to the client.
 *
 * Required environment variables (Pages → Settings → Environment variables):
 *   RESEND_API_KEY   Secret. API key for https://resend.com
 *   ENQUIRY_TO       Address that receives enquiries, e.g. contactdmgn@gmail.com
 *   ENQUIRY_FROM     Verified sender on your domain, e.g. website@deenimaiyaki.name.ng
 *
 * Swap `sendEmail` for any transactional provider — the rest is unchanged.
 */

const FIELDS = [
  "name", "company", "email", "phone",
  "projectType", "budget", "description", "timeline", "referral"
];

const REQUIRED = ["name", "email", "projectType", "description"];
const MAX = 4000;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

function clean(raw) {
  const out = {};
  for (const key of FIELDS) {
    const value = raw[key];
    out[key] = typeof value === "string" ? value.trim().slice(0, MAX) : "";
  }
  return out;
}

function validate(data) {
  const errors = [];
  for (const key of REQUIRED) if (!data[key]) errors.push(key);
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("email");
  if (data.description && data.description.length < 20) errors.push("description");
  return errors;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function toHtml(data) {
  const labels = {
    name: "Name", company: "Company", email: "Email", phone: "Phone",
    projectType: "Project type", budget: "Budget range",
    description: "Project description", timeline: "Timeline",
    referral: "How they heard about us"
  };
  const rows = FIELDS.filter((k) => data[k])
    .map(
      (k) =>
        `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#666">${labels[k]}</td>` +
        `<td style="padding:6px 0"><strong>${escapeHtml(data[k]).replace(/\n/g, "<br>")}</strong></td></tr>`
    )
    .join("");
  return `<h2 style="font-family:sans-serif">New project enquiry — DMGN</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${rows}</table>`;
}

async function sendEmail(env, data) {
  // MAIL_ENDPOINT is optional; it exists so the success path can be exercised
  // against a mock in local development. Production leaves it unset.
  const endpoint = env.MAIL_ENDPOINT || "https://api.resend.com/emails";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.ENQUIRY_FROM,
      to: [env.ENQUIRY_TO],
      reply_to: data.email,
      subject: `Project enquiry — ${data.projectType} — ${data.name}`,
      html: toHtml(data)
    })
  });
  if (!res.ok) throw new Error(`Mail provider responded ${res.status}`);
}

export async function onRequestPost({ request, env }) {
  let raw;
  try {
    raw = await readBody(request);
  } catch {
    return json(400, { error: "Malformed request body." });
  }

  // Honeypot: silently accept so bots do not learn they were caught.
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    return json(200, { ok: true });
  }

  const data = clean(raw);
  const errors = validate(data);
  if (errors.length) {
    return json(422, { error: "Some required fields are missing or invalid.", fields: errors });
  }

  if (!env.RESEND_API_KEY || !env.ENQUIRY_TO || !env.ENQUIRY_FROM) {
    console.error("contact: mail environment variables are not configured");
    return json(500, { error: "The enquiry service is not configured yet." });
  }

  try {
    await sendEmail(env, data);
  } catch (err) {
    console.error("contact: send failed", err.message);
    return json(502, { error: "We could not deliver your enquiry. Please email us directly." });
  }

  // A no-JS form post gets a redirect; the fetch path reads the JSON.
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    return Response.redirect(new URL("/contact/thank-you/", request.url).toString(), 303);
  }
  return json(200, { ok: true });
}

export function onRequest() {
  return json(405, { error: "Method not allowed." });
}
