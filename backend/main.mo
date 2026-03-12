import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Text "mo:base/Text";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

persistent actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    // No permission check - anyone including guests can check their role
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside assignRole
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    // No permission check - anyone including guests can check admin status
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type ExternalLink = {
    linkLabel : Text;
    url : Text;
  };

  public type ThemePreference = {
    #light;
    #dark;
  };

  public type UserProfile = {
    username : Text;
    bio : Text;
    profilePicture : ?Storage.ExternalBlob;
    links : ?[ExternalLink];
    nftGallery : ?[Text];
    isDemo : Bool;
    themePreference : ThemePreference;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  // Demo content generation flag
  var demoContentGenerated : Bool = false;

  // Check if a user has a profile (required for profile creation flow)
  public query ({ caller }) func hasProfile(user : Principal) : async Bool {
    // Only authenticated users can check profile existence
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can check profile existence");
    };

    // Users can only check their own profile existence, admins can check any profile
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only check your own profile existence");
    };

    switch (principalMap.get(userProfiles, user)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view their profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    // Only authenticated users with profiles can view other profiles
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };

    // Verify caller has a profile (required for social features)
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view other profiles") };
      case (?_) {};
    };

    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };

    // Prevent non-admin users from setting isDemo flag
    if (profile.isDemo and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admins can set demo flag");
    };

    // Validate links if present
    switch (profile.links) {
      case (?links) {
        if (links.size() > 5) {
          Debug.trap("Cannot have more than 5 external links");
        };

        for (link in links.vals()) {
          if (Text.size(link.url) == 0) {
            Debug.trap("Invalid URL: Cannot be empty");
          };
        };
      };
      case (null) {};
    };

    // Validate NFT gallery if present
    switch (profile.nftGallery) {
      case (?nfts) {
        if (nfts.size() > 20) {
          Debug.trap("Cannot have more than 20 NFT URLs");
        };

        for (nft in nfts.vals()) {
          if (Text.size(nft) == 0) {
            Debug.trap("Invalid NFT URL: Cannot be empty");
          };
          if (not validateICPNFTUrl(nft)) {
            Debug.trap("Invalid NFT URL: Must be a valid ICP NFT URL");
          };
        };
      };
      case (null) {};
    };

    // Check if this is a new profile creation for analytics tracking
    let isNewProfile = switch (principalMap.get(userProfiles, caller)) {
      case (null) { true };
      case (?_) { false };
    };

    userProfiles := principalMap.put(userProfiles, caller, profile);

    // Record profile creation for analytics if this is a new profile
    if (isNewProfile) {
      recordProfileCreation();
    };
  };

  // Save Theme Preference
  public shared ({ caller }) func saveThemePreference(theme : ThemePreference) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save theme preference");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to save theme preference") };
      case (?profile) {
        let updatedProfile : UserProfile = {
          username = profile.username;
          bio = profile.bio;
          profilePicture = profile.profilePicture;
          links = profile.links;
          nftGallery = profile.nftGallery;
          isDemo = profile.isDemo;
          themePreference = theme;
        };

        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
      };
    };
  };

  // Get Theme Preference
  public query ({ caller }) func getThemePreference() : async ThemePreference {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can get theme preference");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to get theme preference") };
      case (?profile) { profile.themePreference };
    };
  };

  // Validate ICP NFT URL
  func validateICPNFTUrl(url : Text) : Bool {
    let icpNftPatterns = [
      "entrepot.app",
      "icnft.io",
      "icp0.io",
      "nftvillage.app",
      "nft.icp.xyz",
      "nft.ic0.app",
      "nft.icp0.io",
      "nft.icp0.app",
      "nft.icp0.xyz",
      "nft.icp0.com",
      "nft.icp0.net",
      "nft.icp0.org",
      "nft.icp0.dev",
      "nft.icp0.cloud",
      "nft.icp0.store",
      "nft.icp0.market",
      "nft.icp0.exchange",
      "nft.icp0.trade",
      "nft.icp0.finance",
      "nft.icp0.capital",
      "nft.icp0.fund",
      "nft.icp0.invest",
      "nft.icp0.asset",
      "nft.icp0.token",
      "nft.icp0.coin",
      "nft.icp0.crypto",
      "nft.icp0.blockchain",
      "nft.icp0.chain",
      "nft.icp0.dapp",
      "nft.icp0.app",
      "nft.icp0.site",
      "nft.icp0.web",
      "nft.icp0.page",
      "nft.icp0.link",
      "nft.icp0.url",
      "nft.icp0.domain",
      "nft.icp0.name",
      "nft.icp0.id",
    ];

    for (pattern in icpNftPatterns.vals()) {
      if (Text.contains(url, #text pattern)) {
        return true;
      };
    };
    false;
  };

  // App Showcase Types
  public type AppShowcase = {
    id : Text;
    creator : Principal;
    appName : Text;
    description : Text;
    thumbnail : ?Storage.ExternalBlob;
    liveLink : Text;
    category : Text;
    hashtags : [Text];
    timestamp : Int;
    likes : Nat;
    comments : [Comment];
    isDemo : Bool;
    updateDescription : ?Text;
    updateTimestamp : ?Int;
  };

  public type Comment = {
    id : Text;
    author : Principal;
    content : Text;
    timestamp : Int;
  };

  // App Roast Types
  public type AppRoast = {
    id : Text;
    appId : Text;
    submitter : ?Principal;
    content : Text;
    timestamp : Int;
    anonymous : Bool;
  };

  // App Showcase Storage
  transient let textMap = OrderedMap.Make<Text>(func(a : Text, b : Text) : { #less; #equal; #greater } { if (a < b) #less else if (a == b) #equal else #greater });
  var appShowcases = textMap.empty<AppShowcase>();

  // App Roast Storage
  var appRoasts = textMap.empty<AppRoast>();

  // Allowed categories
  let allowedCategories : [Text] = [
    "Business/Productivity",
    "E-commerce",
    "Social/Community",
    "Gaming",
    "Entertainment",
    "Finance/Crypto",
    "Tools/Utility",
    "Education",
    "Healthcare",
    "Sports/Fitness",
    "Logistics",
    "Real Estate",
    "Travel",
    "Government/Public Services",
    "Other",
  ];

  // Create App Showcase
  public shared ({ caller }) func createAppShowcase(appName : Text, description : Text, thumbnail : ?Storage.ExternalBlob, liveLink : Text, category : Text, hashtags : [Text]) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create app showcases");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to create app showcases") };
      case (?_) {};
    };

    // Validate liveLink ends with .xyz
    if (not Text.endsWith(liveLink, #text ".xyz")) {
      Debug.trap("Invalid live link: Must end with .xyz");
    };

    // Validate category (case-insensitive)
    let normalizedCategory = Text.toLowercase(category);
    let isValidCategory = Array.find<Text>(
      allowedCategories,
      func(cat) {
        Text.toLowercase(cat) == normalizedCategory;
      },
    );

    switch (isValidCategory) {
      case (null) { Debug.trap("Invalid category: Must be one of the predefined list") };
      case (?_) {
        let id = appName # "-" # debug_show (Time.now());
        let showcase : AppShowcase = {
          id;
          creator = caller;
          appName;
          description;
          thumbnail;
          liveLink;
          category;
          hashtags;
          timestamp = Time.now();
          likes = 0;
          comments = [];
          isDemo = false;
          updateDescription = null;
          updateTimestamp = null;
        };

        appShowcases := textMap.put(appShowcases, id, showcase);
        id;
      };
    };
  };

  // Edit App Showcase
  public shared ({ caller }) func editAppShowcase(id : Text, appName : Text, description : Text, thumbnail : ?Storage.ExternalBlob, liveLink : Text, category : Text, hashtags : [Text]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can edit app showcases");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to edit app showcases") };
      case (?_) {};
    };

    // Validate liveLink ends with .xyz
    if (not Text.endsWith(liveLink, #text ".xyz")) {
      Debug.trap("Invalid live link: Must end with .xyz");
    };

    // Validate category (case-insensitive)
    let normalizedCategory = Text.toLowercase(category);
    let isValidCategory = Array.find<Text>(
      allowedCategories,
      func(cat) {
        Text.toLowercase(cat) == normalizedCategory;
      },
    );

    switch (isValidCategory) {
      case (null) { Debug.trap("Invalid category: Must be one of the predefined list") };
      case (?_) {
        switch (textMap.get(appShowcases, id)) {
          case (null) { Debug.trap("App showcase not found") };
          case (?showcase) {
            // Ownership check - only creator can edit (admins cannot override)
            if (showcase.creator != caller) {
              Debug.trap("Unauthorized: Only the creator can edit this showcase");
            };

            let updatedShowcase : AppShowcase = {
              id;
              creator = caller;
              appName;
              description;
              thumbnail;
              liveLink;
              category;
              hashtags;
              timestamp = showcase.timestamp; // Keep original timestamp
              likes = showcase.likes;
              comments = showcase.comments;
              isDemo = showcase.isDemo;
              updateDescription = showcase.updateDescription;
              updateTimestamp = showcase.updateTimestamp;
            };

            appShowcases := textMap.put(appShowcases, id, updatedShowcase);
          };
        };
      };
    };
  };

  // Post App Update
  public shared ({ caller }) func postAppUpdate(appId : Text, updateDescription : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can post app updates");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to post app updates") };
      case (?_) {};
    };

    if (Text.size(updateDescription) == 0) {
      Debug.trap("Update description cannot be empty");
    };

    switch (textMap.get(appShowcases, appId)) {
      case (null) { Debug.trap("App showcase not found") };
      case (?showcase) {
        // Ownership check - only creator can post updates (admins cannot override)
        if (showcase.creator != caller) {
          Debug.trap("Unauthorized: Only the creator can post updates");
        };

        let updatedShowcase : AppShowcase = {
          id = showcase.id;
          creator = showcase.creator;
          appName = showcase.appName;
          description = showcase.description;
          thumbnail = showcase.thumbnail;
          liveLink = showcase.liveLink;
          category = showcase.category;
          hashtags = showcase.hashtags;
          timestamp = showcase.timestamp; // Keep original creation timestamp
          likes = showcase.likes;
          comments = showcase.comments;
          isDemo = showcase.isDemo;
          updateDescription = ?updateDescription;
          updateTimestamp = ?Time.now();
        };

        appShowcases := textMap.put(appShowcases, appId, updatedShowcase);

        // Notify all followers of the creator
        let creatorFollowers = getFollowersInternal(showcase.creator);
        for (follower in creatorFollowers.vals()) {
          ignore createNotificationInternal(follower, #appUpdate, caller, appId);
        };
      };
    };
  };

  // Get All App Showcases
  public query ({ caller }) func getAllAppShowcases() : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view app showcases");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view app showcases") };
      case (?_) {};
    };

    Iter.toArray(textMap.vals(appShowcases));
  };

  // Get App Showcase by ID
  public query ({ caller }) func getAppShowcase(id : Text) : async ?AppShowcase {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view app showcases");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view app showcases") };
      case (?_) {};
    };

    textMap.get(appShowcases, id);
  };

  // Like App Showcase (with notification)
  public shared ({ caller }) func likeAppShowcase(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can like app showcases");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to like app showcases") };
      case (?_) {};
    };

    switch (textMap.get(appShowcases, id)) {
      case (null) { Debug.trap("App showcase not found") };
      case (?showcase) {
        let updatedShowcase : AppShowcase = {
          id = showcase.id;
          creator = showcase.creator;
          appName = showcase.appName;
          description = showcase.description;
          thumbnail = showcase.thumbnail;
          liveLink = showcase.liveLink;
          category = showcase.category;
          hashtags = showcase.hashtags;
          timestamp = showcase.timestamp;
          likes = showcase.likes + 1;
          comments = showcase.comments;
          isDemo = showcase.isDemo;
          updateDescription = showcase.updateDescription;
          updateTimestamp = showcase.updateTimestamp;
        };
        appShowcases := textMap.put(appShowcases, id, updatedShowcase);

        // Create notification for app creator (only if not liking own app)
        if (caller != showcase.creator) {
          ignore createNotificationInternal(showcase.creator, #like, caller, id);
        };
      };
    };
  };

  // Add Comment to App Showcase (with notification)
  public shared ({ caller }) func addComment(appId : Text, content : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can comment");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to comment") };
      case (?_) {};
    };

    if (Text.size(content) == 0) {
      Debug.trap("Comment content cannot be empty");
    };

    let commentId = appId # "-comment-" # debug_show (Time.now());
    let comment : Comment = {
      id = commentId;
      author = caller;
      content;
      timestamp = Time.now();
    };

    switch (textMap.get(appShowcases, appId)) {
      case (null) { Debug.trap("App showcase not found") };
      case (?showcase) {
        let updatedShowcase : AppShowcase = {
          id = showcase.id;
          creator = showcase.creator;
          appName = showcase.appName;
          description = showcase.description;
          thumbnail = showcase.thumbnail;
          liveLink = showcase.liveLink;
          category = showcase.category;
          hashtags = showcase.hashtags;
          timestamp = showcase.timestamp;
          likes = showcase.likes;
          comments = Array.append(showcase.comments, [comment]);
          isDemo = showcase.isDemo;
          updateDescription = showcase.updateDescription;
          updateTimestamp = showcase.updateTimestamp;
        };
        appShowcases := textMap.put(appShowcases, appId, updatedShowcase);

        // Create notification for app creator (only if not commenting on own app)
        if (caller != showcase.creator) {
          ignore createNotificationInternal(showcase.creator, #comment, caller, appId);
        };
      };
    };
    commentId;
  };

  // Get Comments with Usernames
  public query ({ caller }) func getCommentsWithUsernames(appId : Text) : async [(Comment, Text)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view comments");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view comments") };
      case (?_) {};
    };

    switch (textMap.get(appShowcases, appId)) {
      case (null) { Debug.trap("App showcase not found") };
      case (?showcase) {
        let commentsWithUsernames = Array.map<Comment, (Comment, Text)>(
          showcase.comments,
          func(comment) {
            let username = switch (principalMap.get(userProfiles, comment.author)) {
              case (null) { "Unknown User" };
              case (?profile) { profile.username };
            };
            (comment, username);
          },
        );
        commentsWithUsernames;
      };
    };
  };

  // Get User's App Showcases
  public query ({ caller }) func getUserAppShowcases(user : Principal) : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view user showcases");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view user showcases") };
      case (?_) {};
    };

    Iter.toArray(
      Iter.filter(
        textMap.vals(appShowcases),
        func(showcase : AppShowcase) : Bool {
          showcase.creator == user;
        },
      )
    );
  };

  // Follow System
  transient let followMap = OrderedMap.Make<Principal>(Principal.compare);
  var following : OrderedMap.Map<Principal, [Principal]> = followMap.empty();

  // Follow User (with notification)
  public shared ({ caller }) func followUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can follow others");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to follow others") };
      case (?_) {};
    };

    if (caller == target) {
      Debug.trap("Cannot follow yourself");
    };

    // Verify target user exists and has a profile
    switch (principalMap.get(userProfiles, target)) {
      case (null) { Debug.trap("Target user does not exist") };
      case (?_) {};
    };

    let currentFollowing = switch (followMap.get(following, caller)) {
      case (null) { [] };
      case (?list) { list };
    };

    if (Array.find<Principal>(currentFollowing, func(p) { p == target }) != null) {
      Debug.trap("Already following this user");
    };

    let updatedFollowing = Array.append(currentFollowing, [target]);
    following := followMap.put(following, caller, updatedFollowing);

    // Create notification for followed user
    ignore createNotificationInternal(target, #follow, caller, Principal.toText(caller));
  };

  // Unfollow User
  public shared ({ caller }) func unfollowUser(target : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can unfollow others");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to unfollow others") };
      case (?_) {};
    };

    let currentFollowing = switch (followMap.get(following, caller)) {
      case (null) { Debug.trap("Not following anyone") };
      case (?list) { list };
    };

    if (Array.find<Principal>(currentFollowing, func(p) { p == target }) == null) {
      Debug.trap("Not following this user");
    };

    let updatedFollowing = Array.filter<Principal>(currentFollowing, func(p) { p != target });
    following := followMap.put(following, caller, updatedFollowing);
  };

  // Get Following List
  public query ({ caller }) func getFollowing() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view following lists");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view following lists") };
      case (?_) {};
    };

    switch (followMap.get(following, caller)) {
      case (null) { [] };
      case (?list) { list };
    };
  };

  // Get Followers List
  public query ({ caller }) func getFollowers(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view followers");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view followers") };
      case (?_) {};
    };

    getFollowersInternal(user);
  };

  // Internal function to get followers (used for notifications)
  func getFollowersInternal(user : Principal) : [Principal] {
    var followers : [Principal] = [];
    for ((follower, followedList) in followMap.entries(following)) {
      if (Array.find<Principal>(followedList, func(p) { p == user }) != null) {
        followers := Array.append(followers, [follower]);
      };
    };
    followers;
  };

  // Get Feed from Followed Users
  public query ({ caller }) func getFeed() : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access personalized feed");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to access personalized feed") };
      case (?_) {};
    };

    let followedUsers = switch (followMap.get(following, caller)) {
      case (null) { [] };
      case (?list) { list };
    };

    if (followedUsers.size() == 0) {
      return [];
    };

    let allShowcases = Iter.toArray(textMap.vals(appShowcases));
    let feed = Array.filter<AppShowcase>(
      allShowcases,
      func(showcase) {
        Array.find<Principal>(followedUsers, func(p) { p == showcase.creator }) != null;
      },
    );

    Array.sort<AppShowcase>(
      feed,
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  // App Roast Feature

  // Submit App Roast (with notification)
  public shared ({ caller }) func submitAppRoast(appId : Text, content : Text, anonymous : Bool) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can submit app roasts");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to submit app roasts") };
      case (?_) {};
    };

    if (Text.size(content) == 0) {
      Debug.trap("Roast content cannot be empty");
    };

    switch (textMap.get(appShowcases, appId)) {
      case (null) { Debug.trap("App showcase not found") };
      case (?showcase) {
        let roastId = appId # "-roast-" # debug_show (Time.now());
        let roast : AppRoast = {
          id = roastId;
          appId;
          submitter = if (anonymous) { null } else { ?caller };
          content;
          timestamp = Time.now();
          anonymous;
        };

        appRoasts := textMap.put(appRoasts, roastId, roast);

        // Create notification for app creator (only if not roasting own app)
        if (caller != showcase.creator) {
          ignore createNotificationInternal(showcase.creator, #appRoast, caller, appId);
        };
        roastId;
      };
    };
  };

  // Get App Roasts (Only for App Creator)
  public query ({ caller }) func getAppRoasts(appId : Text) : async [AppRoast] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view app roasts");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view app roasts") };
      case (?_) {};
    };

    switch (textMap.get(appShowcases, appId)) {
      case (null) { Debug.trap("App showcase not found") };
      case (?showcase) {
        // Ownership check - only app creator can view roasts (admins cannot override)
        if (showcase.creator != caller) {
          Debug.trap("Unauthorized: Only the app creator can view roasts");
        };

        let allRoasts = Iter.toArray(textMap.vals(appRoasts));
        let appRoastList = Array.filter<AppRoast>(
          allRoasts,
          func(roast) {
            roast.appId == appId;
          },
        );

        Array.sort<AppRoast>(
          appRoastList,
          func(a, b) {
            if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
              #greater;
            } else { #equal };
          },
        );
      };
    };
  };

  // Storage for images and files
  let storage = Storage.new();
  include MixinStorage(storage);

  // Generate Demo Content (Admin-only, runs once)
  public shared ({ caller }) func generateDemoContent() : async () {
    // Admin-only check - only admins can generate demo content
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can generate demo content");
    };

    // Prevent repeated execution
    if (demoContentGenerated) {
      Debug.trap("Demo content has already been generated");
    };

    // Create demo principals using blob-based approach
    let demoPrincipals : [Principal] = [
      Principal.fromBlob("\00\00\00\00\00\00\00\00\01\01"),
      Principal.fromBlob("\00\00\00\00\00\00\00\00\01\02"),
      Principal.fromBlob("\00\00\00\00\00\00\00\00\01\03"),
      Principal.fromBlob("\00\00\00\00\00\00\00\00\01\04"),
      Principal.fromBlob("\00\00\00\00\00\00\00\00\01\05"),
    ];

    let demoUsers = [
      {
        username = "demo_user1";
        bio = "Demo user 1 bio";
        profilePicture = null;
        links = null;
        nftGallery = null;
        isDemo = true;
        themePreference = #light;
      },
      {
        username = "demo_user2";
        bio = "Demo user 2 bio";
        profilePicture = null;
        links = null;
        nftGallery = null;
        isDemo = true;
        themePreference = #light;
      },
      {
        username = "demo_user3";
        bio = "Demo user 3 bio";
        profilePicture = null;
        links = null;
        nftGallery = null;
        isDemo = true;
        themePreference = #light;
      },
      {
        username = "demo_user4";
        bio = "Demo user 4 bio";
        profilePicture = null;
        links = null;
        nftGallery = null;
        isDemo = true;
        themePreference = #light;
      },
      {
        username = "demo_user5";
        bio = "Demo user 5 bio";
        profilePicture = null;
        links = null;
        nftGallery = null;
        isDemo = true;
        themePreference = #light;
      },
    ];

    let demoApps = [
      {
        appName = "Demo App 1";
        description = "Demo app 1 description";
        thumbnail = null;
        liveLink = "demoapp1.xyz";
        category = "Business/Productivity";
        hashtags = ["demo", "app", "business"];
        isDemo = true;
      },
      {
        appName = "Demo App 2";
        description = "Demo app 2 description";
        thumbnail = null;
        liveLink = "demoapp2.xyz";
        category = "E-commerce";
        hashtags = ["demo", "app", "ecommerce"];
        isDemo = true;
      },
      {
        appName = "Demo App 3";
        description = "Demo app 3 description";
        thumbnail = null;
        liveLink = "demoapp3.xyz";
        category = "Social/Community";
        hashtags = ["demo", "app", "social"];
        isDemo = true;
      },
      {
        appName = "Demo App 4";
        description = "Demo app 4 description";
        thumbnail = null;
        liveLink = "demoapp4.xyz";
        category = "Gaming";
        hashtags = ["demo", "app", "gaming"];
        isDemo = true;
      },
      {
        appName = "Demo App 5";
        description = "Demo app 5 description";
        thumbnail = null;
        liveLink = "demoapp5.xyz";
        category = "Entertainment";
        hashtags = ["demo", "app", "entertainment"];
        isDemo = true;
      },
    ];

    // Create demo users with unique principals
    var userIndex = 0;
    for (user in demoUsers.vals()) {
      let principal = demoPrincipals[userIndex];
      userProfiles := principalMap.put(userProfiles, principal, user);
      userIndex += 1;
    };

    // Create demo apps (2 per user)
    var appIndex = 0;
    for (app in demoApps.vals()) {
      let principal = demoPrincipals[appIndex / 2];
      let id = app.appName # "-" # debug_show (Time.now()) # "-" # debug_show (appIndex);
      let showcase : AppShowcase = {
        id;
        creator = principal;
        appName = app.appName;
        description = app.description;
        thumbnail = app.thumbnail;
        liveLink = app.liveLink;
        category = app.category;
        hashtags = app.hashtags;
        timestamp = Time.now();
        likes = 0;
        comments = [];
        isDemo = app.isDemo;
        updateDescription = null;
        updateTimestamp = null;
      };

      appShowcases := textMap.put(appShowcases, id, showcase);
      appIndex += 1;
    };

    // Mark demo content as generated
    demoContentGenerated := true;
  };

  // Notification Types
  public type NotificationType = {
    #like;
    #comment;
    #appRoast;
    #follow;
    #message;
    #appUpdate;
  };

  public type Notification = {
    id : Text;
    timestamp : Int;
    eventType : NotificationType;
    sourceUser : Principal;
    entityId : Text;
    read : Bool;
    targetUser : Principal;
  };

  // Notification Storage
  var notifications = textMap.empty<Notification>();

  // Internal function to create notifications (not exposed publicly)
  private func createNotificationInternal(targetUser : Principal, eventType : NotificationType, sourceUser : Principal, entityId : Text) : Text {
    let notificationId = debug_show (Time.now()) # "-" # debug_show (eventType) # "-" # Principal.toText(sourceUser);
    let notification : Notification = {
      id = notificationId;
      timestamp = Time.now();
      eventType;
      sourceUser;
      entityId;
      read = false;
      targetUser;
    };

    notifications := textMap.put(notifications, notificationId, notification);
    notificationId;
  };

  // Get User Notifications
  public query ({ caller }) func getUserNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view notifications");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view notifications") };
      case (?_) {};
    };

    let allNotifications = Iter.toArray(textMap.vals(notifications));
    let userNotifications = Array.filter<Notification>(
      allNotifications,
      func(notification) {
        notification.targetUser == caller;
      },
    );

    Array.sort<Notification>(
      userNotifications,
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  // Mark Notification as Read
  public shared ({ caller }) func markNotificationAsRead(notificationId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can mark notifications as read");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to mark notifications as read") };
      case (?_) {};
    };

    switch (textMap.get(notifications, notificationId)) {
      case (null) { Debug.trap("Notification not found") };
      case (?notification) {
        // Ownership check - only target user can mark as read
        if (notification.targetUser != caller) {
          Debug.trap("Unauthorized: Only the target user can mark this notification as read");
        };

        let updatedNotification : Notification = {
          id = notification.id;
          timestamp = notification.timestamp;
          eventType = notification.eventType;
          sourceUser = notification.sourceUser;
          entityId = notification.entityId;
          read = true;
          targetUser = notification.targetUser;
        };

        notifications := textMap.put(notifications, notificationId, updatedNotification);
      };
    };
  };

  // Direct Messages System

  public type Message = {
    id : Text;
    sender : Principal;
    receiver : Principal;
    content : Text;
    timestamp : Int;
    conversationId : Text;
    read : Bool;
  };

  public type ConversationSummary = {
    conversationId : Text;
    contact : Principal;
    lastMessage : ?Message;
    unreadCount : Nat;
  };

  // Message Storage
  var messages = textMap.empty<Message>();

  // Generate Conversation ID
  func generateConversationId(user1 : Principal, user2 : Principal) : Text {
    let user1Text = Principal.toText(user1);
    let user2Text = Principal.toText(user2);
    if (user1Text < user2Text) {
      user1Text # "-" # user2Text;
    } else {
      user2Text # "-" # user1Text;
    };
  };

  // Validate Principal Exists in User Profiles
  func validatePrincipalExists(principal : Principal) : Bool {
    switch (principalMap.get(userProfiles, principal)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  // Send Message (with notification)
  public shared ({ caller }) func sendMessage(receiver : Principal, content : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can send messages");
    };

    // Verify sender has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("Sender must have a profile to send messages") };
      case (?_) {};
    };

    // Validate receiver principal format
    if (not validatePrincipalExists(receiver)) {
      Debug.trap("Invalid receiver principal id: Receiver does not exist or does not have a profile");
    };

    // Prevent sending messages to yourself
    if (caller == receiver) {
      Debug.trap("Cannot send messages to yourself");
    };

    if (Text.size(content) == 0) {
      Debug.trap("Message content cannot be empty");
    };

    let conversationId = generateConversationId(caller, receiver);
    let messageId = conversationId # "-message-" # debug_show (Time.now());

    let message : Message = {
      id = messageId;
      sender = caller;
      receiver;
      content;
      timestamp = Time.now();
      conversationId;
      read = false;
    };

    messages := textMap.put(messages, messageId, message);

    // Create notification for receiver
    ignore createNotificationInternal(receiver, #message, caller, conversationId);

    messageId;
  };

  // Get User Conversations
  public query ({ caller }) func getUserConversations() : async [ConversationSummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view conversations");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view conversations") };
      case (?_) {};
    };

    let allMessages = Iter.toArray(textMap.vals(messages));
    var conversationMap = textMap.empty<ConversationSummary>();

    for (message in allMessages.vals()) {
      // Only process messages where caller is sender or receiver
      if (message.sender == caller or message.receiver == caller) {
        let contact = if (message.sender == caller) { message.receiver } else {
          message.sender;
        };

        let existingSummary = textMap.get(conversationMap, message.conversationId);

        let unreadCount = if (message.receiver == caller and not message.read) {
          1;
        } else { 0 };

        let newSummary = switch (existingSummary) {
          case (null) {
            {
              conversationId = message.conversationId;
              contact;
              lastMessage = ?message;
              unreadCount;
            };
          };
          case (?summary) {
            {
              conversationId = summary.conversationId;
              contact = summary.contact;
              lastMessage = if (switch (summary.lastMessage) { case (null) { true }; case (?last) { message.timestamp > last.timestamp } }) { ?message } else {
                summary.lastMessage;
              };
              unreadCount = summary.unreadCount + unreadCount;
            };
          };
        };

        conversationMap := textMap.put(conversationMap, message.conversationId, newSummary);
      };
    };

    Iter.toArray(textMap.vals(conversationMap));
  };

  // Get Messages for Conversation
  public query ({ caller }) func getMessages(conversationId : Text) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view messages");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view messages") };
      case (?_) {};
    };

    let allMessages = Iter.toArray(textMap.vals(messages));
    
    // Filter messages for this conversation and verify caller is a participant
    let conversationMessages = Array.filter<Message>(
      allMessages,
      func(message) {
        message.conversationId == conversationId and (message.sender == caller or message.receiver == caller);
      },
    );

    // Additional authorization check: verify caller is actually part of this conversation
    if (conversationMessages.size() > 0) {
      let firstMessage = conversationMessages[0];
      if (firstMessage.sender != caller and firstMessage.receiver != caller) {
        Debug.trap("Unauthorized: You are not part of this conversation");
      };
    };

    Array.sort<Message>(
      conversationMessages,
      func(a, b) {
        if (a.timestamp < b.timestamp) { #less } else if (a.timestamp > b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  // Mark Message as Read
  public shared ({ caller }) func markMessageAsRead(messageId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can mark messages as read");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to mark messages as read") };
      case (?_) {};
    };

    switch (textMap.get(messages, messageId)) {
      case (null) { Debug.trap("Message not found") };
      case (?message) {
        // Ownership check - only receiver can mark as read
        if (message.receiver != caller) {
          Debug.trap("Unauthorized: Only the receiver can mark this message as read");
        };

        let updatedMessage : Message = {
          id = message.id;
          sender = message.sender;
          receiver = message.receiver;
          content = message.content;
          timestamp = message.timestamp;
          conversationId = message.conversationId;
          read = true;
        };

        messages := textMap.put(messages, messageId, updatedMessage);
      };
    };
  };

  // Start Conversation (returns conversation ID)
  public shared ({ caller }) func startConversation(receiver : Principal) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can start conversations");
    };

    // Verify sender has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("Sender must have a profile to start conversations") };
      case (?_) {};
    };

    // Validate receiver principal format
    if (not validatePrincipalExists(receiver)) {
      Debug.trap("Invalid receiver principal id: Receiver does not exist or does not have a profile");
    };

    // Prevent starting conversation with yourself
    if (caller == receiver) {
      Debug.trap("Cannot start conversation with yourself");
    };

    let conversationId = generateConversationId(caller, receiver);
    conversationId;
  };

  // Search Users by Username (for New Message modal and Search page)
  public query ({ caller }) func searchUsersByUsername(searchTerm : Text) : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can search for users");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to search for users") };
      case (?_) {};
    };

    let allProfiles = Iter.toArray(principalMap.vals(userProfiles));
    let matchingProfiles = Array.filter<UserProfile>(
      allProfiles,
      func(profile) {
        Text.contains(Text.toLowercase(profile.username), #text (Text.toLowercase(searchTerm)));
      },
    );

    matchingProfiles;
  };

  // Get All Users with Profiles (for user selection and discovery)
  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view all users");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view all users") };
      case (?_) {};
    };

    Iter.toArray(principalMap.vals(userProfiles));
  };

  // Search by Hashtag (for Search page)
  public query ({ caller }) func searchByHashtag(hashtag : Text) : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can search by hashtag");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to search by hashtag") };
      case (?_) {};
    };

    let allShowcases = Iter.toArray(textMap.vals(appShowcases));
    let matchingShowcases = Array.filter<AppShowcase>(
      allShowcases,
      func(showcase) {
        Array.find<Text>(
          showcase.hashtags,
          func(tag) {
            Text.contains(Text.toLowercase(tag), #text (Text.toLowercase(hashtag)));
          },
        ) != null;
      },
    );

    matchingShowcases;
  };

  // Search by App Name or Description (for Search page)
  public query ({ caller }) func searchByAppName(searchTerm : Text) : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can search by app name");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to search by app name") };
      case (?_) {};
    };

    let allShowcases = Iter.toArray(textMap.vals(appShowcases));
    let matchingShowcases = Array.filter<AppShowcase>(
      allShowcases,
      func(showcase) {
        Text.contains(Text.toLowercase(showcase.appName), #text (Text.toLowercase(searchTerm))) or Text.contains(Text.toLowercase(showcase.description), #text (Text.toLowercase(searchTerm)));
      },
    );

    matchingShowcases;
  };

  // Get Apps by Category (for Discover tab)
  public query ({ caller }) func getAppsByCategory(category : Text) : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can browse by category");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to browse by category") };
      case (?_) {};
    };

    // Validate category (case-insensitive)
    let normalizedCategory = Text.toLowercase(category);
    let isValidCategory = Array.find<Text>(
      allowedCategories,
      func(cat) {
        Text.toLowercase(cat) == normalizedCategory;
      },
    );

    switch (isValidCategory) {
      case (null) { Debug.trap("Invalid category: Must be one of the predefined list") };
      case (?_) {
        let allShowcases = Iter.toArray(textMap.vals(appShowcases));
        let categoryShowcases = Array.filter<AppShowcase>(
          allShowcases,
          func(showcase) {
            Text.toLowercase(showcase.category) == normalizedCategory;
          },
        );

        Array.sort<AppShowcase>(
          categoryShowcases,
          func(a, b) {
            if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
              #greater;
            } else { #equal };
          },
        );
      };
    };
  };

  // Get All Categories (for Discover tab)
  public query ({ caller }) func getAllCategories() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can get categories");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to get categories") };
      case (?_) {};
    };

    allowedCategories;
  };

  // Get Global App Feed (for Discover tab)
  public query ({ caller }) func getGlobalAppFeed() : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view global feed");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view global feed") };
      case (?_) {};
    };

    let allShowcases = Iter.toArray(textMap.vals(appShowcases));
    Array.sort<AppShowcase>(
      allShowcases,
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  // Get Following App Showcases (for Discover tab)
  public query ({ caller }) func getFollowingAppShowcases() : async [AppShowcase] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view following feed");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view following feed") };
      case (?_) {};
    };

    let followedUsers = switch (followMap.get(following, caller)) {
      case (null) { [] };
      case (?list) { list };
    };

    if (followedUsers.size() == 0) {
      return [];
    };

    let allShowcases = Iter.toArray(textMap.vals(appShowcases));
    let followingShowcases = Array.filter<AppShowcase>(
      allShowcases,
      func(showcase) {
        Array.find<Principal>(followedUsers, func(p) { p == showcase.creator }) != null;
      },
    );

    Array.sort<AppShowcase>(
      followingShowcases,
      func(a, b) {
        if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) {
          #greater;
        } else { #equal };
      },
    );
  };

  // Analytics Types
  public type PageType = {
    #discover;
    #profile;
    #messages;
    #search;
    #notifications;
  };

  public type PageTraffic = {
    pageType : PageType;
    visitCount : Nat;
    timestamp : Int;
  };

  public type AnalyticsData = {
    totalProfiles : Nat;
    profileCreations : [Int];
    pageTraffic : [PageTraffic];
    totalAppsShared : Nat;
    totalPageVisits : Nat;
  };

  // Analytics Storage
  var profileCreations : [Int] = [];
  var pageTraffic : [PageTraffic] = [];

  // Record Profile Creation (internal function called when new profile is created)
  func recordProfileCreation() {
    profileCreations := Array.append(profileCreations, [Time.now()]);
  };

  // Record Page Visit (public function for frontend to call)
  public shared ({ caller }) func recordPageVisit(pageType : PageType) : async () {
    // Only authenticated users with profiles can record page visits
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can record page visits");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to record page visits") };
      case (?_) {};
    };

    let traffic : PageTraffic = {
      pageType;
      visitCount = 1;
      timestamp = Time.now();
    };
    pageTraffic := Array.append(pageTraffic, [traffic]);
  };

  // Get Analytics Data (Admin-only)
  public query ({ caller }) func getAnalyticsData() : async AnalyticsData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view analytics data");
    };

    let totalProfiles = principalMap.size(userProfiles);
    let totalAppsShared = textMap.size(appShowcases);
    let totalPageVisits = Array.foldLeft<PageTraffic, Nat>(
      pageTraffic,
      0,
      func(acc, traffic) {
        acc + traffic.visitCount;
      },
    );

    {
      totalProfiles;
      profileCreations;
      pageTraffic;
      totalAppsShared;
      totalPageVisits;
    };
  };

  // Get Total Profile Count (Admin-only)
  public query ({ caller }) func getTotalProfileCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view total profile count");
    };

    principalMap.size(userProfiles);
  };

  // Get Page Traffic Metrics (Admin-only)
  public query ({ caller }) func getPageTrafficMetrics() : async [PageTraffic] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view page traffic metrics");
    };

    pageTraffic;
  };

  // Get Total Apps Shared (Admin-only)
  public query ({ caller }) func getTotalAppsShared() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view total apps shared");
    };

    textMap.size(appShowcases);
  };

  // Get Total Page Visits (Admin-only)
  public query ({ caller }) func getTotalPageVisits() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view total page visits");
    };

    Array.foldLeft<PageTraffic, Nat>(
      pageTraffic,
      0,
      func(acc, traffic) {
        acc + traffic.visitCount;
      },
    );
  };

  // Get Followers List with Profile Data
  public query ({ caller }) func getFollowersList(user : Principal) : async [(Principal, ?UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view followers list");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view followers list") };
      case (?_) {};
    };

    let followers = getFollowersInternal(user);
    Array.map<Principal, (Principal, ?UserProfile)>(
      followers,
      func(follower) {
        (follower, principalMap.get(userProfiles, follower));
      },
    );
  };

  // Get Following List with Profile Data
  public query ({ caller }) func getFollowingList(user : Principal) : async [(Principal, ?UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view following list");
    };

    // Verify caller has a profile
    switch (principalMap.get(userProfiles, caller)) {
      case (null) { Debug.trap("User must have a profile to view following list") };
      case (?_) {};
    };

    let followingList = switch (followMap.get(following, user)) {
      case (null) { [] };
      case (?list) { list };
    };

    Array.map<Principal, (Principal, ?UserProfile)>(
      followingList,
      func(followed) {
        (followed, principalMap.get(userProfiles, followed));
      },
    );
  };
};

