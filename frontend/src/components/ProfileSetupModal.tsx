import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { toast } from 'sonner';
import { ExternalBlob, ThemePreference } from '../backend';
import { Upload, Loader2, Plus, X } from 'lucide-react';

interface ExternalLink {
  linkLabel: string;
  url: string;
}

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

export default function ProfileSetupModal() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [nftGallery, setNftGallery] = useState<string[]>([]);
  const saveProfile = useSaveCallerUserProfile();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        themePreference: ThemePreference.light,
      });

      toast.success('Profile created successfully! Welcome to Canister Cafe!');
    } catch (error: any) {
      console.error('Profile setup error:', error);
      const errorMessage = error?.message || 'Failed to create profile';
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to Canister Cafe!</DialogTitle>
          <DialogDescription>
            Create your profile to start sharing your Caffeine creations with the community
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              maxLength={30}
              required
              disabled={saveProfile.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={200}
              rows={3}
              disabled={saveProfile.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profilePicture">Profile Picture</Label>
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Input
                id="profilePicture"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1"
                disabled={saveProfile.isPending}
              />
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <p className="text-sm text-muted-foreground">Uploading: {uploadProgress}%</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>External Links (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
                disabled={links.length >= 5 || saveProfile.isPending}
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
                        disabled={saveProfile.isPending}
                      />
                      <Input
                        placeholder="URL (e.g., twitter.com/username or example.xyz)"
                        value={link.url}
                        onChange={(e) => updateLink(index, 'url', e.target.value)}
                        disabled={saveProfile.isPending}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                      className="mt-1"
                      disabled={saveProfile.isPending}
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
              <Label>ICP NFT Gallery (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNft}
                disabled={nftGallery.length >= 20 || saveProfile.isPending}
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
                      disabled={saveProfile.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNft(index)}
                      disabled={saveProfile.isPending}
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

          <Button type="submit" className="w-full" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
