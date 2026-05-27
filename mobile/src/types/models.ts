// ──────────────────────────────────────────
// Shared Types — đồng bộ với Backend models
// ──────────────────────────────────────────

export interface IUser {
  _id: string;
  username: string;
  email?: string;
  phone_number?: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  location?: string;
  website?: string;
  following: string[];
  followers: string[];
  settings: {
    language: string;
    privacy: "public" | "friends" | "private";
    two_factor_enable: boolean;
  };
  status: "active" | "locked" | "pending";
  created_at: string;
  updated_at: string;
}

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

export interface IComment {
  _id: string;
  post_id: string;
  author_id: IUser | string;
  parent_id: string | null;
  content: string;
  stats: {
    likes: number;
    replies: number;
    is_deleted: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface INotification {
  _id: string;
  recipient_id: string;
  sender_id: IUser | string | null;
  type: "like" | "comment" | "follow" | "mention" | "system";
  target_id?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface IConversation {
  _id: string;
  partner: IUser | null;
  lastMessage: IMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: IUser | string;
  receiverId: string;
  content: string;
  messageType: "text" | "image" | "file";
  mediaUrl?: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface IFollow {
  _id: string;
  follower_id: string;
  following_id: string;
  status: "pending" | "accepted";
  created_at: string;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}
