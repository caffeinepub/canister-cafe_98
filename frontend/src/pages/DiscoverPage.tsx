import { useState } from 'react';
import { useGetAllCategories, useGetAppsByCategory, useGetGlobalAppFeed, useGetFollowingAppFeed } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AppShowcaseCard from '../components/AppShowcaseCard';
import { Loader2, Globe, Grid3x3, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea, ScrollBar } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import type { View } from '../App';

interface DiscoverPageProps {
  onNavigate: (view: View, userId?: string) => void;
}

export default function DiscoverPage({ onNavigate }: DiscoverPageProps) {
  const { identity } = useInternetIdentity();
  const { data: categories = [], isLoading: categoriesLoading } = useGetAllCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: categoryApps = [], isLoading: categoryAppsLoading } = useGetAppsByCategory(selectedCategory);
  const { data: globalFeedShowcases = [], isLoading: globalFeedLoading } = useGetGlobalAppFeed();
  const { data: followingFeedShowcases = [], isLoading: followingFeedLoading } = useGetFollowingAppFeed();

  const isAuthenticated = !!identity;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <Globe className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">Login Required</h2>
          <p className="text-muted-foreground">
            Please login to discover apps and browse by category.
          </p>
        </div>
      </div>
    );
  }

  if (categoriesLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Browse by Category Section */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Grid3x3 className="h-6 w-6" />
            Browse by Category
          </h2>
          <p className="text-muted-foreground">Explore apps organized by category</p>
        </div>

        {/* Category Selector - Horizontally Scrollable */}
        <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-card p-4">
          <div className="flex gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                className="shrink-0"
              >
                {category}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Selected Category Apps */}
        {selectedCategory && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedCategory}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  ({categoryApps.length} {categoryApps.length === 1 ? 'app' : 'apps'})
                </span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Clear
              </Button>
            </div>

            {categoryAppsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : categoryApps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No apps found in this category yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryApps.map((showcase) => (
                  <AppShowcaseCard key={showcase.id} showcase={showcase} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* App Feed Section with Tabs */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Globe className="h-6 w-6" />
            App Feed
          </h2>
          <p className="text-muted-foreground">Discover apps from the community</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              All Users
            </TabsTrigger>
            <TabsTrigger value="following" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Following
            </TabsTrigger>
          </TabsList>

          {/* All Users Tab */}
          <TabsContent value="all" className="mt-0">
            {globalFeedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : globalFeedShowcases.length === 0 ? (
              <div className="text-center py-12 space-y-4 bg-card rounded-lg border p-8">
                <Globe className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">No apps yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Be the first to share your caffeine-powered application with the community!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {globalFeedShowcases.map((showcase) => (
                  <AppShowcaseCard key={showcase.id} showcase={showcase} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="mt-0">
            {followingFeedLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : followingFeedShowcases.length === 0 ? (
              <div className="text-center py-12 space-y-4 bg-card rounded-lg border p-8">
                <Users className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">No apps from followed users</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Follow other users to see their app showcases here. Start by exploring the "All Users" tab!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {followingFeedShowcases.map((showcase) => (
                  <AppShowcaseCard key={showcase.id} showcase={showcase} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
