export const incomeCategories = [
  "Salary", "Freelance", "Investment", "Business", "Gift", "Other Income",
] as const;

export const expenseCategories = [
  "Food & Dining", "Transport", "Housing & Rent", "Bills & Utilities",
  "Shopping", "Healthcare", "Entertainment", "Education", "Travel",
  "Installments/Loans", "Other Expense",
] as const;

export const SHARED_EXPENSE_CATEGORIES = [
  "Food & Dining", "Transport", "Housing & Rent", "Bills & Utilities",
  "Shopping", "Healthcare", "Entertainment", "Education", "Travel",
  "Groceries", "Insurance", "Subscriptions", "Other",
] as const;

export const SHARED_INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investment", "Business", "Gift", "Refund", "Other Income",
] as const;

export const categoryI18nKeys: Record<string, string> = {
  "Salary": "category.salary",
  "Freelance": "category.freelance",
  "Investment": "category.investment",
  "Business": "category.business",
  "Gift": "category.gift",
  "Other Income": "category.other_income",
  "Refund": "category.refund",
  "Food & Dining": "category.food_dining",
  "Transport": "category.transport",
  "Housing & Rent": "category.housing_rent",
  "Bills & Utilities": "category.bills_utilities",
  "Shopping": "category.shopping",
  "Healthcare": "category.healthcare",
  "Entertainment": "category.entertainment",
  "Education": "category.education",
  "Travel": "category.travel",
  "Installments/Loans": "category.installments_loans",
  "Other Expense": "category.other_expense",
  "Other": "category.other",
  "Groceries": "category.groceries",
  "Insurance": "category.insurance",
  "Subscriptions": "category.subscriptions",
};
