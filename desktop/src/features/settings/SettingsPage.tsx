import { Check, Coins, User, Palette, Calendar, Target, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { CURRENCIES, useCurrency } from "../../context/CurrencyContext";
import { useSavingsGoal } from "../../context/SavingsGoalContext";
import { migrateLocalToCloud } from "./migrationService";

const SettingsPage = () => {
  const { currency, setCurrency } = useCurrency();
  const { savingsGoalPercent, setSavingsGoalPercent } = useSavingsGoal();

  return (
    <div className="flex flex-col gap-6">
      {/* Savings Goal Section */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Target size={18} className="text-income" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Savings Goal
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Percentage of income to save each period
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-text-primary">
              Target Percentage
            </span>
            <span className="px-3 py-1 bg-primary text-white rounded-lg font-black text-lg">
              {savingsGoalPercent}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={savingsGoalPercent}
            onChange={(e) => setSavingsGoalPercent(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mb-4"
          />

          <p className="text-xs text-text-secondary leading-relaxed">
            Saving{" "}
            <span className="font-bold text-text-primary">
              {savingsGoalPercent}%
            </span>{" "}
            of your income builds long-term financial security. Expert advice
            usually recommends at least 20%.
          </p>
        </div>
      </section>

      {/* Currency */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Coins size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Currency
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Choose the currency used across the entire app
            </p>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CURRENCIES.map((c) => {
            const isSelected = c.code === currency.code;
            return (
              <button
                key={c.code}
                onClick={() => setCurrency(c)}
                className={`relative flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-primary bg-blue-50 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-gray-50"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                    <Check size={10} className="text-white" />
                  </span>
                )}
                <span className="text-xl sm:text-2xl font-bold text-text-primary">
                  {c.symbol}
                </span>
                <span className="text-xs font-semibold text-text-secondary">
                  {c.code}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-gray-50/60 border-t border-border">
          <p className="text-xs text-text-secondary">
            Currently using{" "}
            <span className="font-semibold text-text-primary">
              {currency.code} ({currency.symbol})
            </span>
            . Changes apply immediately across all views.
          </p>
        </div>
      </section>

      <section>
        <div className="p-6 bg-white rounded-2xl border border-border shadow-sm mt-4">
          <h3 className="text-lg font-bold mb-2">Cloud Migration</h3>
          <p className="text-text-secondary mb-4 text-sm">
            Found old data on this device? Move it to your cloud account to see
            it on your mobile phone.
          </p>
          <button
            onClick={migrateLocalToCloud}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sync Local Data to Cloud
          </button>
        </div>
      </section>

      {/* Display Name */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden opacity-60">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <User size={18} className="text-text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Display Name
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">Coming soon</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
            Soon
          </span>
        </div>
      </section>

      {/* Theme */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden opacity-60">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Palette size={18} className="text-text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Theme
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Light / Dark mode — Coming soon
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
            Soon
          </span>
        </div>
      </section>

      {/*  Date Format */}
      <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden opacity-60">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Calendar size={18} className="text-text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-text-primary text-sm sm:text-base">
              Date Format
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              DD/MM/YYYY · MM/DD/YYYY — Coming soon
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
            Soon
          </span>
        </div>
      </section>

      {/* Sign Out */}
      <section className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <LogOut size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-sm sm:text-base">
                  Sign Out
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Sign out of your MoneyFlow account
                </p>
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
