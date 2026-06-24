// Shared client-side helper for the stage/prod environment switcher.
// The choice is stored in localStorage and sent to API routes via the
// x-tm-env header (see app/lib/upstream.js for how the server reads it).
const KEY = "tm_env";

export function getEnv() {
  if (typeof window === "undefined") return "prod";
  return localStorage.getItem(KEY) === "stage" ? "stage" : "prod";
}

export function setEnv(env) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, env === "stage" ? "stage" : "prod");
}

export function envHeader(env) {
  return { "x-tm-env": (env ?? getEnv()) === "stage" ? "stage" : "prod" };
}

// The manual Authorization-token fallback (used when the fixed server
// credential is rejected) must be scoped per environment — otherwise a
// token saved while testing prod silently overrides stage's working
// default credentials too, since the manual override always wins.
const TOKEN_KEY_PREFIX = "tm_collections_token";

export function tokenKey(env) {
  return `${TOKEN_KEY_PREFIX}_${(env ?? getEnv()) === "stage" ? "stage" : "prod"}`;
}

export function getToken(env) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(tokenKey(env)) || "";
}

export function setToken(v, env) {
  if (typeof window === "undefined") return;
  localStorage.setItem(tokenKey(env), v);
}
