import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  Crown,
  Download,
  Lock,
  Settings,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Mock data structures from plans
const plans = [
  {
    key: "monthly",
    label: "Monthly",
    name: "Monthly Plan",
    price: 999,
    cadence: "month",
    documents: "Generate up to 10 documents",
    features: ["Razorpay subscription", "Premium badge", "Standard support"]
  },
  {
    key: "half-yearly",
    label: "Half-Yearly",
    name: "Half-Yearly Plan",
    price: 3499,
    cadence: "6 months",
    documents: "Unlimited documents",
    features: ["Razorpay subscription", "Premium badge", "Enhanced support", "Referral rewards"],
    popular: true
  }
];

const revenueSeries = [
  { name: "Jan", revenue: 100000, members: 150 },
  { name: "Feb", revenue: 150000, members: 210 },
  { name: "Mar", revenue: 220000, members: 310 },
  { name: "Apr", revenue: 310000, members: 480 },
  { name: "May", revenue: 418000, members: 690 }
];

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 90, damping: 18 } }
};

function classNames(...items) {
  return items.filter(Boolean).join(" ");
}

/* ==========================================
   DEPRECATED AND ARCHIVED FUTURE FEATURES
   ========================================== */

// DEPRECATED: BentoSection (Services)
export function BentoSection() {
  const cards = [
    ["Razorpay-ready billing", "Subscriptions, coupon verification, auto-renew controls, webhooks, invoices.", CreditCard],
    ["Premium AI generation", "The existing DOCX generator is private and unlocked only for active members.", Lock],
    ["Realtime operations", "Socket.io notifications for renewals, payment events, admin alerts, and generation status.", Bell],
    ["Admin command center", "Plans, users, referrals, coupons, revenue, and churn signals in one animated surface.", ShieldCheck]
  ];

  return (
    <section className="section">
      <motion.div className="section-heading" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <span className="eyebrow">Services</span>
        <h2>Built like a premium SaaS, not a payment page.</h2>
      </motion.div>
      <div className="bento-grid">
        {cards.map(([title, body, Icon], index) => (
          <motion.article
            key={title}
            className={classNames("bento-card", index === 0 && "wide")}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ rotateX: 3, rotateY: -3, y: -8 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08, type: "spring", damping: 18 }}
          >
            <Icon size={26} />
            <h3>{title}</h3>
            <p>{body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

// DEPRECATED: About Section
export function About() {
  return (
    <main className="section about-page">
      <div className="section-heading">
        <span className="eyebrow">About</span>
        <h2>An AI assessment product wrapped in serious subscription infrastructure.</h2>
        <p>
          Assessment Maker Premium turns the existing academic DOCX generator into a member-only SaaS with authentication,
          payments, referrals, invoices, admin controls, and realtime operational feedback.
        </p>
      </div>
      <div className="bento-grid">
        {[
          ["Private AI service", "The Python generator stays isolated behind an internal service token."],
          ["Conversion-first UX", "Pricing, locked previews, trial support, and renewal moments are designed as product flows."],
          ["Operationally ready", "MongoDB, Cloud Run, Firebase Hosting, SendGrid, Razorpay, and Socket.io are accounted for."]
        ].map(([title, body], index) => (
          <motion.article key={title} className={classNames("bento-card", index === 0 && "wide")} whileHover={{ y: -8 }}>
            <h3>{title}</h3>
            <p>{body}</p>
          </motion.article>
        ))}
      </div>
    </main>
  );
}

// DEPRECATED: Pricing/Membership
export function Pricing({ selectedPlan, setSelectedPlan }) {
  const selected = plans.find((plan) => plan.key === selectedPlan) || plans[0];

  return (
    <section className="section pricing-section" id="pricing">
      <motion.div className="section-heading" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <span className="eyebrow">
          <Crown size={16} />
          Membership
        </span>
        <h2>Pricing that feels like an upgrade before checkout.</h2>
      </motion.div>
      <div className="segmented" role="tablist" aria-label="Membership duration">
        {plans.map((plan) => (
          <button key={plan.key} className={selectedPlan === plan.key ? "active" : ""} onClick={() => setSelectedPlan(plan.key)}>
            {plan.label}
          </button>
        ))}
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <motion.article
            key={plan.key}
            className={classNames("pricing-card", selectedPlan === plan.key && "selected", plan.popular && "popular")}
            onClick={() => setSelectedPlan(plan.key)}
            whileHover={{ y: -12, scale: 1.015 }}
            transition={{ type: "spring", damping: 18 }}
          >
            <div className="plan-badge">{plan.badge || "Standard"}</div>
            <h3>{plan.name}</h3>
            <p>{plan.documents}</p>
            <div className="price">
              <span>INR</span>
              {plan.price.toLocaleString("en-IN")}
            </div>
            <small>Every {plan.cadence}</small>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} />
                  {feature}
                </li>
              ))}
            </ul>
            <button className="magnetic-button full-width">
              {selectedPlan === plan.key ? "Selected" : "Choose plan"}
              <ArrowRight size={17} />
            </button>
          </motion.article>
        ))}
      </div>
      <motion.div className="comparison-table" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <div className="comparison-row head">
          <span>Feature</span>
          <span>{selected.name}</span>
          <span>Status</span>
        </div>
        {["Razorpay subscription", "Premium badge", "Expiry countdown", "Invoice downloads", "Referral rewards"].map((feature, index) => (
          <motion.div className="comparison-row" key={feature} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
            <span>{feature}</span>
            <span>{index < 2 ? "Included" : selected.key === "monthly" ? "Standard" : "Enhanced"}</span>
            <BadgeCheck size={18} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// FUTURE FEATURE: SubscriptionManagement
export function SubscriptionManagement() {
  return (
    <main className="section subscription-page">
      <div className="section-heading">
        <span className="eyebrow">
          <CreditCard size={16} />
          Subscription
        </span>
        <h2>Manage the whole membership lifecycle.</h2>
      </div>
      <div className="dashboard-grid">
        <article className="panel">
          <h3>Current plan</h3>
          <p>Half-Yearly Membership</p>
          <div className="price">
            <span>INR</span>
            3,499
          </div>
          <button className="magnetic-button full-width">Change plan</button>
        </article>
        <article className="panel">
          <h3>Auto-renewal</h3>
          <p>Renewal is active and will use the saved Razorpay mandate.</p>
          <div className="toggle-row">
            <span>Enabled</span>
            <button className="switch on" aria-label="Auto renew enabled">
              <span />
            </button>
          </div>
        </article>
        <article className="panel">
          <h3>Invoices</h3>
          <button className="text-button">
            <Download size={16} />
            INV-2026-0517
          </button>
          <button className="text-button">
            <Download size={16} />
            INV-2026-0417
          </button>
        </article>
        <article className="panel">
          <h3>Coupon</h3>
          <input placeholder="Enter discount code" />
          <button className="magnetic-button full-width">Apply coupon</button>
        </article>
      </div>
    </main>
  );
}

// DEPRECATED: SettingsProfile
export function SettingsProfile() {
  return (
    <main className="section settings-page">
      <div className="section-heading">
        <span className="eyebrow">
          <Settings size={16} />
          Settings
        </span>
        <h2>Profile, security, and notification controls.</h2>
      </div>
      <form className="contact-form">
        <input placeholder="Full name" defaultValue="Premium Member" />
        <input placeholder="Email" defaultValue="member@example.com" />
        <input placeholder="Referral code" defaultValue="AM-PREMIUM-42" />
        <label className="toggle-row">
          Renewal email notifications
          <button className="switch on" aria-label="Renewal email notifications enabled">
            <span />
          </button>
        </label>
        <button className="magnetic-button">Save settings</button>
      </form>
    </main>
  );
}

// DEPRECATED: AnalyticsPage
export function AnalyticsPage() {
  return (
    <main className="admin-page">
      <div className="section-heading left">
        <span className="eyebrow">
          <BarChart3 size={16} />
          Analytics
        </span>
        <h2>Revenue, membership, and generation intelligence.</h2>
      </div>
      <article className="panel chart-panel">
        <ResponsiveContainer width="100%" height={340}>
          <AreaChart data={revenueSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" />
            <XAxis dataKey="name" stroke="currentColor" />
            <YAxis stroke="currentColor" />
            <Tooltip contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12 }} />
            <Area type="monotone" dataKey="revenue" stroke="#37e7ff" fill="#37e7ff33" strokeWidth={3} />
            <Area type="monotone" dataKey="members" stroke="#b9ff3d" fill="#b9ff3d22" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </article>
    </main>
  );
}

// DEPRECATED: Admin Panel
export function Admin() {
  return (
    <main className="admin-page">
      <div className="section-heading left">
        <span className="eyebrow">
          <ShieldCheck size={16} />
          Admin
        </span>
        <h2>Subscription command center.</h2>
      </div>
      <div className="metric-grid">
        {[
          ["Revenue", "INR 4.18L", Activity],
          ["Active users", "690", Users],
          ["Conversion", "38.4%", Sparkles],
          ["Churn risk", "3.8%", Bell]
        ].map(([label, value, Icon]) => (
          <motion.article className="metric-card" key={label} whileHover={{ y: -6 }}>
            <Icon size={22} />
            <span>{label}</span>
            <strong>{value}</strong>
          </motion.article>
        ))}
      </div>
      <article className="panel chart-panel">
        <h3>Subscription analytics</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" />
            <XAxis dataKey="name" stroke="currentColor" />
            <YAxis stroke="currentColor" />
            <Tooltip contentStyle={{ background: "#0b1020", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12 }} />
            <Area type="monotone" dataKey="revenue" stroke="#b9ff3d" fill="#b9ff3d33" strokeWidth={3} />
            <Area type="monotone" dataKey="members" stroke="#37e7ff" fill="#37e7ff22" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </article>
    </main>
  );
}

// DEPRECATED: Contact page
export function Contact() {
  return (
    <main className="section contact-page">
      <div className="section-heading">
        <span className="eyebrow">Contact</span>
        <h2>Premium support for teams that move fast.</h2>
        <p>Send billing, admin, or onboarding requests to the operator console.</p>
      </div>
      <form className="contact-form">
        <input placeholder="Name" />
        <input placeholder="Email" />
        <textarea placeholder="What should the team help with?" />
        <button className="magnetic-button">
          Send message
          <ArrowRight size={17} />
        </button>
      </form>
    </main>
  );
}
