// Shared helpers for proxy routes: picks the upstream base URL (stage/prod)
// from the client-supplied x-tm-env header, and builds auth headers.
//
// IMPORTANT prod behavior discovered by testing directly against
// nal.tmmumbai.in: Authorization (a valid JWT) is REQUIRED on every prod
// request, read or write — x-api-key alone is never sufficient (GET
// without Authorization => "Authorization header missing"). Write
// endpoints additionally require x-api-key on top of a valid JWT (POST
// with JWT alone => generic "unauthorized"; JWT + x-api-key => 200).
// So x-api-key cannot replace a JWT; it can only supplement one.
//
// Default auth per environment:
//   - prod:  x-api-key: TM_API_KEY, PLUS Authorization if a manual JWT
//            fallback is supplied (writes will 401 without one)
//   - stage: Authorization: Bearer TM_STAGE_TOKEN + X-customer-id (stage
//            rejects the bearer token alone with a generic "unauthorized"
//            unless a customer id header is also present)
// A client-supplied x-tm-token header (manual JWT fallback) is merged in
// alongside the environment's other default headers rather than replacing
// them, since prod specifically needs both at once for writes. Kept off
// the Authorization header name on the way in from the client because the
// site's own Basic Auth middleware also guards /api/*.

export const ENV_BASES = {
  prod: "https://nal.tmmumbai.in/DiagnosticsService",
  stage: "https://stage-dev.truemedsapi.in/DiagnosticsService",
};

export function getEnvName(req) {
  return req.headers.get("x-tm-env") === "stage" ? "stage" : "prod";
}

export function getBase(req) {
  return ENV_BASES[getEnvName(req)];
}

export function authHeaders(req) {
  const manual = req.headers.get("x-tm-token") || "";
  const manualAuth = manual ? { Authorization: manual.startsWith("Bearer ") ? manual : `Bearer ${manual}` } : {};

  if (getEnvName(req) === "stage") {
    return {
      Authorization: `Bearer ${process.env.TM_STAGE_TOKEN || ""}`,
      "X-customer-id": process.env.TM_STAGE_CUSTOMER_ID || "51523",
      "Content-Type": "application/json",
      ...manualAuth, // override the fixed stage token if a manual one is supplied
    };
  }

  // prod: x-api-key alone is never enough — writes need a valid JWT too.
  return {
    "x-api-key": process.env.TM_API_KEY || "",
    "Content-Type": "application/json",
    ...manualAuth,
  };
}
