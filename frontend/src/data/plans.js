export const plans = [
  {
    key: "quarterly",
    label: "Quarterly",
    name: "3-Month Premium Plan",
    price: 399,
    cadence: "3 months",
    documents: "Unlimited",
    features: ["Unlimited document generation", "Premium AI generator", "Invoice downloads", "Referral rewards", "Priority generation"]
  },
  {
    key: "half-yearly",
    label: "Half-Yearly",
    name: "6-Month Value Plan",
    price: 799,
    cadence: "6 months",
    popular: true,
    documents: "Unlimited",
    features: ["Unlimited document generation", "Premium AI generator", "Advanced analytics", "Priority support", "Invoice downloads"]
  },
  {
    key: "yearly",
    label: "Yearly",
    name: "1-Year Ultimate Plan",
    price: 1399,
    cadence: "year",
    documents: "Unlimited",
    features: ["Unlimited document generation", "Premium AI generator", "Admin exports", "Concierge onboarding", "Priority support"]
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
