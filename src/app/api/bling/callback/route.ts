import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// GET /api/bling/callback?code=...&state=...
// Handles Bling V3 OAuth callback, exchanges code for tokens
// ============================================================

type BlingTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors from Bling
  if (error) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent("Authorization code not provided")}`, request.url)
    );
  }

  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent("Bling credentials not configured")}`, request.url)
    );
  }

  try {
    // Exchange authorization code for access token
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => null);
      const errorMessage = errorData?.error_description || 
                           errorData?.error || 
                           `Token exchange failed: ${tokenResponse.status}`;
      
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

    const tokenData: BlingTokenResponse = await tokenResponse.json();

    // Calculate expiration timestamp
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Store tokens in Supabase
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qb = supabase.from("bling_tokens") as any;
    const { error: dbError } = await qb.upsert({
      id: 1, // Single organization token
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (dbError) {
      console.error("Failed to store Bling tokens:", dbError);
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent("Failed to save tokens")}`, request.url)
      );
    }

    // Success! Redirect to integrations page
    return NextResponse.redirect(new URL(`/integrations?success=true`, request.url));

  } catch (err) {
    console.error("Bling OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
