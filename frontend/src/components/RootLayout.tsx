import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import { Toaster } from 'sonner';

export const RootLayout: React.FC = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <MobileNav onUploadSuccess={handleRefresh} />
        <Header onUploadSuccess={handleRefresh} />

        <main className="main-content flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8">
          <Outlet context={{ refreshTrigger, handleRefresh }} />
        </main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
};

export default RootLayout;
