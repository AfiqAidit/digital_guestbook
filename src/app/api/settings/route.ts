import { getPublicSettings } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPublicSettings();
  return Response.json(settings, { headers: { "Cache-Control": "no-store" } });
}
