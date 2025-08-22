import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, 
  DocumentTextIcon, 
  UserGroupIcon, 
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  UserGroupIcon as UserGroupIcon2
} from '@heroicons/react/24/outline';
import UConsultingLogo from './UConsultingLogo';
import '../styles/Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Applications', href: '/application-list', icon: DocumentTextIcon },
    { name: 'Review Teams', href: '/review-teams', icon: UserGroupIcon },
    ...(user?.role === 'ADMIN' ? [
      { name: 'Cycle Management', href: '/cycles', icon: ClipboardDocumentListIcon },
      { name: 'Interviews', href: '/interviews', icon: UserGroupIcon2 },
      { name: 'Interview Prep', href: '/interview-prep', icon: ClipboardDocumentListIcon },
      { name: 'Event Management', href: '/events', icon: CalendarDaysIcon },
      { name: 'User Management', href: '/user-management', icon: UserIcon },
    ] : [])
  ];

  const isCurrentPath = (path) => location.pathname === path;

  return (
    <div className="layout-container">
      {/* Top Navigation Bar */}
      <nav className="top-nav">
        <div className="nav-container">
          <div className="nav-content">
            <div className="nav-left">
              {/* Mobile menu button */}
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <XMarkIcon style={{ width: '1.5rem', height: '1.5rem' }} />
                ) : (
                  <Bars3Icon style={{ width: '1.5rem', height: '1.5rem' }} />
                )}
              </button>
              
              {/* Logo and title */}
              <div className="logo-section">
                <UConsultingLogo size="medium" />
                <div className="logo-subtitle">
                  <p>Application Tracking System</p>
                </div>
              </div>
            </div>

            {/* Right side - User info and logout */}
            <div className="nav-right">
              <div className="user-info">
                <p className="user-name">{user?.fullName}</p>
                <p className="user-role">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="logout-btn"
              >
                <ArrowRightOnRectangleIcon className="logout-icon" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="main-layout">
        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            
            
            <nav className="sidebar-nav">
              {navigation.map((item) => {
                const Icon = item.icon;
                const current = isCurrentPath(item.href);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-item ${current ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="nav-icon" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="content-area">
          <main className="main-content">
            <div className="content-container">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout; 