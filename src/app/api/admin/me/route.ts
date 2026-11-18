import { getSession } from "@/lib/server/admin-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  return Response.json(
    { session },
    { headers: { "Cache-Control": "no-store" } },
  );
}
