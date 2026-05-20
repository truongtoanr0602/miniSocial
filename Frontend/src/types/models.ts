// src/types/models.ts — Shared TypeScript interfaces (sync with Backend + Mobile)

// ─── User ───
export interface IUser {
  _id: string;
  username: string;
  display_name: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  following: string[];
  followers: string[];
  settings?: {
    language: string;
    privacy: "public" | "friends" | "private";
    two_factor_enable: boolean;
  };
  status?: "active" | "locked" | "pending";
  created_at?: string;
  updated_at?: string;
}

// ─── Post ───
export interface IMedia {
  url: string;
  type: "image" | "video";
  alt_text?: string;
}

export interface IPost {
  _id: string;
  author_id: IUser | string;
  content?: string;
  hashtags: string[];
  media: IMedia[];
  visibility: "public" | "friends" | "private";
  stats: {
    likes: number;
    comments: number;
    shares: number;
  };
  created_at: string;
  updated_at: string;
  is_liked?: boolean;
}

// ─── Comment ───
export interface IComment {
  _id: string;
  post_id: string;
  author_id: IUser | string;
  parent_id?: string | null;
  content: string;
  stats?: {
    likes: number;
    replies: number;
    is_deleted: boolean;
  };
  created_at: string;
  updated_at?: string;
}

// ─── Notification ───
export interface INotification {
  _id: string;
  recipient_id: string;
  sender_id: IUser | string;
  type: "like" | "comment" | "follow" | "mention" | "share";
  reference_id?: string;
  reference_model?: "Post" | "Comment";
  content?: string;
  is_read: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Conversation ───
export interface IConversation {
  _id: string;
  participants: IUser[];
  partner?: IUser; // Computed field — the other participant
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
  };
  unreadCount?: number;
  updatedAt: string;
}

// ─── Message ───
export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string | IUser;
  receiver: string;
  content: string;
  media_url?: string;
  media_type?: string;
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

// ─── Suggested User (from /api/users/suggested) ───
export interface ISuggestedUser {
  _id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  followerCount: number;
}

// ─── My Profile (from /api/users/me) ───
export interface IMyProfile extends IUser {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  posts: IPost[];
}
