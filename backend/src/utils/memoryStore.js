import bcrypt from "bcryptjs";

export const memoryUsers = new Map();

// Helper to construct a fully featured mock user object
export function createMockUser({ id, name, email, password, role = "user" }) {
  const end = new Date();
  end.setMonth(end.getMonth() + 6);
  
  // Set up mock password hash
  const passwordHash = password ? bcrypt.hashSync(password, 10) : "";

  const userObj = {
    _id: id || `mock_user_${Date.now()}`,
    name,
    email,
    passwordHash,
    role,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    referralCode: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    tokenVersion: 0,
    subscription: {
      status: "active",
      planKey: "half-yearly",
      currentPeriodEnd: end,
      autoRenew: true
    },
    comparePassword: function (plainPassword) {
      if (!this.passwordHash) return false;
      return bcrypt.compareSync(plainPassword, this.passwordHash);
    },
    save: async function () {
      return this;
    }
  };

  userObj.id = userObj._id;
  return userObj;
}

// Add the default demo user
const demoUserObj = createMockUser({
  id: "demo-user",
  name: "Demo Premium Member",
  email: "demo@example.com",
  password: "demo-password",
  role: "admin"
});
memoryUsers.set(demoUserObj.email.toLowerCase(), demoUserObj);
memoryUsers.set(demoUserObj._id, demoUserObj);
