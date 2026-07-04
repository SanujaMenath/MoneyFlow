import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Business", "Gift", "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Food & Dining", "Transport", "Housing & Rent", "Bills & Utilities",
  "Shopping", "Healthcare", "Entertainment", "Education", "Travel",
  "Installments/Loans", "Other Expense",
];

interface CategorizeRequest {
  description: string;
  amount: number;
  type: "income" | "expense";
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body: CategorizeRequest = await req.json();

    if (!body.type || !["income", "expense"].includes(body.type)) {
      return new Response("Invalid type", { status: 400 });
    }

    const categories = body.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const categoryList = categories.map((c) => `"${c}"`).join(", ");

    const systemPrompt = `You are a financial categorizer. Given a transaction description, amount, and type, return ONLY a single category from this list: ${categoryList}. Return ONLY the exact category name and nothing else. If unsure, return "Other Income" or "Other Expense" as appropriate.`;

    const userPrompt = `Description: "${body.description || "(no description)"}"
Amount: ${body.amount} cents
Type: ${body.type}
Category:`;

    let result = "";
    let confidence = 0;

    if (OPENROUTER_API_KEY) {
      try {
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
            max_tokens: 50,
            temperature: 0.1,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          result = data.choices?.[0]?.message?.content?.replace(/[."']/g, "").trim() || "";
        }
      } catch (err) {
        console.error("OpenRouter API error:", err);
      }
    }

    if (!result) {
      return new Response(
        JSON.stringify({ category: body.type === "income" ? "Other Income" : "Other Expense", confidence: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    if (categories.includes(result)) {
      confidence = 0.8;
    } else {
      const fuzzy = categories.find(
        (c) =>
          c.toLowerCase() === result.toLowerCase() ||
          c.toLowerCase().includes(result.toLowerCase()) ||
          result.toLowerCase().includes(c.toLowerCase()),
      );
      if (fuzzy) {
        result = fuzzy;
        confidence = 0.7;
      } else {
        result = body.type === "income" ? "Other Income" : "Other Expense";
        confidence = 0;
      }
    }

    return new Response(
      JSON.stringify({ category: result, confidence }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("categorize-transaction error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
