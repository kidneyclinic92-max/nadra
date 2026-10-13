export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    azure: Boolean(process.env.WEBSITE_SITE_NAME),
  });
}
