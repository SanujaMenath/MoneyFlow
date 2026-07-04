import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

interface InsightRequest {
  totalIncome: number;
  totalExpenses: number;
  topCategory: string;
  topCategoryAmount: number;
  transactionCount: number;
  period: string;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body: InsightRequest = await req.json();

    let summary = "";
    let tip = "";

    if (OPENROUTER_API_KEY) {
      try {
        const systemPrompt = `You are a financial advisor. Given a user's spending summary, provide:
1. A one-sentence summary of their financial situation (max 120 chars)
2. One actionable money tip (max 100 chars)

Return ONLY valid JSON: { "summary": "...", "tip": "..." }`;

        const userPrompt = `Period: ${body.period}
Income: $${(body.totalIncome / 100).toFixed(2)}
Expenses: $${(body.totalExpenses / 100).toFixed(2)}
Top category: ${body.topCategory} ($${(body.topCategoryAmount / 100).toFixed(2)})
Transactions: ${body.transactionCount}`;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://moneyflow.app",
            "X-Title": "MoneyFlow",
          },
          body: JSON.stringify({
            model: "mistralai/mistral-7b-instruct",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 200,
            temperature: 0.3,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim() || "";
          const parsed = JSON.parse(content);
          if (parsed.summary && parsed.tip) {
            summary = parsed.summary;
            tip = parsed.tip;
          }
        }
      } catch (err) {
        console.error("OpenRouter insight error:", err);
      }
    }

    if (!summary) {
      const diff = body.totalIncome - body.totalExpenses;
      if (diff < 0) {
        summary = `Expenses exceeded income by $${(Math.abs(diff) / 100).toFixed(2)} this ${body.period}.`;
        tip = `Try reducing ${body.topCategory.toLowerCase()} spending.`;
      } else {
        summary = `You saved $${(diff / 100).toFixed(2)} this ${body.period}.`;
        tip = `Consider investing your savings.`;
      }
    }

    return new Response(
      JSON.stringify({ summary, tip }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-insights error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
