import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCreateAppShowcase } from '../hooks/useQueries';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';
import { Upload, Loader2, X } from 'lucide-react';

interface CreateAppModalProps {
  onClose: () => void;
}

const CATEGORIES = [
  'Business/Productivity',
  'E-commerce',
  'Social/Community',
  'Gaming',
  'Entertainment',
  'Finance/Crypto',
  'Tools/Utility',
  'Education',
  'Healthcare',
  'Sports/Fitness',
  'Logistics',
  'Real Estate',
  'Travel',
  'Government/Public Services',
  'Other',
];

export default function CreateAppModal({ onClose }: CreateAppModalProps) {
  const [appName, setAppName] = useState('');
  const [description, setDescription] = useState('');
  const [liveLink, setLiveLink] = useState('');
  const [category, setCategory] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [liveLinkError, setLiveLinkError] = useState<string | null>(null);
  const createApp = useCreateAppShowcase();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setThumbnail(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const validateLiveLink = (link: string): boolean => {
    if (!link.trim()) {
      setLiveLinkError('Caffeine AI app URL is required');
      return false;
    }
    if (!link.trim().endsWith('.xyz')) {
      setLiveLinkError('URL must end with .xyz (Caffeine AI app URL)');
      return false;
    }
    setLiveLinkError(null);
    return true;
  };

  const handleLiveLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLiveLink(value);
    if (value.trim()) {
      validateLiveLink(value);
    } else {
      setLiveLinkError(null);
    }
  };

  const parseHashtags = (input: string): string[] => {
    if (!input.trim()) return [];
    
    // Split by comma or space, trim each tag, remove empty strings and duplicates
    const tags = input
      .split(/[,\s]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Remove duplicates (case-insensitive)
    const uniqueTags = Array.from(new Set(tags.map(tag => tag.toLowerCase())))
      .map(lowerTag => tags.find(tag => tag.toLowerCase() === lowerTag)!);
    
    return uniqueTags;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appName.trim() || !description.trim()) {
      toast.error('App name and description are required');
      return;
    }

    if (!validateLiveLink(liveLink)) {
      toast.error('Please provide a valid Caffeine AI app URL ending with .xyz');
      return;
    }

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    try {
      let thumbnailBlob: ExternalBlob | null = null;

      if (thumbnail) {
        const arrayBuffer = await thumbnail.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        thumbnailBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      const hashtags = parseHashtags(hashtagsInput);

      await createApp.mutateAsync({
        appName: appName.trim(),
        description: description.trim(),
        thumbnail: thumbnailBlob,
        liveLink: liveLink.trim(),
        category,
        hashtags,
      });

      toast.success('App showcase created successfully!');
      onClose();
    } catch (error: any) {
      console.error('Create app error:', error);
      const errorMessage = error?.message || 'Failed to create app showcase';
      if (errorMessage.includes('.xyz')) {
        toast.error('Invalid live link: Must end with .xyz');
      } else if (errorMessage.includes('category')) {
        toast.error('Invalid category: Must be one of the predefined list');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Your App</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appName">App Name *</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="My Awesome App"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your app and what makes it special..."
              maxLength={500}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="liveLink">Caffeine AI App URL *</Label>
            <Input
              id="liveLink"
              value={liveLink}
              onChange={handleLiveLinkChange}
              placeholder="your-app.xyz or https://your-app.xyz"
              required
              className={liveLinkError ? 'border-destructive' : ''}
            />
            {liveLinkError && (
              <p className="text-sm text-destructive">{liveLinkError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Must be a valid Caffeine AI app URL ending with .xyz (protocol prefix optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the category that best describes your app
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hashtags">Hashtags (optional)</Label>
            <Input
              id="hashtags"
              value={hashtagsInput}
              onChange={(e) => setHashtagsInput(e.target.value)}
              placeholder="ai, productivity, social"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas or spaces. Duplicates will be removed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail Image (optional)</Label>
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setThumbnail(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="max-w-xs mx-auto"
                />
              </div>
            )}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <p className="text-sm text-muted-foreground">Uploading: {uploadProgress}%</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createApp.isPending}>
              {createApp.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Share App'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
