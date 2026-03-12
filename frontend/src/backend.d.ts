import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface AppRoast {
    id: string;
    content: string;
    appId: string;
    submitter?: Principal;
    anonymous: boolean;
    timestamp: bigint;
}
export interface AnalyticsData {
    pageTraffic: Array<PageTraffic>;
    totalProfiles: bigint;
    totalPageVisits: bigint;
    profileCreations: Array<bigint>;
    totalAppsShared: bigint;
}
export interface Comment {
    id: string;
    content: string;
    author: Principal;
    timestamp: bigint;
}
export interface PageTraffic {
    visitCount: bigint;
    pageType: PageType;
    timestamp: bigint;
}
export interface AppShowcase {
    id: string;
    creator: Principal;
    thumbnail?: ExternalBlob;
    hashtags: Array<string>;
    appName: string;
    description: string;
    isDemo: boolean;
    likes: bigint;
    timestamp: bigint;
    category: string;
    liveLink: string;
    comments: Array<Comment>;
    updateDescription?: string;
    updateTimestamp?: bigint;
}
export interface ExternalLink {
    url: string;
    linkLabel: string;
}
export interface Notification {
    id: string;
    read: boolean;
    sourceUser: Principal;
    entityId: string;
    timestamp: bigint;
    targetUser: Principal;
    eventType: NotificationType;
}
export interface Message {
    id: string;
    content: string;
    read: boolean;
    sender: Principal;
    conversationId: string;
    timestamp: bigint;
    receiver: Principal;
}
export interface ConversationSummary {
    contact: Principal;
    lastMessage?: Message;
    conversationId: string;
    unreadCount: bigint;
}
export interface UserProfile {
    bio: string;
    username: string;
    nftGallery?: Array<string>;
    isDemo: boolean;
    themePreference: ThemePreference;
    links?: Array<ExternalLink>;
    profilePicture?: ExternalBlob;
}
export enum NotificationType {
    appRoast = "appRoast",
    like = "like",
    comment = "comment",
    message = "message",
    appUpdate = "appUpdate",
    follow = "follow"
}
export enum PageType {
    notifications = "notifications",
    messages = "messages",
    search = "search",
    discover = "discover",
    profile = "profile"
}
export enum ThemePreference {
    dark = "dark",
    light = "light"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(appId: string, content: string): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAppShowcase(appName: string, description: string, thumbnail: ExternalBlob | null, liveLink: string, category: string, hashtags: Array<string>): Promise<string>;
    editAppShowcase(id: string, appName: string, description: string, thumbnail: ExternalBlob | null, liveLink: string, category: string, hashtags: Array<string>): Promise<void>;
    followUser(target: Principal): Promise<void>;
    generateDemoContent(): Promise<void>;
    getAllAppShowcases(): Promise<Array<AppShowcase>>;
    getAllCategories(): Promise<Array<string>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getAnalyticsData(): Promise<AnalyticsData>;
    getAppRoasts(appId: string): Promise<Array<AppRoast>>;
    getAppShowcase(id: string): Promise<AppShowcase | null>;
    getAppsByCategory(category: string): Promise<Array<AppShowcase>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentsWithUsernames(appId: string): Promise<Array<[Comment, string]>>;
    getFeed(): Promise<Array<AppShowcase>>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowersList(user: Principal): Promise<Array<[Principal, UserProfile | null]>>;
    getFollowing(): Promise<Array<Principal>>;
    getFollowingAppShowcases(): Promise<Array<AppShowcase>>;
    getFollowingList(user: Principal): Promise<Array<[Principal, UserProfile | null]>>;
    getGlobalAppFeed(): Promise<Array<AppShowcase>>;
    getMessages(conversationId: string): Promise<Array<Message>>;
    getPageTrafficMetrics(): Promise<Array<PageTraffic>>;
    getThemePreference(): Promise<ThemePreference>;
    getTotalAppsShared(): Promise<bigint>;
    getTotalPageVisits(): Promise<bigint>;
    getTotalProfileCount(): Promise<bigint>;
    getUserAppShowcases(user: Principal): Promise<Array<AppShowcase>>;
    getUserConversations(): Promise<Array<ConversationSummary>>;
    getUserNotifications(): Promise<Array<Notification>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasProfile(user: Principal): Promise<boolean>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    likeAppShowcase(id: string): Promise<void>;
    markMessageAsRead(messageId: string): Promise<void>;
    markNotificationAsRead(notificationId: string): Promise<void>;
    postAppUpdate(appId: string, updateDescription: string): Promise<void>;
    recordPageVisit(pageType: PageType): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveThemePreference(theme: ThemePreference): Promise<void>;
    searchByAppName(searchTerm: string): Promise<Array<AppShowcase>>;
    searchByHashtag(hashtag: string): Promise<Array<AppShowcase>>;
    searchUsersByUsername(searchTerm: string): Promise<Array<UserProfile>>;
    sendMessage(receiver: Principal, content: string): Promise<string>;
    startConversation(receiver: Principal): Promise<string>;
    submitAppRoast(appId: string, content: string, anonymous: boolean): Promise<string>;
    unfollowUser(target: Principal): Promise<void>;
}