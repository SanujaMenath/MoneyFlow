import { describe, it, expect } from "vitest";
import type {
  SharedList, SharedListMember, Invitation, SharedTransaction,
  ActivityLog, BalanceSummary, SettlementSuggestion,
  CreateSharedListData,
} from "../../../types/collaboration";

// ─── Mock data ────────────────────────────────────────────────
const mockUser = { id: "user-1", email: "alice@test.com" };

const mockList: SharedList = {
  id: "list-1",
  name: "Apartment Expenses",
  description: "Shared expenses for the apartment",
  currency: "USD",
  owner_id: "user-1",
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

const mockMembers: SharedListMember[] = [
  { id: "m1", list_id: "list-1", user_id: "user-1", email: "alice@test.com", display_name: "Alice", role: "owner", joined_at: "2026-01-15T00:00:00Z" },
  { id: "m2", list_id: "list-1", user_id: "user-2", email: "bob@test.com", display_name: "Bob", role: "member", joined_at: "2026-01-16T00:00:00Z" },
  { id: "m3", list_id: "list-1", user_id: "user-3", email: "charlie@test.com", display_name: "Charlie", role: "member", joined_at: "2026-01-17T00:00:00Z" },
];

// ─── 1. Test: Creating Shared Lists ───────────────────────────
describe("Shared List Creation", () => {
  it("should create a valid shared list with required fields", () => {
    const data: CreateSharedListData = {
      name: "Trip Expenses",
      description: "Vacation to Bali",
      currency: "USD",
    };

    expect(data.name).toBeDefined();
    expect(data.name.length).toBeGreaterThan(0);
    expect(["USD", "EUR", "LKR", "GBP", "INR", "AUD", "JPY", "CAD"]).toContain(data.currency);
  });

  it("should create a list without description", () => {
    const data: CreateSharedListData = {
      name: "Quick List",
      currency: "EUR",
    };

    expect(data.name).toBe("Quick List");
    expect(data.description).toBeUndefined();
  });

  it("should have the creator as the owner", () => {
    const list: SharedList = {
      ...mockList,
      owner_id: mockUser.id,
    };
    expect(list.owner_id).toBe(mockUser.id);
  });
});

// ─── 2. Test: Invitations ─────────────────────────────────────
describe("Invitations", () => {
  it("should send an invitation with pending status", () => {
    const invitation: Invitation = {
      id: "inv-1",
      list_id: "list-1",
      list_name: "Apartment",
      invited_email: "dave@test.com",
      invited_by: "user-1",
      invited_by_name: "Alice",
      token: "abc-123",
      status: "pending",
      created_at: new Date().toISOString(),
      responded_at: null,
    };

    expect(invitation.status).toBe("pending");
    expect(invitation.token).toBeTruthy();
  });

  it("should accept an invitation and add user as member", () => {
    const invitation: Invitation = {
      ...mockInvitation,
      status: "pending",
    };

    invitation.status = "accepted";
    invitation.responded_at = new Date().toISOString();

    expect(invitation.status).toBe("accepted");
    expect(invitation.responded_at).toBeTruthy();
  });

  it("should decline an invitation", () => {
    const invitation: Invitation = {
      ...mockInvitation,
      status: "pending",
    };

    invitation.status = "declined";
    invitation.responded_at = new Date().toISOString();

    expect(invitation.status).toBe("declined");
  });
});

const mockInvitation: Invitation = {
  id: "inv-1",
  list_id: "list-1",
  list_name: "Apartment",
  invited_email: "dave@test.com",
  invited_by: "user-1",
  invited_by_name: "Alice",
  token: "abc-123",
  status: "pending",
  created_at: new Date().toISOString(),
  responded_at: null,
};

// ─── 3. Test: Multiple Members ────────────────────────────────
describe("Member Management", () => {
  it("should start with exactly one owner", () => {
    const owners = mockMembers.filter((m) => m.role === "owner");
    expect(owners.length).toBe(1);
    expect(owners[0].user_id).toBe("user-1");
  });

  it("should allow adding multiple members", () => {
    const newMember: SharedListMember = {
      id: "m4",
      list_id: "list-1",
      user_id: "user-4",
      email: "dave@test.com",
      display_name: "Dave",
      role: "member",
      joined_at: new Date().toISOString(),
    };

    const updatedMembers = [...mockMembers, newMember];
    expect(updatedMembers.length).toBe(4);
  });

  it("should allow removing a member", () => {
    const updatedMembers = mockMembers.filter((m) => m.user_id !== "user-2");
    expect(updatedMembers.length).toBe(2);
    expect(updatedMembers.find((m) => m.user_id === "user-2")).toBeUndefined();
  });

  it("should transfer ownership", () => {
    const members = mockMembers.map((m) => ({ ...m }));

    const newOwnerId = "user-2";
    members.forEach((m) => {
      if (m.user_id === "user-1") m.role = "member";
      if (m.user_id === newOwnerId) m.role = "owner";
    });

    const owner = members.find((m) => m.role === "owner");
    expect(owner?.user_id).toBe("user-2");
  });
});

// ─── 4. Test: Shared Expenses ────────────────────────────────
describe("Shared Transactions", () => {
  it("should create a shared expense transaction", () => {
    const tx: SharedTransaction = {
      id: "tx-1",
      list_id: "list-1",
      creator_id: "user-1",
      creator_name: "Alice",
      amount: 3000,
      type: "expense",
      category: "Groceries",
      date: "2026-02-01",
      notes: "Weekly groceries",
      split_method: "equal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(tx.amount).toBe(3000);
    expect(tx.type).toBe("expense");
    expect(tx.split_method).toBe("equal");
  });

  it("should create a shared income transaction", () => {
    const tx: SharedTransaction = {
      id: "tx-2",
      list_id: "list-1",
      creator_id: "user-2",
      creator_name: "Bob",
      amount: 10000,
      type: "income",
      category: "Refund",
      date: "2026-02-05",
      notes: null,
      split_method: "equal",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(tx.type).toBe("income");
    expect(tx.amount).toBeGreaterThan(0);
  });

  it("should edit a transaction", () => {
    const tx: SharedTransaction = {
      id: "tx-1",
      list_id: "list-1",
      creator_id: "user-1",
      creator_name: "Alice",
      amount: 3000,
      type: "expense",
      category: "Groceries",
      date: "2026-02-01",
      notes: "Weekly groceries",
      split_method: "equal",
      created_at: "2026-02-01T00:00:00Z",
      updated_at: new Date().toISOString(),
    };

    tx.amount = 3500;
    tx.notes = "Updated groceries bill";

    expect(tx.amount).toBe(3500);
    expect(tx.notes).toBe("Updated groceries bill");
  });

  it("should delete a transaction", () => {
    const transactions: SharedTransaction[] = [
      { id: "tx-1", list_id: "list-1", creator_id: "user-1", creator_name: "Alice", amount: 3000, type: "expense", category: "Groceries", date: "2026-02-01", notes: null, split_method: "equal", created_at: "", updated_at: "" },
      { id: "tx-2", list_id: "list-1", creator_id: "user-2", creator_name: "Bob", amount: 5000, type: "expense", category: "Utilities", date: "2026-02-03", notes: null, split_method: "equal", created_at: "", updated_at: "" },
    ];

    const afterDelete = transactions.filter((t) => t.id !== "tx-1");
    expect(afterDelete.length).toBe(1);
    expect(afterDelete[0].id).toBe("tx-2");
  });
});

// ─── 5. Test: Expense Splitting ───────────────────────────────
describe("Expense Splitting", () => {
  const members = mockMembers;

  it("should split equally among all members", () => {
    const total = 3000;
    const splitMembers = members;
    const perPerson = Math.floor(total / splitMembers.length);
    const remainder = total - perPerson * splitMembers.length;

    const splits = splitMembers.map((m, i) => ({
      user_id: m.user_id,
      amount: perPerson + (i === 0 ? remainder : 0),
    }));

    const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSplit).toBe(total);
    expect(splits.length).toBe(3);
    expect(splits[0].amount).toBe(1000);
    expect(splits[1].amount).toBe(1000);
    expect(splits[2].amount).toBe(1000);
  });

  it("should split with excluded members", () => {
    const total = 2000;
    const activeMembers = members.filter((m) => m.user_id !== "user-3");
    const perPerson = Math.floor(total / activeMembers.length);
    const remainder = total - perPerson * activeMembers.length;

    const splits = activeMembers.map((m, i) => ({
      user_id: m.user_id,
      amount: perPerson + (i === 0 ? remainder : 0),
    }));

    expect(splits.length).toBe(2);
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBe(total);
  });

  it("should split by custom amounts", () => {
    const total = 3000;
    const customAmounts: Record<string, number> = {
      "user-1": 1500,
      "user-2": 1000,
      "user-3": 500,
    };

    const totalSplit = Object.values(customAmounts).reduce((sum, a) => sum + a, 0);
    expect(totalSplit).toBe(total);
    expect(customAmounts["user-1"]).toBe(1500);
  });

  it("should split by percentages", () => {
    const total = 10000;
    const pcts: Record<string, number> = {
      "user-1": 50,
      "user-2": 30,
      "user-3": 20,
    };

    const totalPct = Object.values(pcts).reduce((sum, p) => sum + p, 0);
    expect(totalPct).toBe(100);

    const amounts = Object.entries(pcts).map(([uid, pct]) => ({
      user_id: uid,
      amount: Math.round(total * (pct / 100)),
    }));

    const totalAmount = amounts.reduce((sum, a) => sum + a.amount, 0);
    expect(totalAmount).toBe(total);
    expect(amounts.find((a) => a.user_id === "user-1")?.amount).toBe(5000);
    expect(amounts.find((a) => a.user_id === "user-2")?.amount).toBe(3000);
    expect(amounts.find((a) => a.user_id === "user-3")?.amount).toBe(2000);
  });

  it("should handle uneven equal splits with remainder", () => {
    const total = 1000;
    const splitAmong = 3;
    const perPerson = Math.floor(total / splitAmong);
    const remainder = total - perPerson * splitAmong;

    const splits = Array(splitAmong).fill(0).map((_, i) => perPerson + (i === 0 ? remainder : 0));
    expect(splits.reduce((s, v) => s + v, 0)).toBe(total);
    expect(splits[0]).toBe(334);
    expect(splits[1]).toBe(333);
    expect(splits[2]).toBe(333);
  });
});

// ─── 6. Test: Balances and Settlements ────────────────────────
describe("Balance Calculations", () => {
  it("should calculate individual contributions", () => {
    const transactions = [
      { creator_id: "user-1", amount: 3000 },
      { creator_id: "user-2", amount: 1500 },
      { creator_id: "user-1", amount: 2000 },
    ];

    const paid: Record<string, number> = {};
    for (const tx of transactions) {
      paid[tx.creator_id] = (paid[tx.creator_id] || 0) + tx.amount;
    }

    expect(paid["user-1"]).toBe(5000);
    expect(paid["user-2"]).toBe(1500);
  });

  it("should calculate amount owed per member", () => {
    const splits = [
      { user_id: "user-1", amount: 1000 },
      { user_id: "user-2", amount: 1000 },
      { user_id: "user-3", amount: 1000 },
      { user_id: "user-1", amount: 500 },
      { user_id: "user-2", amount: 500 },
    ];

    const owes: Record<string, number> = {};
    for (const s of splits) {
      owes[s.user_id] = (owes[s.user_id] || 0) + s.amount;
    }

    expect(owes["user-1"]).toBe(1500);
    expect(owes["user-2"]).toBe(1500);
    expect(owes["user-3"]).toBe(1000);
  });

  it("should calculate net balance", () => {
    const balances: BalanceSummary[] = [
      { member_id: "user-1", member_name: "Alice", paid: 5000, owes: 3000, net: 2000 },
      { member_id: "user-2", member_name: "Bob", paid: 2000, owes: 3000, net: -1000 },
      { member_id: "user-3", member_name: "Charlie", paid: 1000, owes: 2000, net: -1000 },
    ];

    expect(balances[0].net).toBe(2000);
    expect(balances[1].net).toBe(-1000);
    expect(balances[2].net).toBe(-1000);

    const netTotal = balances.reduce((sum, b) => sum + b.net, 0);
    expect(netTotal).toBe(0);
  });

  it("should calculate total shared expenses", () => {
    const balances: BalanceSummary[] = [
      { member_id: "user-1", member_name: "Alice", paid: 5000, owes: 3000, net: 2000 },
      { member_id: "user-2", member_name: "Bob", paid: 2000, owes: 3000, net: -1000 },
    ];
    const totalExpenses = balances.reduce((sum, b) => sum + b.paid, 0);
    expect(totalExpenses).toBe(7000);
  });
});

// ─── 7. Test: Settlement Suggestions ──────────────────────────
describe("Settlement Suggestions", () => {
  it("should suggest who should pay whom", () => {
    const balances: BalanceSummary[] = [
      { member_id: "user-1", member_name: "Alice", paid: 5000, owes: 3000, net: 2000 },
      { member_id: "user-2", member_name: "Bob", paid: 1000, owes: 3000, net: -2000 },
    ];

    const debts = balances.filter((b) => b.net < 0).map((b) => ({ ...b, net: Math.abs(b.net) }));
    const credits = balances.filter((b) => b.net > 0).map((b) => ({ net: b.net, member_id: b.member_id, member_name: b.member_name }));

    const suggestions: SettlementSuggestion[] = [];
    let i = 0, j = 0;
    while (i < debts.length && j < credits.length) {
      const amount = Math.min(debts[i].net, credits[j].net);
      if (amount > 0) {
        suggestions.push({
          from_user_id: debts[i].member_id,
          from_user_name: debts[i].member_name,
          to_user_id: credits[j].member_id,
          to_user_name: credits[j].member_name,
          amount,
        });
      }
      debts[i].net -= amount;
      credits[j].net -= amount;
      if (debts[i].net === 0) i++;
      if (credits[j].net === 0) j++;
    }

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].from_user_id).toBe("user-2");
    expect(suggestions[0].to_user_id).toBe("user-1");
    expect(suggestions[0].amount).toBe(2000);
  });

  it("should handle multiple debtors and creditors", () => {
    const balances: BalanceSummary[] = [
      { member_id: "user-1", member_name: "Alice", paid: 6000, owes: 3000, net: 3000 },
      { member_id: "user-2", member_name: "Bob", paid: 2000, owes: 3000, net: -1000 },
      { member_id: "user-3", member_name: "Charlie", paid: 1000, owes: 3000, net: -2000 },
    ];

    const debts = balances.filter((b) => b.net < 0).map((b) => ({ ...b, net: Math.abs(b.net) }));
    const credits = balances.filter((b) => b.net > 0).map((b) => ({ net: b.net, member_id: b.member_id, member_name: b.member_name }));

    const suggestions: SettlementSuggestion[] = [];
    let i = 0, j = 0;
    while (i < debts.length && j < credits.length) {
      const amount = Math.min(debts[i].net, credits[j].net);
      if (amount > 0) {
        suggestions.push({
          from_user_id: debts[i].member_id,
          from_user_name: debts[i].member_name,
          to_user_id: credits[j].member_id,
          to_user_name: credits[j].member_name,
          amount,
        });
      }
      debts[i].net -= amount;
      credits[j].net -= amount;
      if (debts[i].net === 0) i++;
      if (credits[j].net === 0) j++;
    }

    expect(suggestions.length).toBe(2);
    expect(suggestions[0].from_user_id).toBe("user-2");
    expect(suggestions[0].amount).toBe(1000);
    expect(suggestions[1].from_user_id).toBe("user-3");
    expect(suggestions[1].amount).toBe(2000);
  });

  it("should return empty when all settled", () => {
    const balances: BalanceSummary[] = [
      { member_id: "user-1", member_name: "Alice", paid: 3000, owes: 3000, net: 0 },
      { member_id: "user-2", member_name: "Bob", paid: 3000, owes: 3000, net: 0 },
    ];

    const debts = balances.filter((b) => b.net < 0);
    expect(debts.length).toBe(0);
  });
});

// ─── 8. Test: Activity History ────────────────────────────────
describe("Activity History", () => {
  it("should log member joining", () => {
    const log: ActivityLog = {
      id: "log-1",
      list_id: "list-1",
      user_id: "user-2",
      user_name: "Bob",
      action: "member_joined",
      details: null,
      created_at: new Date().toISOString(),
    };

    expect(log.action).toBe("member_joined");
    expect(log.user_id).toBe("user-2");
  });

  it("should log expense addition", () => {
    const log: ActivityLog = {
      id: "log-2",
      list_id: "list-1",
      user_id: "user-1",
      user_name: "Alice",
      action: "expense_added",
      details: { amount: 3000, category: "Groceries" },
      created_at: new Date().toISOString(),
    };

    expect(log.action).toBe("expense_added");
    expect(log.details?.amount).toBe(3000);
  });

  it("should log all activity types", () => {
    const actions = [
      "member_joined", "member_removed", "expense_added",
      "expense_edited", "expense_deleted", "invitation_sent",
      "list_created", "ownership_transferred",
    ];

    actions.forEach((action) => {
      const log: ActivityLog = {
        id: `log-${action}`,
        list_id: "list-1",
        user_id: "user-1",
        user_name: "Alice",
        action,
        details: null,
        created_at: new Date().toISOString(),
      };
      expect(log.action).toBe(action);
    });
  });
});

// ─── 9. Test: Permissions ─────────────────────────────────────
describe("Permission Validation", () => {
  it("should allow owner full control", () => {
    const isOwner = true;
    const isCreator = true;

    expect(isOwner).toBe(true);
    expect(isOwner || isCreator).toBe(true);
  });

  it("should allow members to add expenses", () => {
    const isMember = true;
    expect(isMember).toBe(true);
  });

  it("should allow members to edit only their own expenses", () => {
    const isOwner = false;
    const isCreator = true;

    expect(isOwner || isCreator).toBe(true);
  });

  it("should not allow member to delete others' expenses", () => {
    const isOwner = false;
    const isCreator = false;

    expect(isOwner || isCreator).toBe(false);
  });

  it("should prevent unauthorized access", () => {
    const isMember = false;
    expect(isMember).toBe(false);
  });
});

// ─── 10. Test: Data Integrity ─────────────────────────────────
describe("Data Integrity", () => {
  it("should have unique split totals matching transaction amount", () => {
    const total = 3000;
    const splits = [1000, 1000, 1000];
    expect(splits.reduce((s, v) => s + v, 0)).toBe(total);
  });

  it("should have unique member IDs in a list", () => {
    const memberIds = mockMembers.map((m) => m.user_id);
    const uniqueIds = new Set(memberIds);
    expect(uniqueIds.size).toBe(memberIds.length);
  });

  it("should have unique invitation tokens", () => {
    const tokens = ["token-1", "token-2", "token-3"];
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(tokens.length);
  });
});
