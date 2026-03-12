import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, AppShowcase, AppRoast, Notification, ConversationSummary, Message, AnalyticsData, PageTraffic, PageType, ThemePreference, Comment } from '../backend';
import { ExternalBlob } from '../backend';
import { Principal } from '@icp-sdk/core/principal';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getCallerUserProfile();
      } catch (error: any) {
        // If unauthorized or no profile, return null instead of throwing
        if (error.message?.includes('Unauthorized') || error.message?.includes('must have a profile')) {
          return null;
        }
        console.error('Error fetching caller profile:', error);
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && !actorFetching && query.isFetched,
  };
}

export function useGetUserProfile(userId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      try {
        return await actor.getUserProfile(Principal.fromText(userId));
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!userId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsData'] });
      queryClient.invalidateQueries({ queryKey: ['themePreference'] });
    },
  });
}

export function useGetThemePreference() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<ThemePreference>({
    queryKey: ['themePreference'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getThemePreference();
      } catch (error: any) {
        console.error('Error fetching theme preference:', error);
        // Default to light theme if error
        return 'light' as ThemePreference;
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useSaveThemePreference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (theme: ThemePreference) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveThemePreference(theme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themePreference'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Helper function to sort showcases by update timestamp or creation timestamp
const sortShowcasesByTimestamp = (showcases: AppShowcase[]): AppShowcase[] => {
  return showcases.sort((a, b) => {
    const aTime = a.updateTimestamp ?? a.timestamp;
    const bTime = b.updateTimestamp ?? b.timestamp;
    return Number(bTime - aTime);
  });
};

export function useGetAllAppShowcases() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['appShowcases'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const showcases = await actor.getAllAppShowcases();
        return sortShowcasesByTimestamp(showcases);
      } catch (error) {
        console.error('Error fetching app showcases:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetUserAppShowcases(userId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['userAppShowcases', userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        const showcases = await actor.getUserAppShowcases(Principal.fromText(userId));
        return sortShowcasesByTimestamp(showcases);
      } catch (error) {
        console.error('Error fetching user app showcases:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!userId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useCreateAppShowcase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appName,
      description,
      thumbnail,
      liveLink,
      category,
      hashtags,
    }: {
      appName: string;
      description: string;
      thumbnail: ExternalBlob | null;
      liveLink: string;
      category: string;
      hashtags: string[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createAppShowcase(appName, description, thumbnail, liveLink, category, hashtags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['userAppShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['globalFeed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['categoryApps'] });
    },
  });
}

export function useEditAppShowcase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      appName,
      description,
      thumbnail,
      liveLink,
      category,
      hashtags,
    }: {
      id: string;
      appName: string;
      description: string;
      thumbnail: ExternalBlob | null;
      liveLink: string;
      category: string;
      hashtags: string[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.editAppShowcase(id, appName, description, thumbnail, liveLink, category, hashtags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['userAppShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['globalFeed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['categoryApps'] });
      queryClient.invalidateQueries({ queryKey: ['commentsWithUsernames'] });
    },
  });
}

export function usePostAppUpdate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, updateDescription }: { appId: string; updateDescription: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.postAppUpdate(appId, updateDescription);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['userAppShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['globalFeed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['categoryApps'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useLikeAppShowcase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.likeAppShowcase(appId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['userAppShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['globalFeed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['categoryApps'] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, content }: { appId: string; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addComment(appId, content);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['userAppShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['globalFeed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['categoryApps'] });
      queryClient.invalidateQueries({ queryKey: ['commentsWithUsernames', variables.appId] });
    },
  });
}

// New hook to get comments with usernames
export type CommentWithUsername = {
  comment: Comment;
  username: string;
};

export function useGetCommentsWithUsernames(appId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<CommentWithUsername[]>({
    queryKey: ['commentsWithUsernames', appId],
    queryFn: async () => {
      if (!actor || !appId) return [];
      try {
        const result = await actor.getCommentsWithUsernames(appId);
        return result.map(([comment, username]) => ({
          comment,
          username,
        }));
      } catch (error) {
        console.error('Error fetching comments with usernames:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!appId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useSubmitAppRoast() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, content, anonymous }: { appId: string; content: string; anonymous: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitAppRoast(appId, content, anonymous);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appRoasts', variables.appId] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useGetAppRoasts(appId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppRoast[]>({
    queryKey: ['appRoasts', appId],
    queryFn: async () => {
      if (!actor || !appId) return [];
      try {
        return await actor.getAppRoasts(appId);
      } catch (error) {
        console.error('Error fetching app roasts:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!appId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.followUser(Principal.fromText(targetUserId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['followersList'] });
      queryClient.invalidateQueries({ queryKey: ['followingList'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersForMessaging'] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unfollowUser(Principal.fromText(targetUserId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['followersList'] });
      queryClient.invalidateQueries({ queryKey: ['followingList'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['allUsersForMessaging'] });
    },
  });
}

export function useGetFollowing() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<Principal[]>({
    queryKey: ['following'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getFollowing();
      } catch (error) {
        console.error('Error fetching following:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetFollowers(userId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<Principal[]>({
    queryKey: ['followers', userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return await actor.getFollowers(Principal.fromText(userId));
      } catch (error) {
        console.error('Error fetching followers:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!userId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

// New hooks for followers/following lists with profile data
export function useGetFollowersList(userId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<Array<[Principal, UserProfile | null]>>({
    queryKey: ['followersList', userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return await actor.getFollowersList(Principal.fromText(userId));
      } catch (error) {
        console.error('Error fetching followers list:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!userId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetFollowingList(userId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<Array<[Principal, UserProfile | null]>>({
    queryKey: ['followingList', userId],
    queryFn: async () => {
      if (!actor || !userId) return [];
      try {
        return await actor.getFollowingList(Principal.fromText(userId));
      } catch (error) {
        console.error('Error fetching following list:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!userId && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetFeed() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['feed'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const showcases = await actor.getFeed();
        return sortShowcasesByTimestamp(showcases);
      } catch (error) {
        console.error('Error fetching feed:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetGlobalAppFeed() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['globalFeed'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const showcases = await actor.getGlobalAppFeed();
        return sortShowcasesByTimestamp(showcases);
      } catch (error) {
        console.error('Error fetching global feed:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetFollowingAppFeed() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['followingFeed'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const showcases = await actor.getFollowingAppShowcases();
        return sortShowcasesByTimestamp(showcases);
      } catch (error) {
        console.error('Error fetching following feed:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch (error) {
        return false;
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGenerateDemoContent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.generateDemoContent();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['userAppShowcases'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['globalFeed'] });
      queryClient.invalidateQueries({ queryKey: ['followingFeed'] });
      queryClient.invalidateQueries({ queryKey: ['categoryApps'] });
    },
  });
}

export function useGetUserNotifications() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getUserNotifications();
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    retry: false,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Direct Messages Hooks

export function useGetUserConversations() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<ConversationSummary[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getUserConversations();
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    retry: false,
  });
}

export function useGetMessages(conversationId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<Message[]>({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!actor || !conversationId) return [];
      try {
        return await actor.getMessages(conversationId);
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!conversationId && !!identity && loginStatus !== 'initializing',
    refetchInterval: 5000, // Refetch every 5 seconds for real-time chat updates
    retry: false,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiver, content }: { receiver: string; content: string }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate receiver principal
      if (!receiver || receiver.trim() === '') {
        throw new Error('Receiver principal is required');
      }
      
      try {
        const receiverPrincipal = Principal.fromText(receiver);
        return await actor.sendMessage(receiverPrincipal, content);
      } catch (error: any) {
        if (error.message?.includes('checksum') || error.message?.includes('Invalid principal')) {
          throw new Error('Invalid receiver principal ID. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkMessageAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markMessageAsRead(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useStartConversation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (receiverId: string) => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate receiver principal
      if (!receiverId || receiverId.trim() === '') {
        throw new Error('Receiver principal is required');
      }
      
      try {
        const receiverPrincipal = Principal.fromText(receiverId);
        return await actor.startConversation(receiverPrincipal);
      } catch (error: any) {
        if (error.message?.includes('checksum') || error.message?.includes('Invalid principal')) {
          throw new Error('Invalid receiver principal ID. Please try again.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Type for user with Principal ID
export type UserWithPrincipal = {
  principalId: string;
  username: string;
  bio: string;
  profilePicture?: any;
  links?: any;
  nftGallery?: any;
  isDemo: boolean;
  themePreference: ThemePreference;
};

export function useSearchUsersByUsername(searchTerm: string) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<UserProfile[]>({
    queryKey: ['searchUsers', searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm || searchTerm.trim().length === 0) return [];
      try {
        return await actor.searchUsersByUsername(searchTerm.trim());
      } catch (error) {
        console.error('Error searching users:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && searchTerm.trim().length > 0 && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

// Get all users - returns UserProfile array
export function useGetAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<UserProfile[]>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllUsers();
      } catch (error) {
        console.error('Error fetching all users:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });
}

// Get all users with their principal IDs - combines data from multiple sources
export function useGetAllUsersWithPrincipals() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();
  const { data: conversations = [] } = useGetUserConversations();
  const { data: following = [] } = useGetFollowing();
  const { data: allShowcases = [] } = useGetAllAppShowcases();

  return useQuery<UserWithPrincipal[]>({
    queryKey: ['allUsersWithPrincipals', conversations.length, following.length, allShowcases.length],
    queryFn: async () => {
      if (!actor) return [];
      
      try {
        // Collect all known principals from multiple sources
        const knownPrincipals = new Set<string>();
        
        // Add principals from conversations
        conversations.forEach(conv => {
          const principalId = conv.contact.toString();
          if (principalId && principalId !== 'aaaaa-aa' && principalId.trim() !== '') {
            try {
              Principal.fromText(principalId);
              knownPrincipals.add(principalId);
            } catch {
              // Invalid principal, skip
            }
          }
        });
        
        // Add principals from following list
        following.forEach(principal => {
          const principalId = principal.toString();
          if (principalId && principalId !== 'aaaaa-aa' && principalId.trim() !== '') {
            try {
              Principal.fromText(principalId);
              knownPrincipals.add(principalId);
            } catch {
              // Invalid principal, skip
            }
          }
        });
        
        // Add principals from app showcase creators
        allShowcases.forEach(showcase => {
          const principalId = showcase.creator.toString();
          if (principalId && principalId !== 'aaaaa-aa' && principalId.trim() !== '') {
            try {
              Principal.fromText(principalId);
              knownPrincipals.add(principalId);
            } catch {
              // Invalid principal, skip
            }
          }
        });
        
        // Fetch profiles for all known principals
        const usersWithPrincipals: UserWithPrincipal[] = [];
        
        for (const principalId of knownPrincipals) {
          try {
            const profile = await actor.getUserProfile(Principal.fromText(principalId));
            if (profile) {
              usersWithPrincipals.push({
                principalId,
                username: profile.username,
                bio: profile.bio,
                profilePicture: profile.profilePicture,
                links: profile.links,
                nftGallery: profile.nftGallery,
                isDemo: profile.isDemo,
                themePreference: profile.themePreference,
              });
            }
          } catch (error) {
            console.error(`Error fetching profile for ${principalId}:`, error);
          }
        }
        
        return usersWithPrincipals;
      } catch (error) {
        console.error('Error building users with principals:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Get all users with their principal IDs for messaging
export function useGetAllUsersForMessaging() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();
  const { data: conversations = [] } = useGetUserConversations();
  const { data: following = [] } = useGetFollowing();
  const { data: allShowcases = [] } = useGetAllAppShowcases();

  return useQuery<UserWithPrincipal[]>({
    queryKey: ['allUsersForMessaging', conversations.length, following.length, allShowcases.length],
    queryFn: async () => {
      if (!actor) return [];
      
      try {
        // Collect all known principals from multiple sources
        const knownPrincipals = new Set<string>();
        
        // Add principals from conversations
        conversations.forEach(conv => {
          const principalId = conv.contact.toString();
          if (principalId && principalId !== 'aaaaa-aa' && principalId.trim() !== '') {
            try {
              Principal.fromText(principalId);
              knownPrincipals.add(principalId);
            } catch {
              // Invalid principal, skip
            }
          }
        });
        
        // Add principals from following list
        following.forEach(principal => {
          const principalId = principal.toString();
          if (principalId && principalId !== 'aaaaa-aa' && principalId.trim() !== '') {
            try {
              Principal.fromText(principalId);
              knownPrincipals.add(principalId);
            } catch {
              // Invalid principal, skip
            }
          }
        });
        
        // Add principals from app showcase creators
        allShowcases.forEach(showcase => {
          const principalId = showcase.creator.toString();
          if (principalId && principalId !== 'aaaaa-aa' && principalId.trim() !== '') {
            try {
              Principal.fromText(principalId);
              knownPrincipals.add(principalId);
            } catch {
              // Invalid principal, skip
            }
          }
        });
        
        // Fetch profiles for all known principals
        const usersWithPrincipals: UserWithPrincipal[] = [];
        
        for (const principalId of knownPrincipals) {
          try {
            const profile = await actor.getUserProfile(Principal.fromText(principalId));
            if (profile) {
              usersWithPrincipals.push({
                principalId,
                username: profile.username,
                bio: profile.bio,
                profilePicture: profile.profilePicture,
                links: profile.links,
                nftGallery: profile.nftGallery,
                isDemo: profile.isDemo,
                themePreference: profile.themePreference,
              });
            }
          } catch (error) {
            console.error(`Error fetching profile for ${principalId}:`, error);
          }
        }
        
        return usersWithPrincipals;
      } catch (error) {
        console.error('Error building users for messaging:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// Search Hooks

export function useSearchByHashtag(hashtag: string) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['searchHashtag', hashtag],
    queryFn: async () => {
      if (!actor || !hashtag || hashtag.trim().length === 0) return [];
      try {
        return await actor.searchByHashtag(hashtag.trim());
      } catch (error) {
        console.error('Error searching by hashtag:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && hashtag.trim().length > 0 && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useSearchByAppName(searchTerm: string) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['searchAppName', searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm || searchTerm.trim().length === 0) return [];
      try {
        return await actor.searchByAppName(searchTerm.trim());
      } catch (error) {
        console.error('Error searching by app name:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && searchTerm.trim().length > 0 && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

// Category Hooks

export function useGetAllCategories() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllCategories();
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

export function useGetAppsByCategory(category: string | null) {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AppShowcase[]>({
    queryKey: ['categoryApps', category],
    queryFn: async () => {
      if (!actor || !category) return [];
      try {
        const showcases = await actor.getAppsByCategory(category);
        return sortShowcasesByTimestamp(showcases);
      } catch (error) {
        console.error('Error fetching apps by category:', error);
        return [];
      }
    },
    enabled: !!actor && !actorFetching && !!category && !!identity && loginStatus !== 'initializing',
    retry: false,
  });
}

// Analytics Hooks (Admin-only)

export function useGetAnalyticsData() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, loginStatus } = useInternetIdentity();

  return useQuery<AnalyticsData>({
    queryKey: ['analyticsData'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getAnalyticsData();
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw error;
      }
    },
    enabled: !!actor && !actorFetching && !!identity && loginStatus !== 'initializing',
    refetchInterval: 60000, // Refetch every 60 seconds for real-time analytics
    retry: false,
  });
}

export function useRecordPageVisit() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (pageType: PageType) => {
      if (!actor) throw new Error('Actor not available');
      return actor.recordPageVisit(pageType);
    },
  });
}
