import sgMail from "@sendgrid/mail";
import { env } from "../config/env.js";

if (env.sendgridApiKey) {
  sgMail.setApiKey(env.sendgridApiKey);
}

export async function sendEmail({ to, subject, html, text }) {
  if (!env.sendgridApiKey) {
    console.log("[email:demo]", { to, subject });
    return { demo: true };
  }

  return sgMail.send({
    to,
    from: env.sendgridFromEmail,
    subject,
    text,
    html
  });
}

export function membershipEmail(type, user, data = {}) {
  const templates = {
    welcome: ["Welcome to Assessment Maker Premium", `Your premium workspace is ready, ${user.name}.`],
    renewal: ["Your membership renews soon", `Your ${data.planName || "Premium"} membership renews soon.`],
    expiry: ["Your membership is expiring", "Renew now to keep premium AI generation unlocked."],
    payment_success: ["Payment confirmed", `We received your payment of INR ${data.amountInr || ""}.`],
    payment_failed: ["Payment failed", "Please update your payment method to keep your membership active."],
    cancellation: ["Membership cancelled", "Your auto-renewal has been cancelled."]
  };

  const [subject, message] = templates[type] || templates.welcome;
  return {
    to: user.email,
    subject,
    text: message,
    html: `<div style="font-family:Inter,Arial,sans-serif"><h1>${subject}</h1><p>${message}</p></div>`
  };
}
