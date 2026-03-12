import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useRecordPageVisit } from './hooks/useQueries';
import { useActor } from './hooks/useActor';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import WelcomeScreen from './pages/WelcomeScreen';
import Feed from './pages/Feed';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import SearchPage from './pages/SearchPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PageType } from './backend';

export type View = 'welcome' | 'feed' | 'discover' | 'profile' | 'user-profile' | 'notifications' | 'messages' | 'chat' | 'search' | 'analytics';

function App() {
  const { identity, loginStatus, isInitializing: iiInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const recordPageVisit = useRecordPageVisit();
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [chatConversationId, setChatConversationId] = useState<string | null>(null);

  const isAuthenticated = !!identity;
  const actorReady = !!actor && !actorFetching;
  const needsProfile = isAuthenticated && actorReady && !profileLoading && isFetched && userProfile === null;
  const hasProfile = isAuthenticated && actorReady && userProfile !== null;

  // Reset view to welcome when logging out
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentView('welcome');
      setViewingUserId(null);
      setChatConversationId(null);
    }
  }, [isAuthenticated]);

  // Record page visits for analytics
  useEffect(() => {
    if (!hasProfile) return;

    const pageTypeMap: Record<View, PageType | null> = {
      discover: PageType.discover,
      profile: PageType.profile,
      'user-profile': PageType.profile,
      messages: PageType.messages,
      chat: PageType.messages,
      search: PageType.search,
      notifications: PageType.notifications,
      welcome: null,
      feed: null,
      analytics: null,
    };

    const pageType = pageTypeMap[currentView];
    if (pageType) {
      recordPageVisit.mutate(pageType);
    }
  }, [currentView, hasProfile]);

  const handleNavigate = (view: View, userId?: string, conversationId?: string) => {
    // Block navigation to authenticated pages if profile is not set up
    if (needsProfile && view !== 'welcome') {
      return;
    }
    
    setCurrentView(view);
    if (userId) {
      setViewingUserId(userId);
    } else {
      setViewingUserId(null);
    }
    if (conversationId) {
      setChatConversationId(conversationId);
    } else if (view !== 'chat') {
      setChatConversationId(null);
    }
  };

  // Show loading state while initializing
  const isInitializing = iiInitializing || loginStatus === 'initializing' || actorFetching || (isAuthenticated && profileLoading && !isFetched);

  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading Canister Cafe...</p>
            <p className="text-xs text-muted-foreground">Initializing backend connection</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header 
          currentView={currentView} 
          onNavigate={handleNavigate}
          hasProfile={hasProfile}
        />
        
        <main className="flex-1">
          {currentView === 'welcome' && <WelcomeScreen onNavigate={handleNavigate} />}
          {currentView === 'feed' && hasProfile && <Feed onNavigate={handleNavigate} />}
          {currentView === 'discover' && hasProfile && <DiscoverPage onNavigate={handleNavigate} />}
          {currentView === 'profile' && hasProfile && <ProfilePage onNavigate={handleNavigate} />}
          {currentView === 'notifications' && hasProfile && <NotificationsPage onNavigate={handleNavigate} />}
          {currentView === 'messages' && hasProfile && <MessagesPage onNavigate={handleNavigate} />}
          {currentView === 'search' && hasProfile && <SearchPage onNavigate={handleNavigate} />}
          {currentView === 'analytics' && hasProfile && <AnalyticsPage />}
          {currentView === 'chat' && chatConversationId && hasProfile && (
            <ChatPage conversationId={chatConversationId} onNavigate={handleNavigate} />
          )}
          {currentView === 'user-profile' && viewingUserId && hasProfile && (
            <ProfilePage userId={viewingUserId} onNavigate={handleNavigate} />
          )}
        </main>

        <Footer />

        {needsProfile && <ProfileSetupModal />}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
