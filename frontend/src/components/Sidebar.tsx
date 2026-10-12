import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navItems, avatarUrl } from '../constants';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <Link to="/" className="flex items-center">
        <img
          src="/mysticc.png"
          alt="Cloudy Logo"
          className="hidden h-auto w-32 lg:block"
        />
        <img
          src="/Mystic (1).png"
          alt="Cloudy Icon"
          className="h-10 w-10 lg:hidden"
        />
      </Link>

      <nav className="sidebar-nav">
        <ul className="flex flex-1 flex-col gap-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link key={item.name} to={item.url} className="lg:w-full">
                <li
                  className={cn(
                    'sidebar-nav-item',
                    isActive && 'shad-active'
                  )}
                >
                  <img
                    src={item.icon}
                    alt={item.name}
                    className={cn(
                      'nav-icon',
                      isActive && 'nav-icon-active'
                    )}
                  />
                  <span className="hidden lg:block">{item.name}</span>
                </li>
              </Link>
            );
          })}
        </ul>
      </nav>

      <img
        src="/assets/images/files-2.png"
        alt="Files illustration"
        className="w-full max-md:hidden transition-transform duration-300 hover:rotate-2 hover:scale-105"
      />

      <div className="sidebar-user-info">
        <img
          src={user?.avatar || avatarUrl}
          alt={user?.fullName || 'User'}
          className="sidebar-user-avatar"
        />
        <div className="hidden lg:block overflow-hidden">
          <p className="subtitle-2 capitalize line-clamp-1">
            {user?.fullName || 'User'}
          </p>
          <p className="caption text-light-200 line-clamp-1">{user?.email}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
