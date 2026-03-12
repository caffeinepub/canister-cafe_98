import { useState } from 'react';
import { Search, User, Hash, Coffee, MessageCircle, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useSearchByHashtag, useSearchByAppName, useGetFollowing, useFollowUser, useUnfollowUser, useStartConversation, useGetAllUsersWithPrincipals } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AppShowcaseCard from '../components/AppShowcaseCard';
import type { View } from '../App';
import { toast } from 'sonner';

interface SearchPageProps {
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'hashtags' | 'apps'>('users');
  const { identity } = useInternetIdentity();

  const { data: allUsersWithPrincipals = [], isLoading: usersLoading } = useGetAllUsersWithPrincipals();
  const { data: hashtagResults = [], isLoading: hashtagsLoading } = useSearchByHashtag(searchTerm);
  const { data: appResults = [], isLoading: appsLoading } = useSearchByAppName(searchTerm);
  const { data: following = [] } = useGetFollowing();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const startConversation = useStartConversation();

  const currentUserId = identity?.getPrincipal().toString();

  // Filter users based on search term
  const userResults = allUsersWithPrincipals.filter(user => {
    if (!searchTerm.trim()) return false;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.bio.toLowerCase().includes(searchLower)
    );
  });

  const isFollowing = (userId: string) => {
    return following.some(p => p.toString() === userId);
  };

  const handleFollowToggle = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFollowing(userId)) {
        await unfollowUser.mutateAsync(userId);
        toast.success('Unfollowed user');
      } else {
        await followUser.mutateAsync(userId);
        toast.success('Following user');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update follow status');
    }
  };

  const handleMessage = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const conversationId = await startConversation.mutateAsync(userId);
      onNavigate('chat', undefined, conversationId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start conversation');
    }
  };

  const handleUserClick = (userId: string) => {
    if (userId === currentUserId) {
      onNavigate('profile');
    } else {
      onNavigate('user-profile', userId);
    }
  };

  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Search className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Search</h1>
          </div>
          <p className="text-muted-foreground">
            Discover users, hashtags, and apps across Canister Cafe
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for users, hashtags, or apps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>

        {/* Results Tabs */}
        {isSearching && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="users" className="gap-2">
                <User className="h-4 w-4" />
                Users ({userResults.length})
              </TabsTrigger>
              <TabsTrigger value="hashtags" className="gap-2">
                <Hash className="h-4 w-4" />
                Hashtags ({hashtagResults.length})
              </TabsTrigger>
              <TabsTrigger value="apps" className="gap-2">
                <Coffee className="h-4 w-4" />
                Apps ({appResults.length})
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4 mt-6">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : userResults.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found matching "{searchTerm}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {userResults.map((user) => {
                    const userId = user.principalId;
                    const isCurrentUser = userId === currentUserId;

                    return (
                      <Card 
                        key={userId} 
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleUserClick(userId)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16 border-2 border-primary/20 flex-shrink-0">
                              {user.profilePicture ? (
                                <AvatarImage src={user.profilePicture.getDirectURL()} alt={user.username} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                  {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors">
                                {user.username}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {user.bio}
                              </p>
                              {!isCurrentUser && (
                                <div className="flex gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => handleMessage(userId, e)}
                                    disabled={startConversation.isPending}
                                    className="gap-2"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                    Message
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={isFollowing(userId) ? 'secondary' : 'default'}
                                    onClick={(e) => handleFollowToggle(userId, e)}
                                    disabled={followUser.isPending || unfollowUser.isPending}
                                    className="gap-2"
                                  >
                                    {isFollowing(userId) ? (
                                      <>
                                        <UserCheck className="h-4 w-4" />
                                        Following
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus className="h-4 w-4" />
                                        Follow
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Hashtags Tab */}
            <TabsContent value="hashtags" className="space-y-4 mt-6">
              {hashtagsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : hashtagResults.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hashtags found matching "{searchTerm}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div>
                  <div className="mb-4">
                    <Badge variant="secondary" className="text-base px-4 py-2">
                      <Hash className="h-4 w-4 mr-1" />
                      {searchTerm}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      {hashtagResults.length} {hashtagResults.length === 1 ? 'app' : 'apps'} found
                    </p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {hashtagResults.map((showcase) => (
                      <AppShowcaseCard
                        key={showcase.id}
                        showcase={showcase}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Apps Tab */}
            <TabsContent value="apps" className="space-y-4 mt-6">
              {appsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : appResults.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No apps found matching "{searchTerm}"</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {appResults.map((showcase) => (
                    <AppShowcaseCard
                      key={showcase.id}
                      showcase={showcase}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {!isSearching && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Start Searching</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter a search term above to discover users, explore hashtags, or find amazing apps built with Caffeine
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
