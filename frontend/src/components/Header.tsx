import { Coffee, Plus, User, LogIn, LogOut, Sparkles, Bell, MessageCircle, Search, BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import CreateAppModal from './CreateAppModal';
import { useIsCallerAdmin, useGenerateDemoContent, useGetUserNotifications, useGetUserConversations } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { View } from '../App';

interface HeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
  hasProfile: boolean;
}

export default function Header({ currentView, onNavigate, hasProfile }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: isAdmin } = useIsCallerAdmin();
  const generateDemo = useGenerateDemoContent();
  const { data: notifications = [] } = useGetUserNotifications();
  const { data: conversations = [] } = useGetUserConversations();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const unreadMessageCount = conversations.reduce((sum, conv) => sum + Number(conv.unreadCount), 0);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      onNavigate('welcome');
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleGenerateDemo = async () => {
    try {
      await generateDemo.mutateAsync();
      toast.success('Demo content generated successfully!');
    } catch (error: any) {
      if (error.message?.includes('already been generated')) {
        toast.error('Demo content has already been generated');
      } else if (error.message?.includes('Unauthorized')) {
        toast.error('Only admins can generate demo content');
      } else {
        toast.error('Failed to generate demo content');
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('welcome')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="/assets/canister cafe.jpeg" 
              alt="Canister Cafe" 
              className="h-10 w-10 object-contain rounded" 
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-primary">Canister Cafe</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Share Your Caffeine Creations</p>
            </div>
          </button>

          <nav className="flex items-center gap-2">
            {isAuthenticated && hasProfile && (
              <>
                <Button
                  variant={currentView === 'discover' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('discover')}
                  className="gap-2"
                >
                  <Coffee className="h-4 w-4" />
                  <span className="hidden sm:inline">Discover</span>
                </Button>
                <Button
                  variant={currentView === 'search' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('search')}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
                <Button
                  variant={currentView === 'messages' || currentView === 'chat' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('messages')}
                  className="gap-2 relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Messages</span>
                  {unreadMessageCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={currentView === 'notifications' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('notifications')}
                  className="gap-2 relative"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                  {unreadNotificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </Badge>
                  )}
                </Button>
                {isAdmin && (
                  <Button
                    variant={currentView === 'analytics' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onNavigate('analytics')}
                    className="gap-2"
                    title="Analytics Dashboard (Admin only)"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden md:inline">Analytics</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New App</span>
                </Button>
                <Button
                  variant={currentView === 'profile' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate('profile')}
                  className="gap-2"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDemo}
                    disabled={generateDemo.isPending}
                    className="gap-2"
                    title="Generate demo content (Admin only)"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {generateDemo.isPending ? 'Generating...' : 'Demo'}
                    </span>
                  </Button>
                )}
              </>
            )}
            <Button
              variant={isAuthenticated ? 'outline' : 'default'}
              size="sm"
              onClick={handleAuth}
              disabled={isLoggingIn}
              className="gap-2"
            >
              {isLoggingIn ? (
                'Logging in...'
              ) : isAuthenticated ? (
                <>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </>
              )}
            </Button>
          </nav>
        </div>
      </header>

      {showCreateModal && hasProfile && <CreateAppModal onClose={() => setShowCreateModal(false)} />}
    </>
  );
}

