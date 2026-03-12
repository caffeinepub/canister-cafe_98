import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Heart, MessageCircle, ExternalLink, Edit, Loader2, Flame, RefreshCw, Clock } from 'lucide-react';
import { useLikeAppShowcase, useAddComment, useGetUserProfile, useGetCommentsWithUsernames } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { toast } from 'sonner';
import { formatTimestamp } from '../lib/utils';
import type { AppShowcase } from '../backend';
import type { View } from '../App';
import EditAppModal from './EditAppModal';
import AppRoastModal from './AppRoastModal';
import AppUpdateModal from './AppUpdateModal';

interface AppShowcaseCardProps {
  showcase: AppShowcase;
  onNavigate: (view: View, userId?: string) => void;
}

// Helper function to ensure URL has protocol
const ensureProtocol = (url: string): string => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

export default function AppShowcaseCard({ showcase, onNavigate }: AppShowcaseCardProps) {
  const { identity } = useInternetIdentity();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoastModal, setShowRoastModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const likeApp = useLikeAppShowcase();
  const addComment = useAddComment();
  const { data: creatorProfile } = useGetUserProfile(showcase.creator.toString());
  const { data: commentsWithUsernames = [], isLoading: commentsLoading } = useGetCommentsWithUsernames(
    showComments ? showcase.id : null
  );

  const isCreator = identity?.getPrincipal().toString() === showcase.creator.toString();
  const hasUpdate = !!showcase.updateDescription && !!showcase.updateTimestamp;

  const handleLike = async () => {
    try {
      await likeApp.mutateAsync(showcase.id);
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to like app');
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    try {
      await addComment.mutateAsync({
        appId: showcase.id,
        content: commentText.trim(),
      });
      setCommentText('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleCreatorClick = () => {
    onNavigate('user-profile', showcase.creator.toString());
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
        <div className="relative h-48 bg-muted">
          {showcase.thumbnail ? (
            <img
              src={showcase.thumbnail.getDirectURL()}
              alt={showcase.appName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src="/assets/generated/app-placeholder-thumb-corrected.dim_300x200.png"
                alt="Placeholder"
                className="w-full h-full object-cover opacity-50"
              />
            </div>
          )}
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            {showcase.category}
          </Badge>
          {hasUpdate && (
            <Badge className="absolute top-2 left-2 bg-[oklch(var(--cocoa))] text-[oklch(var(--cocoa-foreground))] border-none flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              New Update
            </Badge>
          )}
          {isCreator && !hasUpdate && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 left-2"
              onClick={() => setShowEditModal(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>

        <CardHeader>
          <CardTitle className="line-clamp-1">{showcase.appName}</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Avatar
              className="h-6 w-6 cursor-pointer"
              onClick={handleCreatorClick}
            >
              <AvatarImage src={creatorProfile?.profilePicture?.getDirectURL() || '/assets/generated/default-avatar.dim_150x150.png'} />
              <AvatarFallback className="text-xs">
                {creatorProfile?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span
              className="text-sm text-muted-foreground cursor-pointer hover:underline"
              onClick={handleCreatorClick}
            >
              {creatorProfile?.username || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Posted {formatTimestamp(showcase.timestamp)}</span>
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {showcase.description}
          </p>

          {hasUpdate && (
            <div className="mb-3 p-3 bg-accent/50 rounded-lg border border-[oklch(var(--cocoa))]">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-4 w-4 text-[oklch(var(--cocoa))]" />
                <span className="text-xs font-semibold text-[oklch(var(--cocoa))]">Latest Update</span>
              </div>
              <p className="text-sm text-foreground line-clamp-2 mb-2">
                {showcase.updateDescription}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Updated {formatTimestamp(showcase.updateTimestamp!)}</span>
              </div>
            </div>
          )}

          {showcase.hashtags && showcase.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {showcase.hashtags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs bg-[oklch(var(--cocoa))] hover:bg-[oklch(var(--cocoa-light))] text-[oklch(var(--cocoa-foreground))] border-none cursor-pointer"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={ensureProtocol(showcase.liveLink)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Live App
            </a>
          </Button>
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeApp.isPending}
              className="flex items-center gap-1"
            >
              {likeApp.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              <span>{Number(showcase.likes)}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{showcase.comments.length}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoastModal(true)}
              className="flex items-center gap-1"
            >
              <Flame className="h-4 w-4" />
              <span>Roast</span>
            </Button>
            {isCreator && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpdateModal(true)}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="whitespace-nowrap">Post Update</span>
              </Button>
            )}
          </div>

          {showComments && (
            <div className="w-full space-y-3">
              {commentsLoading ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  Loading comments...
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {commentsWithUsernames.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No comments yet. Be the first to comment!
                    </div>
                  ) : (
                    commentsWithUsernames.map(({ comment, username }) => (
                      <div key={comment.id} className="text-sm bg-muted p-2 rounded">
                        <p className="font-medium text-xs text-primary mb-1">
                          {username}
                        </p>
                        <p className="text-foreground">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(comment.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <Button
                  size="sm"
                  onClick={handleComment}
                  disabled={addComment.isPending || !commentText.trim()}
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Post'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {showEditModal && (
        <EditAppModal
          showcase={showcase}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showRoastModal && (
        <AppRoastModal
          appId={showcase.id}
          appName={showcase.appName}
          onClose={() => setShowRoastModal(false)}
        />
      )}

      {showUpdateModal && (
        <AppUpdateModal
          appId={showcase.id}
          appName={showcase.appName}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </>
  );
}
