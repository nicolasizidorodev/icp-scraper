import { prisma } from "@icp/db";

// Serve a landing page gerada como documento HTML autônomo.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const lp = await prisma.landingPage.findUnique({ where: { slug } });

  if (!lp || !lp.html) {
    return new Response("Landing page não encontrada.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(lp.html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
