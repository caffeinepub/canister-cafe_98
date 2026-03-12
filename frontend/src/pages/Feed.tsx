import { useGetAllAppShowcases } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AppShowcaseCard from '../components/AppShowcaseCard';
import { Loader2, Coffee } from 'lucide-react';
import type { View } from '../App';

interface FeedProps {
  onNavigate: (view: View, userId?: string) => void;
}

export default function Feed({ onNavigate }: FeedProps) {
  const { identity } = useInternetIdentity();
  const { data: showcases, isLoading } = useGetAllAppShowcases();

  const isAuthenticated = !!identity;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <Coffee className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-3xl font-bold">Login Required</h2>
          <p className="text-lg text-muted-foreground">
            Please login to view the app feed and discover amazing Caffeine-powered applications.
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
          <Coffee className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">No Apps Yet</h2>
          <p className="text-muted-foreground">
            Be the first to share your Caffeine creation! Click "New App" to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Discover Apps</h2>
        <p className="text-muted-foreground">Explore amazing applications built with Caffeine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showcases.map((showcase) => (
          <AppShowcaseCard key={showcase.id} showcase={showcase} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
