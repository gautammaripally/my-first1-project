import { useNavigate } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthContext';
import { 
  GraduationCap, 
  Home, 
  FileText, 
  Megaphone, 
  Users, 
  User,
  LogOut
} from 'lucide-react';

export default function Navigation() {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut(); 
    navigate('/'); // Redirect to home
  };


  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/notes', label: 'Notes', icon: FileText },
    { path: '/updates', label: 'Updates', icon: Megaphone },
    { path: '/people', label: 'People', icon: Users },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-card border-b border-border shadow-card-custom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Campus Notes Hub</span>
            </Link>
            
            <div className="hidden md:flex space-x-1">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path}>
                  <Button
                    variant={isActive(path) ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}