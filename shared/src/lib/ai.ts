export type AIProvider = "openrouter" | "openai" | "ollama" | "huggingface";

export interface CategorizeRequest {
  description: string;
  amount: number;
  type: "income" | "expense";
}

export interface CategorizeResponse {
  category: string;
  confidence: number;
}

export interface InsightRequest {
  totalIncome: number;
  totalExpenses: number;
  topCategory: string;
  topCategoryAmount: number;
  transactionCount: number;
  period: string;
}

export interface InsightResponse {
  summary: string;
  tip: string;
}

function getApiBase(provider: AIProvider): string {
  switch (provider) {
    case "openrouter":
      return "https://openrouter.ai/api/v1";
    case "openai":
      return "https://api.openai.com/v1";
    case "ollama":
      return "http://localhost:11434/api";
    case "huggingface":
      return "https://api-inference.huggingface.co/models";
  }
}

async function callLLM(
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  apiKey?: string,
): Promise<string> {
  const base = getApiBase(provider);

  if (provider === "ollama") {
    const res = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });
    const data = await res.json();
    return data.message?.content || "";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://moneyflow.app";
    headers["X-Title"] = "MoneyFlow";
  }

  const model = provider === "openrouter" ? "mistralai/mistral-7b-instruct" : "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 150,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Business", "Gift", "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Food & Dining", "Transport", "Housing & Rent", "Bills & Utilities",
  "Shopping", "Healthcare", "Entertainment", "Education", "Travel",
  "Installments/Loans", "Other Expense",
];

export async function suggestCategory(
  req: CategorizeRequest,
  provider: AIProvider = "openrouter",
  apiKey?: string,
): Promise<CategorizeResponse> {
  const categories = req.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryList = categories.map((c) => `"${c}"`).join(", ");

  const systemPrompt = `You are a financial categorizer. Given a transaction description, amount, and type, return ONLY a single category from this list: ${categoryList}. Return the category name and nothing else. If unsure, return "Other Income" or "Other Expense" as appropriate.`;

  const userPrompt = `Description: "${req.description || "(no description)"}"
Amount: ${req.amount} cents
Type: ${req.type}
Category:`;

  try {
    const result = await callLLM(provider, systemPrompt, userPrompt, apiKey);
    const cleaned = result.replace(/[."']/g, "").trim();

    if (categories.includes(cleaned)) {
      return { category: cleaned, confidence: 0.8 };
    }

    const fuzzy = categories.find(
      (c) => c.toLowerCase() === cleaned.toLowerCase() || c.toLowerCase().includes(cleaned.toLowerCase()) || cleaned.toLowerCase().includes(c.toLowerCase()),
    );
    if (fuzzy) return { category: fuzzy, confidence: 0.7 };
  } catch {
    // Fall through to default
  }

  return { category: req.type === "income" ? "Other Income" : "Other Expense", confidence: 0 };
}

export async function generateInsights(
  req: InsightRequest,
  provider: AIProvider = "openrouter",
  apiKey?: string,
): Promise<InsightResponse> {
  const systemPrompt = `You are a financial advisor. Given a user's spending summary, provide:
1. A one-sentence summary of their financial situation (max 120 chars)
2. One actionable money tip (max 100 chars)

Return ONLY valid JSON: { "summary": "...", "tip": "..." }`;

  const userPrompt = `Period: ${req.period}
Income: $${(req.totalIncome / 100).toFixed(2)}
Expenses: $${(req.totalExpenses / 100).toFixed(2)}
Top category: ${req.topCategory} ($${(req.topCategoryAmount / 100).toFixed(2)})
Transactions: ${req.transactionCount}`;

  try {
    const result = await callLLM(provider, systemPrompt, userPrompt, apiKey);

    const parsed = JSON.parse(result);
    if (parsed.summary && parsed.tip) {
      return { summary: parsed.summary, tip: parsed.tip };
    }
  } catch {
    // Fall through
  }

  const diff = req.totalIncome - req.totalExpenses;
  if (diff < 0) {
    return {
      summary: `Your expenses of $${(req.totalExpenses / 100).toFixed(2)} exceeded your income this ${req.period}.`,
      tip: `Try reducing ${req.topCategory.toLowerCase()} spending to balance your budget.`,
    };
  }
  return {
    summary: `You saved $${(diff / 100).toFixed(2)} this ${req.period}. Keep up the good work!`,
    tip: `Consider investing your savings to grow your wealth over time.`,
  };
}
