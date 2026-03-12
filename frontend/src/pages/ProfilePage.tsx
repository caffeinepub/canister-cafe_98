import { useGetCallerUserProfile, useGetUserProfile, useGetUserAppShowcases, useSaveCallerUserProfile, useFollowUser, useUnfollowUser, useGetFollowing, useGetFollowers, useStartConversation, useSaveThemePreference } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import AppShowcaseCard from '../components/AppShowcaseCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Loader2, Edit, X, Upload, UserPlus, UserMinus, Plus, ExternalLink as ExternalLinkIcon, Flame, Image as ImageIcon, MessageCircle, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ExternalBlob, ThemePreference } from '../backend';
import type { View } from '../App';
import ViewAppRoastsModal from '../components/ViewAppRoastsModal';
import FollowersModal from '../components/FollowersModal';
import { useTheme } from 'next-themes';

interface ProfilePageProps {
  userId?: string;
  onNavigate: (view: View, userId?: string, conversationId?: string) => void;
}

interface ExternalLink {
  linkLabel: string;
  url: string;
}

// Helper function to ensure URL has protocol
const ensureProtocol = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

// Validate ICP NFT URL
const validateICPNFTUrl = (url: string): boolean => {
  const icpNftPatterns = [
    'entrepot.app',
    'yumi.io',
    'yuku.app',
    'bioniq.io',
    'dgdg.app',
    'jelly.xyz',
    'impossiblethings.com',
    'gigaversemarket.com',
    'nftvillage.app',
    'nft.icp',
    'ic0.app',
    'icp0.io',
    '.ic0.app',
    '.icp0.io',
  ];

  const lowerUrl = url.toLowerCase();
  return icpNftPatterns.some(pattern => lowerUrl.includes(pattern));
};

// Component to render NFT card with image
function NFTCard({ url }: { url: string }) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <a
      href={ensureProtocol(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
    >
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      )}
      {imageError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
          <ImageIcon className="h-12 w-12 text-primary/60" />
        </div>
      ) : (
        <img
          src={ensureProtocol(url)}
          alt="NFT"
          className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
        <span className="text-white text-xs font-medium">View NFT</span>
      </div>
    </a>
  );
}

export default function ProfilePage({ userId, onNavigate }: ProfilePageProps) {
  const { identity } = useInternetIdentity();
  const { theme, setTheme } = useTheme();
  const isOwnProfile = !userId;
  
  const { data: ownProfile, isLoading: ownLoading } = useGetCallerUserProfile();
  const { data: otherProfile, isLoading: otherLoading } = useGetUserProfile(userId || null);
  const { data: showcases, isLoading: showcasesLoading } = useGetUserAppShowcases(
    userId || identity?.getPrincipal().toString() || null
  );
  const { data: following } = useGetFollowing();
  const { data: followers } = useGetFollowers(userId || identity?.getPrincipal().toString() || null);
  
  const profile = isOwnProfile ? ownProfile : otherProfile;
  const isLoading = isOwnProfile ? ownLoading : otherLoading;

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const startConversation = useStartConversation();
  const saveThemePreference = useSaveThemePreference();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [nftGallery, setNftGallery] = useState<string[]>([]);
  const [selectedAppForRoasts, setSelectedAppForRoasts] = useState<{ id: string; name: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [followersModalOpen, setFollowersModalOpen] = useState<'followers' | 'following' | null>(null);
  const saveProfile = useSaveCallerUserProfile();

  const isFollowing = userId && following ? following.some(p => p.toString() === userId) : false;

  // Sync theme with profile preference on load
  useEffect(() => {
    if (profile && isOwnProfile) {
      const preferredTheme = profile.themePreference === ThemePreference.dark ? 'dark' : 'light';
      setTheme(preferredTheme);
      setIsDarkMode(profile.themePreference === ThemePreference.dark);
    }
  }, [profile, isOwnProfile, setTheme]);

  const handleEdit = () => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio);
      setPreviewUrl(profile.profilePicture?.getDirectURL() || null);
      setLinks(profile.links || []);
      setNftGallery(profile.nftGallery || []);
      setIsDarkMode(profile.themePreference === ThemePreference.dark);
    }
    setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setProfilePicture(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const addLink = () => {
    if (links.length >= 5) {
      toast.error('Maximum 5 links allowed');
      return;
    }
    setLinks([...links, { linkLabel: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: 'linkLabel' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const addNft = () => {
    if (nftGallery.length >= 20) {
      toast.error('Maximum 20 NFT URLs allowed');
      return;
    }
    setNftGallery([...nftGallery, '']);
  };

  const removeNft = (index: number) => {
    setNftGallery(nftGallery.filter((_, i) => i !== index));
  };

  const updateNft = (index: number, value: string) => {
    const newNftGallery = [...nftGallery];
    newNftGallery[index] = value;
    setNftGallery(newNftGallery);
  };

  const validateLinks = (): boolean => {
    for (const link of links) {
      if (link.linkLabel.trim() && link.url.trim()) {
        if (link.url.trim().length === 0) {
          toast.error('URL cannot be empty');
          return false;
        }
      } else if (link.linkLabel.trim() || link.url.trim()) {
        toast.error('Both label and URL are required for each link');
        return false;
      }
    }
    return true;
  };

  const validateNftGallery = (): boolean => {
    for (const nft of nftGallery) {
      if (nft.trim().length === 0) {
        toast.error('NFT URL cannot be empty');
        return false;
      }
      if (!validateICPNFTUrl(nft.trim())) {
        toast.error('Invalid ICP NFT URL. Please use URLs from ICP NFT platforms like Entrepot, Yumi, Yuku, etc.');
        return false;
      }
    }
    return true;
  };

  const handleThemeToggle = async (checked: boolean) => {
    setIsDarkMode(checked);
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      await saveThemePreference.mutateAsync(checked ? ThemePreference.dark : ThemePreference.light);
      toast.success(`Theme changed to ${checked ? 'dark' : 'light'} mode`);
    } catch (error: any) {
      console.error('Theme preference save error:', error);
      toast.error('Failed to save theme preference');
      // Revert on error
      setIsDarkMode(!checked);
      setTheme(checked ? 'light' : 'dark');
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!validateLinks()) {
      return;
    }

    if (!validateNftGallery()) {
      return;
    }

    try {
      let profilePictureBlob: ExternalBlob | undefined = undefined;

      if (profilePicture) {
        const arrayBuffer = await profilePicture.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        profilePictureBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      } else if (profile?.profilePicture) {
        profilePictureBlob = profile.profilePicture;
      }

      const validLinks = links.filter(link => link.linkLabel.trim() && link.url.trim());
      const validNfts = nftGallery.filter(nft => nft.trim().length > 0);

      await saveProfile.mutateAsync({
        username: username.trim(),
        bio: bio.trim(),
        profilePicture: profilePictureBlob,
        links: validLinks.length > 0 ? validLinks : undefined,
        nftGallery: validNfts.length > 0 ? validNfts : undefined,
        isDemo: false,
        themePreference: isDarkMode ? ThemePreference.dark : ThemePreference.light,
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setProfilePicture(null);
    } catch (error: any) {
      console.error('Profile update error:', error);
      const errorMessage = error?.message || 'Failed to update profile';
      toast.error(errorMessage);
    }
  };

  const handleFollow = async () => {
    if (!userId) return;
    
    try {
      if (isFollowing) {
        await unfollowUser.mutateAsync(userId);
        toast.success('Unfollowed successfully');
      } else {
        await followUser.mutateAsync(userId);
        toast.success('Followed successfully');
      }
    } catch (error: any) {
      console.error('Follow error:', error);
      if (error.message?.includes('Already following')) {
        toast.error('You are already following this user');
      } else if (error.message?.includes('Not following')) {
        toast.error('You are not following this user');
      } else if (error.message?.includes('Cannot follow yourself')) {
        toast.error('You cannot follow yourself');
      } else {
        toast.error(isFollowing ? 'Failed to unfollow' : 'Failed to follow');
      }
    }
  };

  const handleMessage = async () => {
    if (!userId) return;
    
    try {
      const conversationId = await startConversation.mutateAsync(userId);
      onNavigate('chat', undefined, conversationId);
    } catch (error: any) {
      console.error('Start conversation error:', error);
      toast.error(error?.message || 'Failed to start conversation');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const displayUserId = userId || identity?.getPrincipal().toString() || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={previewUrl} />
                    <AvatarFallback>{username[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <p className="text-sm text-muted-foreground">Uploading: {uploadProgress}%</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bio">Bio</Label>
                <Textarea
                  id="edit-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>External Links</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLink}
                    disabled={links.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Link
                  </Button>
                </div>
                {links.length > 0 && (
                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Label (e.g., Twitter, GitHub)"
                            value={link.linkLabel}
                            onChange={(e) => updateLink(index, 'linkLabel', e.target.value)}
                            maxLength={30}
                          />
                          <Input
                            placeholder="URL (e.g., twitter.com/username or example.xyz)"
                            value={link.url}
                            onChange={(e) => updateLink(index, 'url', e.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLink(index)}
                          className="mt-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Add up to 5 external links. URLs can be in any format (e.g., twitter.com/username or https://example.com)
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>ICP NFT Gallery</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNft}
                    disabled={nftGallery.length >= 20}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add NFT
                  </Button>
                </div>
                {nftGallery.length > 0 && (
                  <div className="space-y-3">
                    {nftGallery.map((nft, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="ICP NFT URL (e.g., entrepot.app/...)"
                          value={nft}
                          onChange={(e) => updateNft(index, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeNft(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Add up to 20 ICP NFT URLs from platforms like Entrepot, Yumi, Yuku, Bioniq, etc.
                </p>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme-toggle" className="text-base">Day/Night Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sun className={`h-5 w-5 transition-colors ${!isDarkMode ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch
                      id="theme-toggle"
                      checked={isDarkMode}
                      onCheckedChange={handleThemeToggle}
                      disabled={saveThemePreference.isPending}
                    />
                    <Moon className={`h-5 w-5 transition-colors ${isDarkMode ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profilePicture?.getDirectURL() || '/assets/generated/default-avatar.dim_150x150.png'} />
                <AvatarFallback className="text-2xl">{profile.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold">{profile.username}</h1>
                  {isOwnProfile ? (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant={isFollowing ? "outline" : "default"} 
                        size="sm" 
                        onClick={handleFollow}
                        disabled={followUser.isPending || unfollowUser.isPending}
                      >
                        {followUser.isPending || unfollowUser.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isFollowing ? 'Unfollowing...' : 'Following...'}
                          </>
                        ) : isFollowing ? (
                          <>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Unfollow
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleMessage}
                        disabled={startConversation.isPending}
                      >
                        {startConversation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Message
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {profile.bio && <p className="text-muted-foreground mb-3">{profile.bio}</p>}
                
                {profile.links && profile.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {profile.links.map((link, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={ensureProtocol(link.url)} target="_blank" rel="noopener noreferrer">
                          <ExternalLinkIcon className="mr-2 h-3 w-3" />
                          {link.linkLabel}
                        </a>
                      </Button>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 text-sm">
                  <span>
                    <strong>{showcases?.length || 0}</strong> {showcases?.length === 1 ? 'App' : 'Apps'}
                  </span>
                  <button
                    onClick={() => setFollowersModalOpen('followers')}
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    <strong>{followers?.length || 0}</strong> {followers?.length === 1 ? 'Follower' : 'Followers'}
                  </button>
                  <button
                    onClick={() => setFollowersModalOpen('following')}
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    <strong>{following?.length || 0}</strong> Following
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {profile.nftGallery && profile.nftGallery.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              ICP NFT Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profile.nftGallery.map((nft, index) => (
                <NFTCard key={index} url={nft} />
              ))}
            </div>
          </div>
        )}

        {isOwnProfile && showcases && showcases.length > 0 && (
          <div className="bg-card rounded-lg p-6 mb-8 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Your App Roasts</h2>
            <p className="text-sm text-muted-foreground mb-4">
              View constructive feedback from the community on your apps. Click on an app to see its roasts.
            </p>
            <div className="space-y-2">
              {showcases.map((showcase) => (
                <Button
                  key={showcase.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setSelectedAppForRoasts({ id: showcase.id, name: showcase.appName })}
                >
                  <Flame className="mr-2 h-4 w-4" />
                  {showcase.appName}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-xl font-bold">Published Apps</h2>
        </div>

        {showcasesLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : showcases && showcases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcases.map((showcase) => (
              <AppShowcaseCard key={showcase.id} showcase={showcase} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>{isOwnProfile ? "You haven't published any apps yet" : 'No apps published yet'}</p>
          </div>
        )}
      </div>

      {selectedAppForRoasts && (
        <ViewAppRoastsModal
          appId={selectedAppForRoasts.id}
          appName={selectedAppForRoasts.name}
          onClose={() => setSelectedAppForRoasts(null)}
        />
      )}

      {followersModalOpen && (
        <FollowersModal
          userId={displayUserId}
          type={followersModalOpen}
          onClose={() => setFollowersModalOpen(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
