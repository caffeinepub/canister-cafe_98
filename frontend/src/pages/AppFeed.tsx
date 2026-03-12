import { useGetFeed } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AppShowcaseCard from '../components/AppShowcaseCard';
import { Loader2, Users } from 'lucide-react';
import type { View } from '../App';

interface AppFeedProps {
  onNavigate: (view: View, userId?: string) => void;
}

export default function AppFeed({ onNavigate }: AppFeedProps) {
  const { identity } = useInternetIdentity();
  const { data: showcases, isLoading } = useGetFeed();

  const isAuthenticated = !!identity;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Login Required</h2>
          <p className="text-muted-foreground">
            Please login to view your personalized app feed.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!showcases || showcases.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">You're not following anyone yet</h2>
          <p className="text-muted-foreground">
            Start following other users to see their app showcases in your personalized feed.
            Visit user profiles and click the Follow button to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Your App Feed</h2>
        <p className="text-muted-foreground">Apps from people you follow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcases.map((showcase) => (
          <AppShowcaseCard key={showcase.id} showcase={showcase} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
