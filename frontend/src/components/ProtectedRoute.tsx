import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-light-400">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/assets/icons/loader.svg"
            alt="Loading"
            className="h-10 w-10 animate-spin text-brand"
          />
          <p className="subtitle-2 text-light-100">Loading Cloudy...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
