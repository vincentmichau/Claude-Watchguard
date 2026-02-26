import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Moon, LogOut, FileText, Calendar, Settings, Users, 
  Building2, MessageSquare, Bell, Menu, X 
} from 'lucide-react';
import { useState } from 'react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Rapports', href: '/dashboard/reports', icon: FileText, roles: ['admin', 'manager', 'night_watch'] },
    { name: 'Planning', href: '/dashboard/schedule', icon: Calendar, roles: ['admin', 'manager', 'night_watch'] },
    { name: 'Chat', href: '/dashboard/chat', icon: MessageSquare, roles: ['admin', 'manager', 'night_watch'] },
    { name: 'Utilisateurs', href: '/dashboard/users', icon: Users, roles: ['admin'] },
    { name: 'Sites & Clients', href: '/dashboard/sites', icon: Building2, roles: ['admin', 'manager'] },
    { name: 'Paramètres', href: '/dashboard/settings', icon: Settings, roles: ['admin', 'manager'] },
  ];

  const filteredNav = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-dark-900 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-dark-700">
            <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Night Watch</h1>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden ml-auto text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-600 text-white' 
                      : 'text-gray-300 hover:bg-dark-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-dark-700">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:bg-dark-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex items-center gap-4 hidden">
              <h2 className="text-xl font-semibold text-gray-900">
                {filteredNav.find(item => location.pathname.startsWith(item.href))?.name || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
