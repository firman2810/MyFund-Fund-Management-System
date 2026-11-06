import React, { useState } from 'react';
import { User, Allocation, Distribution, Transaction } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { FundAllocation } from './components/FundAllocation';
import { FundDistribution } from './components/FundDistribution';
import { TransactionsTable } from './components/TransactionsTable';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { MonitoringReport } from './components/MonitoringReport';
import { LoginScreen } from './components/LoginScreen';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Ledger state
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Modal state for viewing a specific transaction
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleTabChangeWithTransition = (newTab: string) => {
    if (newTab === currentTab) return;
    setCurrentTab(newTab);
  };

  // Throws on failure so LoginScreen can show the error.
  const handleLogin = async (user: User) => {
    const [alcs, dsts, txs] = await Promise.all([
      api.getAllocations(),
      api.getDistributions(),
      api.getTransactions(),
    ]);
    setAllocations(alcs);
    setDistributions(dsts);
    setTransactions(txs);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentUser(user);
      setCurrentTab('dashboard');
      setIsLoggedIn(true);
      setIsTransitioning(false);
    }, 1200);
  };

  const handleLogout = () => {
    api.logout();
    setIsTransitioning(true);
    setTimeout(() => {
      setIsLoggedIn(false);
      setIsTransitioning(false);
    }, 800);
  };

  // Add allocation handler
  const handleAddAllocation = (newAllocation: Allocation, newTx: Transaction) => {
    setAllocations((prev) => [newAllocation, ...prev]);
    setTransactions((prev) => [newTx, ...prev]);
  };

  // Add distribution handler
  const handleAddDistribution = (
    newDistribution: Distribution,
    updatedAllocation: Allocation,
    newTx: Transaction
  ) => {
    setDistributions((prev) => [newDistribution, ...prev]);
    setAllocations((prev) =>
      prev.map((alc) => (alc.id === updatedAllocation.id ? updatedAllocation : alc))
    );
    setTransactions((prev) => [newTx, ...prev]);
  };

  // Loading Screen for system transitions
  if (isTransitioning) {
    return <LoadingScreen />;
  }

  if (!isLoggedIn || !currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  const currentRole = currentUser.role;

  return (
    <div className="min-h-screen bg-page flex flex-col font-sans text-ink antialiased">
      {/* Top Header & Role Navigation */}
      <Header
        currentUser={currentUser}
        currentRole={currentRole}
        currentTab={currentTab}
        onTabChange={handleTabChangeWithTransition}
        onLogout={handleLogout}
      />

      {/* Main Page Body Container with tiny 200ms motion */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-6 pt-8 pb-14">
        <div key={currentTab} className="animate-fade-in">
          {/* TAB 1: Dashboard */}
          {currentTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              currentRole={currentRole}
              allocations={allocations}
              transactions={transactions}
              onNavigateTab={handleTabChangeWithTransition}
              onOpenCreateAllocation={() => handleTabChangeWithTransition('allocations')}
              onOpenRecordDistribution={() => handleTabChangeWithTransition('distribution')}
              onViewTransaction={setSelectedTransaction}
            />
          )}

          {/* TAB 2: Fund Allocation (Ministry) */}
          {currentTab === 'allocations' && (
            <FundAllocation
              currentUser={currentUser}
              allocations={allocations}
              onAddAllocation={handleAddAllocation}
              onViewTransactionDetails={setSelectedTransaction}
            />
          )}

          {/* TAB 3: Fund Distribution (Agency / NGO) */}
          {currentTab === 'distribution' && (
            <FundDistribution
              currentUser={currentUser}
              allocations={allocations}
              distributions={distributions}
              onAddDistribution={handleAddDistribution}
              onViewTransactionDetails={setSelectedTransaction}
            />
          )}

          {/* TAB 4: Transactions History (All roles) */}
          {currentTab === 'transactions' && (
            <TransactionsTable
              currentUser={currentUser}
              currentRole={currentRole}
              transactions={transactions}
              onViewTransaction={setSelectedTransaction}
              onOpenReport={() => handleTabChangeWithTransition('reports')}
            />
          )}

          {/* TAB 5: Monitoring Report (Auditor) */}
          {currentTab === 'reports' && (
            <MonitoringReport
              currentUser={currentUser}
              allocations={allocations}
              distributions={distributions}
              transactions={transactions}
              onViewTransaction={setSelectedTransaction}
            />
          )}
        </div>
      </main>

      {/* Transaction Details Modal (with secondary Blockchain Record section) */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
