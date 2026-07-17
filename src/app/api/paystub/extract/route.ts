import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Fields we ask Claude to extract. Every field is nullable — if Claude
// can't find a value on the paystub PDF, it must return null so the UI
// can flag it for the user to enter by hand.
const EXTRACT_FIELDS = [
  "pay_date",
  "period_start",
  "period_end",
  "employer",
  "regular_pay",
  "bonus",
  "hours",
  "medical",
  "dental",
  "vision",
  "hsa",
  "fsa",
  "retirement_pretax",
  "other_pretax",
  "federal_withheld",
  "state_withheld",
  "social_security",
  "medicare",
  "retirement_aftertax",
  "other_aftertax",
] as const;

type FieldKey = (typeof EXTRACT_FIELDS)[number];

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB — paystubs are tiny

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "Server missing ANTHROPIC_API_KEY" }, 500);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return json({ error: "No file uploaded (field 'file' required)" }, 400);
  if (file.type !== "application/pdf") return json({ error: "File must be a PDF" }, 400);
  if (file.size > MAX_PDF_BYTES) return json({ error: "PDF must be under 5MB" }, 400);

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const anthropic = new Anthropic({ apiKey });

  let toolInput: Record<string, unknown>;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      tools: [
        {
          name: "record_paystub",
          description:
            "Record the extracted values from a paystub PDF. Use null for any field you cannot find on the paystub — do not guess or estimate.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              pay_date: {
                type: ["string", "null"],
                description:
                  "Pay date printed on the paystub, ISO format YYYY-MM-DD. This is the check date, not the period end.",
              },
              period_start: {
                type: ["string", "null"],
                description: "Start of the pay period, ISO format YYYY-MM-DD.",
              },
              period_end: {
                type: ["string", "null"],
                description: "End of the pay period, ISO format YYYY-MM-DD.",
              },
              employer: {
                type: ["string", "null"],
                description: "Employer / company name printed at the top of the paystub.",
              },
              regular_pay: {
                type: ["number", "null"],
                description: "Regular gross earnings for this period (before deductions).",
              },
              bonus: {
                type: ["number", "null"],
                description: "Bonus, commission, or overtime earnings for this period. Return null if not present.",
              },
              hours: {
                type: ["number", "null"],
                description: "Regular hours worked this period.",
              },
              medical: {
                type: ["number", "null"],
                description: "Pre-tax medical / health insurance deduction.",
              },
              dental: {
                type: ["number", "null"],
                description: "Pre-tax dental insurance deduction.",
              },
              vision: {
                type: ["number", "null"],
                description: "Pre-tax vision insurance deduction.",
              },
              hsa: {
                type: ["number", "null"],
                description: "Pre-tax Health Savings Account contribution.",
              },
              fsa: {
                type: ["number", "null"],
                description: "Pre-tax Flexible Spending Account contribution.",
              },
              retirement_pretax: {
                type: ["number", "null"],
                description: "Traditional (pre-tax) 401(k) or 403(b) contribution.",
              },
              other_pretax: {
                type: ["number", "null"],
                description: "Any other pre-tax deduction not covered above (commuter, life insurance, etc.).",
              },
              federal_withheld: {
                type: ["number", "null"],
                description: "Federal income tax withheld this period.",
              },
              state_withheld: {
                type: ["number", "null"],
                description: "State income tax withheld this period.",
              },
              social_security: {
                type: ["number", "null"],
                description: "Social Security (OASDI) tax withheld this period.",
              },
              medicare: {
                type: ["number", "null"],
                description: "Medicare tax withheld this period.",
              },
              retirement_aftertax: {
                type: ["number", "null"],
                description: "Roth 401(k) or other after-tax retirement contribution.",
              },
              other_aftertax: {
                type: ["number", "null"],
                description: "Any other after-tax deduction (garnishments, ESPP, etc.).",
              },
            },
            required: [...EXTRACT_FIELDS],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_paystub" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            },
            {
              type: "text",
              text: "Extract the values from this paystub. Only include values that are explicitly printed on the paystub. Use null for anything not shown or that you're unsure about.",
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return json({ error: "Extraction failed: model did not call the tool" }, 502);
    }
    toolInput = toolUse.input as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction error";
    return json({ error: msg }, 502);
  }

  const fields: Partial<Record<FieldKey, string | number>> = {};
  const missing: FieldKey[] = [];
  for (const key of EXTRACT_FIELDS) {
    const val = toolInput[key];
    if (val === null || val === undefined) {
      missing.push(key);
    } else {
      fields[key] = val as string | number;
    }
  }

  return json({ fields, missing });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
