export const metadata = {
  title: "Newsletter Webhook — Developer Guide · All-Star Training",
};

export default function NewsletterWebhookDocs() {
  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: "2.5rem 1rem", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "#111827", borderRadius: 12, padding: "1.5rem 2rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ width: 36, height: 36, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔗</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>Newsletter Webhook</div>
              <div style={{ color: "#9ca3af", fontSize: "0.78rem" }}>All-Star Training · Developer Integration Guide</div>
            </div>
          </div>
          <p style={{ color: "#d1d5db", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>
            Use this endpoint to automatically subscribe users to the All-Star Training newsletter when they are created in your CRM. Accepts first name, last name, and email. Duplicates are handled gracefully.
          </p>
        </div>

        {/* Endpoint */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem 2rem", marginBottom: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginTop: 0, marginBottom: "1rem" }}>Endpoint</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ background: "#dbeafe", color: "#1d4ed8", fontWeight: 700, fontSize: "0.7rem", padding: "3px 10px", borderRadius: 99 }}>POST</span>
            <code style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 14px", fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>
              https://training-ecru-eight.vercel.app/api/newsletter/webhook
            </code>
          </div>
        </div>

        {/* Authentication */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem 2rem", marginBottom: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginTop: 0, marginBottom: "1rem" }}>Authentication</h2>
          <p style={{ fontSize: "0.85rem", color: "#374151", marginTop: 0 }}>Every request must include the shared API secret. Use either header format:</p>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>Option A — Authorization header (preferred)</div>
            <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#111827", overflowX: "auto", margin: 0 }}>{`Authorization: Bearer YOUR_API_KEY`}</pre>
          </div>

          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>Option B — x-api-key header</div>
            <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#111827", overflowX: "auto", margin: 0 }}>{`x-api-key: YOUR_API_KEY`}</pre>
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "0.75rem 1rem", marginTop: "1rem", fontSize: "0.8rem", color: "#374151" }}>
            <strong style={{ color: "#92400e" }}>⚠ Keep this key secret.</strong> Store it in your CRM&apos;s environment variables or secrets manager — never hardcode it in client-side code. Contact Jason to get the API key value.
          </div>
        </div>

        {/* Request */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem 2rem", marginBottom: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginTop: 0, marginBottom: "1rem" }}>Request Body</h2>
          <p style={{ fontSize: "0.85rem", color: "#374151", marginTop: 0 }}>JSON body with <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3 }}>Content-Type: application/json</code>.</p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", marginBottom: "1rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Field</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Type</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Required</th>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", fontWeight: 600 }}><code>email</code></td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#6b7280" }}>string</td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb" }}><span style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: 700, fontSize: "0.7rem", padding: "1px 7px", borderRadius: 99 }}>Required</span></td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151" }}>Lowercased and trimmed automatically</td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", fontWeight: 600 }}><code>firstName</code></td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#6b7280" }}>string</td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb" }}><span style={{ background: "#f3f4f6", color: "#6b7280", fontWeight: 700, fontSize: "0.7rem", padding: "1px 7px", borderRadius: 99 }}>Optional</span></td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151" }}>Combined with lastName to form the display name</td>
              </tr>
              <tr>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", fontWeight: 600 }}><code>lastName</code></td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#6b7280" }}>string</td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb" }}><span style={{ background: "#f3f4f6", color: "#6b7280", fontWeight: 700, fontSize: "0.7rem", padding: "1px 7px", borderRadius: 99 }}>Optional</span></td>
                <td style={{ padding: "0.5rem 0.75rem", border: "1px solid #e5e7eb", color: "#374151" }}>Combined with firstName to form the display name</td>
              </tr>
            </tbody>
          </table>

          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>Example request body</div>
          <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#111827", overflowX: "auto", margin: 0 }}>{`{
  "email": "jane.smith@example.com",
  "firstName": "Jane",
  "lastName": "Smith"
}`}</pre>
        </div>

        {/* Responses */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem 2rem", marginBottom: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginTop: 0, marginBottom: "1rem" }}>Responses</h2>

          {[
            {
              code: "201", label: "Created", color: "#dcfce7", textColor: "#15803d",
              desc: "New subscriber added.",
              body: `{ "ok": true, "subscriber_id": "uuid", "status": "subscribed" }`,
            },
            {
              code: "200", label: "OK", color: "#dbeafe", textColor: "#1d4ed8",
              desc: "Email was already an active subscriber — no action needed.",
              body: `{ "ok": true, "subscriber_id": "uuid", "status": "already_subscribed" }`,
            },
            {
              code: "200", label: "OK", color: "#dbeafe", textColor: "#1d4ed8",
              desc: "Email existed but was unsubscribed — reactivated.",
              body: `{ "ok": true, "subscriber_id": "uuid", "status": "reactivated" }`,
            },
            {
              code: "400", label: "Bad Request", color: "#fee2e2", textColor: "#b91c1c",
              desc: "Missing required field or malformed JSON.",
              body: `{ "error": "email is required" }`,
            },
            {
              code: "401", label: "Unauthorized", color: "#fee2e2", textColor: "#b91c1c",
              desc: "API key missing or incorrect.",
              body: `{ "error": "Unauthorized" }`,
            },
          ].map((r) => (
            <div key={r.code} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ background: r.color, color: r.textColor, fontWeight: 700, fontSize: "0.7rem", padding: "2px 9px", borderRadius: 99 }}>{r.code} {r.label}</span>
                <span style={{ fontSize: "0.82rem", color: "#374151" }}>{r.desc}</span>
              </div>
              <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.5rem 0.75rem", fontSize: "0.78rem", color: "#111827", margin: 0, overflowX: "auto" }}>{r.body}</pre>
            </div>
          ))}

          <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: 0 }}>
            A <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3 }}>200</code> or <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3 }}>201</code> response always means the subscriber is active. Your CRM can treat both as success.
          </p>
        </div>

        {/* Full example */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem 2rem", marginBottom: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginTop: 0, marginBottom: "1rem" }}>Full Example</h2>

          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>curl</div>
          <pre style={{ background: "#111827", borderRadius: 8, padding: "1rem 1.25rem", fontSize: "0.8rem", color: "#d1d5db", overflowX: "auto", margin: "0 0 1.25rem 0", lineHeight: 1.7 }}>{`curl -X POST https://training-ecru-eight.vercel.app/api/newsletter/webhook \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane.smith@example.com","firstName":"Jane","lastName":"Smith"}'`}</pre>

          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>JavaScript / Node.js</div>
          <pre style={{ background: "#111827", borderRadius: 8, padding: "1rem 1.25rem", fontSize: "0.8rem", color: "#d1d5db", overflowX: "auto", margin: "0 0 1.25rem 0", lineHeight: 1.7 }}>{`await fetch("https://training-ecru-eight.vercel.app/api/newsletter/webhook", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.ALLSTAR_NEWSLETTER_WEBHOOK_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: newUser.email,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
  }),
});`}</pre>

          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "0.35rem" }}>Python</div>
          <pre style={{ background: "#111827", borderRadius: 8, padding: "1rem 1.25rem", fontSize: "0.8rem", color: "#d1d5db", overflowX: "auto", margin: 0, lineHeight: 1.7 }}>{`import requests

requests.post(
    "https://training-ecru-eight.vercel.app/api/newsletter/webhook",
    headers={
        "Authorization": f"Bearer {ALLSTAR_NEWSLETTER_WEBHOOK_KEY}",
        "Content-Type": "application/json",
    },
    json={
        "email": new_user["email"],
        "firstName": new_user["first_name"],
        "lastName": new_user["last_name"],
    },
)`}</pre>
        </div>

        {/* Implementation notes */}
        <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem 2rem", marginBottom: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280", marginTop: 0, marginBottom: "1rem" }}>Implementation Notes for Your CRM</h2>
          <ul style={{ fontSize: "0.85rem", color: "#374151", paddingLeft: "1.25rem", lineHeight: 2, margin: 0 }}>
            <li>Call this endpoint in the <strong>post-create user hook</strong> (or equivalent webhook trigger) in your CRM — fire it once per new user, after the record is confirmed saved.</li>
            <li>The call is safe to make even if the user already exists — the endpoint will return <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3 }}>already_subscribed</code> without creating a duplicate.</li>
            <li>If the call fails (network error, 5xx), log it and retry — the endpoint is idempotent.</li>
            <li>Subscribers added via this endpoint are tagged with source <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 3 }}>crm</code> in the newsletter admin panel, so they&apos;re easy to identify.</li>
            <li>Do not call this endpoint on the client side — it should only be called from your CRM backend where the API key is stored securely.</li>
            <li>No rate limit is currently enforced, but please don&apos;t use this for bulk imports — use the CSV upload in the admin panel for that.</li>
          </ul>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#9ca3af", marginBottom: "2rem" }}>
          All-Star Training · Newsletter Webhook Docs · Questions? Contact jason@allstartalent.us
        </p>

      </div>
    </div>
  );
}
