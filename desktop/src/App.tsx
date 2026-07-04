import { useState, useEffect, lazy, Suspense } from "react";
import MainLayout from "./layout/MainLayout";
import { supabase } from "./lib/supabase"; 
import { Auth } from "./features/auth/components/Auth";
import { useTransactions } from "./features/transactions/hooks/useTransactions";
import { ErrorBoundary } from "./components/ErrorBoundary";

const DashboardView = lazy(() => import("./features/dashboard/DashboardView"));
const TransactionsPage = lazy(() => import("./features/transactions/TransactionsPage"));
const AddTransactionForm = lazy(() => import("./features/transactions/AddTransactionForm"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage"));
const AnalyticsPage = lazy(() => import("./features/analytics/AnalyticsPage"));
const CollaborationPage = lazy(() => import("./features/collaboration/CollaborationPage"));

function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "Dashboard" | "Transactions" | "Analytics" | "Settings" | "Collaboration" | "Profile"
  >("Dashboard");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAddTransaction = () => setShowAddModal(true);
  const handleCloseModal = () => setShowAddModal(false);
  const tx = useTransactions();

  const handleSaveComplete = () => {
    tx.refresh();
    setShowAddModal(false);
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="min-w-0 w-full animate-in fade-in duration-500">
        <Suspense fallback={<div className="flex items-center justify-center h-48 text-text-secondary text-sm">Loading...</div>}>
          {activeTab === "Dashboard" && (
            <ErrorBoundary>
              <DashboardView transactions={tx.transactions} />
            </ErrorBoundary>
          )}

          {activeTab === "Transactions" && (
            <ErrorBoundary>
              <TransactionsPage
                transactions={tx.transactions}
                remove={tx.remove}
                stopRecurring={tx.stopRecurring} 
                loading={tx.loading}
                page={tx.page}
                totalPages={tx.totalPages}
                total={tx.total}
                onPageChange={tx.goToPage}
                onAddClick={handleAddTransaction}
              />
            </ErrorBoundary>
          )}

          {activeTab === "Analytics" && (
            <ErrorBoundary>
              <AnalyticsPage transactions={tx.transactions} />
            </ErrorBoundary>
          )}

          {activeTab === "Collaboration" && (
            <ErrorBoundary><CollaborationPage /></ErrorBoundary>
          )}

          {activeTab === "Profile" && (
            <ErrorBoundary><ProfilePage /></ErrorBoundary>
          )}

          {activeTab === "Settings" && (
            <ErrorBoundary><SettingsPage /></ErrorBoundary>
          )}
        </Suspense>
      </div>

      {/* Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <Suspense fallback={<div className="p-8 text-center text-text-secondary">Loading form...</div>}>
                <AddTransactionForm
                  onSave={handleSaveComplete}
                  onClose={handleCloseModal}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default App;