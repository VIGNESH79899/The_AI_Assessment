import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { v4 as uuidv4 } from "uuid";
import { env } from "./env.js";
import { User } from "../models/User.js";

async function findOrCreateOAuthUser({ provider, providerId, email, name, avatarUrl }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      name: name || email.split("@")[0],
      avatarUrl,
      referralCode: uuidv4().slice(0, 8).toUpperCase(),
      oauthProviders: [{ provider, providerId }]
    });
  } else if (!user.oauthProviders.some((item) => item.provider === provider && item.providerId === providerId)) {
    user.oauthProviders.push({ provider, providerId });
    user.lastLoginAt = new Date();
    await user.save();
  }
  return user;
}

export function configurePassport() {
  if (env.googleClientId && env.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.googleClientId,
          clientSecret: env.googleClientSecret,
          callbackURL: `${env.oauthCallbackUrl}/api/auth/google/callback`
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) throw new Error("Google account email is required");
            const user = await findOrCreateOAuthUser({
              provider: "google",
              providerId: profile.id,
              email,
              name: profile.displayName,
              avatarUrl: profile.photos?.[0]?.value
            });
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }

  if (env.githubClientId && env.githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.githubClientId,
          clientSecret: env.githubClientSecret,
          callbackURL: `${env.oauthCallbackUrl}/api/auth/github/callback`,
          scope: ["user:email"]
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.find((item) => item.verified)?.value || profile.emails?.[0]?.value;
            if (!email) throw new Error("GitHub account email is required");
            const user = await findOrCreateOAuthUser({
              provider: "github",
              providerId: profile.id,
              email,
              name: profile.displayName || profile.username,
              avatarUrl: profile.photos?.[0]?.value
            });
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }
}
