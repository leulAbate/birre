import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt, type PageId } from "@/lib/ai/context";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  page: PageId;
  messages: ChatMessage[];
}

const VALID_PAGES: ReadonlySet<PageId> = new Set<PageId>([
  "dashboard",
  "transactions",
  "review",
  "plans",
  "tax",
]);

export async function POST(req: Request) {
  // Require auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as ChatRequest;
  if (!VALID_PAGES.has(body.page)) {
    return new Response("Invalid page", { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("Empty messages", { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("Server missing ANTHROPIC_API_KEY", { status: 500 });
  }

  const systemPrompt = await buildSystemPrompt(body.page);
  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const claudeStream = await anthropic.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1024,
          system: systemPrompt,
          messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
        });

        for await (const event of claudeStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Streaming error";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
