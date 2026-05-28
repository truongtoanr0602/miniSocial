// ──────────────────────────────────────────
// API endpoint constants
// ──────────────────────────────────────────

export const ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  GOOGLE_LOGIN: "/auth/google",
  SEND_PHONE_OTP: "/auth/sendPhoneOtp",
  VERIFY_PHONE_OTP: "/auth/verifyPhoneOtp",
  SEND_EMAIL_OTP: "/auth/sendEmailOtp",
  VERIFY_EMAIL_OTP: "/auth/verifyEmailOtp",
  RESET_PASSWORD: "/auth/resetPassword",

  // Users
  MY_PROFILE: "/users/me",
  USER_PROFILE: (id: string) => `/users/profile/${id}`,
  UPDATE_PROFILE: "/users/update",
  SUGGESTED_USERS: "/users/suggested",

  // Follow (using followController via userRoutes)
  TOGGLE_FOLLOW: (targetId: string) => `/users/follow/${targetId}`,

  // Follow (using followController routes)
  FOLLOW_STATUS: (targetId: string) => `/follow/status/${targetId}`,
  FOLLOWERS: (userId: string) => `/follow/${userId}/followers`,
  FOLLOWING: (userId: string) => `/follow/${userId}/following`,
  FOLLOW_COUNTS: (userId: string) => `/follow/${userId}/counts`,
  PENDING_REQUESTS: "/follow/requests/pending",
  ACCEPT_REQUEST: (requestId: string) => `/follow/requests/${requestId}/accept`,
  REJECT_REQUEST: (requestId: string) => `/follow/requests/${requestId}/reject`,
  BLOCK_USER: (targetId: string) => `/follow/block/${targetId}`,

  // Posts
  FEED: "/post/feed",
  EXPLORE: "/post/explore",
  POST_DETAIL: (postId: string) => `/post/${postId}`,
  CREATE_POST: "/post/createPost",
  UPDATE_POST: (postId: string) => `/post/${postId}`,
  DELETE_POST: (postId: string) => `/post/${postId}`,
  REACT_POST: (postId: string) => `/post/${postId}/react`,
  SHARE_POST: (postId: string) => `/post/${postId}/share`,

  // Comments
  POST_COMMENTS: (postId: string) => `/post/${postId}/comments`,
  COMMENT_REPLIES: (postId: string, commentId: string) =>
    `/post/${postId}/comments/${commentId}/replies`,
  DELETE_COMMENT: (postId: string, commentId: string) =>
    `/post/${postId}/comments/${commentId}`,

  // Notifications
  NOTIFICATIONS: "/notifications",
  NOTIFICATION_READ: (id: string) => `/notifications/${id}/read`,
  NOTIFICATION_READ_ALL: "/notifications/read-all",
  NOTIFICATION_UNREAD_COUNT: "/notifications/unread-count",
  NOTIFICATION_DELETE: (id: string) => `/notifications/${id}`,

  // Conversations
  CONVERSATIONS: "/conversations",
  CREATE_CONVERSATION: (receiverId: string) => `/conversations/${receiverId}`,
  MESSAGES: (conversationId: string) =>
    `/conversations/${conversationId}/messages`,
  MESSAGE_UPLOAD: (conversationId: string) =>
    `/conversations/${conversationId}/messages/upload`,
  MARK_READ: (conversationId: string) =>
    `/conversations/${conversationId}/read`,
  DELETE_MESSAGE: (conversationId: string, messageId: string) =>
    `/conversations/${conversationId}/messages/${messageId}`,

  // Search
  SEARCH: "/search",

  // Reports
  REPORT: "/report",
} as const;
