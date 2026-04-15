import { NextResponse } from "next/server";

// ============================================================
// GET /api/bling/auth
// Initiates Bling V3 OAuth 2.0 authorization flow
// ============================================================

export async function GET(): Promise<NextResponse> {
  const clientId = process.env.BLING_CLIENT_ID;
  const state = process.env.BLING_STATE;

  if (!clientId) {
    return NextResponse.json(
      { error: "BLING_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  if (!state) {
    return NextResponse.json(
      { error: "BLING_STATE not configured" },
      { status: 500 }
    );
  }

  // Bling V3 OAuth authorization endpoint
  const authUrl = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
