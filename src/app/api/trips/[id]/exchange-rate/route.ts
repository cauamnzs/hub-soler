import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateExchangeRateSchema = z.object({
  final_exchange_rate: z.number().positive("Câmbio deve ser positivo"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateExchangeRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { final_exchange_rate } = parsed.data;

  // Update trip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("trips") as any)
    .update({ final_exchange_rate })
    .eq("id", tripId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // The trigger recalculate_trip_costs will be fired automatically
  return NextResponse.json({ success: true });
}
