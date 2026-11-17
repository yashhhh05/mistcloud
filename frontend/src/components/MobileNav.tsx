import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { navItems, avatarUrl } from '../constants';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';
import FileUploader from './FileUploader';

export const MobileNav: React.FC<{ onUploadSuccess?: () => void }> = ({ onUploadSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <header className="mobile-header flex items-center justify-between p-4 bg-white border-b border-light-300 sm:hidden">
      <Link to="/" className="flex items-center gap-2">
        <img src="/mysticc.png" alt="Cloudy" className="h-8 w-auto" />
      </Link>

      <div className="flex items-center gap-3">
        <FileUploader onUploadSuccess={onUploadSuccess} />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-1 rounded-lg hover:bg-light-300"
        >
          <img src="/assets/icons/menu.svg" alt="menu" className="w-6 h-6" />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative w-4/5 max-w-xs bg-white h-full flex flex-col p-6 shadow-drop-2 z-10 animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-6 border-b border-light-300">
                <img src="/mysticc.png" alt="Cloudy" className="h-7 w-auto" />
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-light-300"
                >
                  <img src="/assets/icons/close-dark.svg" alt="close" className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 py-6">
                <ul className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.name}
                        to={item.url}
                        onClick={() => setIsOpen(false)}
                      >
                        <li
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors',
                            isActive
                              ? 'bg-brand text-white shadow-drop-2'
                              : 'text-light-100 hover:bg-light-400'
                          )}
                        >
                          <img
                            src={item.icon}
                            alt={item.name}
                            className={cn('w-5 h-5', isActive && 'brightness-0 invert')}
                          />
                          <span>{item.name}</span>
                        </li>
                      </Link>
                    );
                  })}
                </ul>
              </nav>

              <div className="pt-4 border-t border-light-300 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={user?.avatar || avatarUrl}
                    alt={user?.fullName || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="overflow-hidden">
                    <p className="subtitle-2 truncate text-light-100">{user?.fullName || 'User'}</p>
                    <p className="caption truncate text-light-200">{user?.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-light-300"
                  title="Sign out"
                >
                  <img src="/assets/icons/logout.svg" alt="logout" className="w-5 h-5 text-red" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};

export default MobileNav;
