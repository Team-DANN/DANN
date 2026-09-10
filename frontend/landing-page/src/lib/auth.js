import { API_BASE_URL } from "./config.js";

/**
 * Kicks off the Google OAuth flow.
 * Redirects the browser to your backend's OAuth entry point, which in turn
 * redirects to Google, then Google redirects back to your backend's
 * callback route (e.g. /api/auth/google/callback). Your backend should
 * handle both "existing user" (login) and "new user" (signup) cases the
 * same way — find or create the account, then redirect the browser to
 * the frontend callback below with a token.
 *
 * Because Google login/signup are the same flow, this one function is
 * shared by both the Login and Signup pages.
 */
export function loginWithGoogle() {
  window.location.href = `${API_BASE_URL}/api/auth/google`;
}

/**
 * Call this once your app has a token (either from a normal email/password
 * login, or from the Google OAuth callback landing on your frontend).
 * Stores the auth flag and routes the user into the dashboard.
 */
export function handleAuthSuccess(token) {
  if (!token) {
    throw new Error("No token returned from server.");
  }
  localStorage.setItem("dann_has_authenticated", "true");
  window.location.href = `/dashboard/auth/callback?token=${encodeURIComponent(token)}`;
}
