import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    
    // Check if bling_tokens table has any token
    const { data, error } = await supabase
      .from("bling_tokens")
      .select("id")
      .limit(1)
      .single();
    
    if (error || !data) {
      return NextResponse.json({ hasToken: false });
    }
    
    return NextResponse.json({ hasToken: true });
  } catch (err) {
    console.error("[Bling Status] Error checking token:", err);
    return NextResponse.json({ hasToken: false });
  }
}
