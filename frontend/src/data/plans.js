export const plans = [
  {
    key: "monthly",
    label: "Monthly",
    name: "1 Month Membership",
    price: 799,
    cadence: "1 month",
    badge: "Launch pass",
    documents: "20 documents",
    features: ["Premium generator", "Invoice downloads", "Locked content access", "Email support"]
  },
  {
    key: "quarterly",
    label: "Quarterly",
    name: "3 Month Membership",
    price: 1999,
    cadence: "3 months",
    badge: "Growth mode",
    documents: "70 documents",
    features: ["Priority generation", "Referral rewards", "Coupon support", "Renewal alerts"]
  },
  {
    key: "half-yearly",
    label: "Half-Yearly",
    name: "6 Month Membership",
    price: 3499,
    cadence: "6 months",
    badge: "Most Popular",
    popular: true,
    documents: "180 documents",
    features: ["Advanced analytics", "Premium badge", "Fast support", "Best conversion value"]
  },
  {
    key: "yearly",
    label: "Yearly",
    name: "1 Year Membership",
    price: 5999,
    cadence: "12 months",
    badge: "Founder tier",
    documents: "Unlimited standard",
    features: ["Concierge onboarding", "Admin exports", "Unlimited standard docs", "Highest savings"]
  }
];

export const revenueSeries = [
  { name: "Jan", revenue: 120000, members: 210 },
  { name: "Feb", revenue: 155000, members: 260 },
  { name: "Mar", revenue: 188000, members: 310 },
  { name: "Apr", revenue: 241000, members: 405 },
  { name: "May", revenue: 322000, members: 530 },
  { name: "Jun", revenue: 418000, members: 690 }
];
