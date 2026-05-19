import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Loader2, MessageCircle, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../services/api";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import type { IPost, IUser } from "../../types/models";

interface SearchResults {
  users: IUser[];
  posts: (IPost & { author_id: IUser })[];
}

interface SearchViewProps {
  onOpenProfile?: (userId?: string) => void;
  onOpenPost?: () => void;
  onStartConversation?: (conversationId: string) => void;
}

function avatarFor(user: Pick<IUser, "display_name" | "username" | "avatar_url">) {
  return (
    user.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`
  );
}

export function SearchView({ onOpenProfile, onOpenPost, onStartConversation }: SearchViewProps) {
  const currentUser = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery);

  const performSearch = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiClient.get(`/search?q=${encodeURIComponent(trimmedQuery)}`);
      const data = response.data.data || response.data;
      setResults({ users: data.users || [], posts: data.posts || [] });
      setHasSearched(true);
    } catch (err) {
      console.error("Search failed:", err);
      setResults({ users: [], posts: [] });
      setHasSearched(true);
      toast.error("Không thể tìm kiếm lúc này.");
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const query = deferredQuery.trim();
    if (query.length >= 2) {
      void performSearch(query);
      return;
    }
    if (!query) {
      setResults(null);
      setHasSearched(false);
    }
  }, [deferredQuery, performSearch]);

  const handleStartConversation = useCallback(
    async (userId: string) => {
      if (!userId || userId === currentUser?._id) return;
      try {
        const response = await apiClient.post(`/conversations/${userId}`);
        const conversationId = response.data.data?._id;
        if (!conversationId) {
          toast.error("Không thể tạo cuộc trò chuyện.");
          return;
        }
        onStartConversation?.(conversationId);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Không thể bắt đầu nhắn tin.");
      }
    },
    [currentUser?._id, onStartConversation],
  );

  const clearSearch = () => {
    setSearchQuery("");
    setResults(null);
    setHasSearched(false);
  };

  const totalResults = (results?.users?.length || 0) + (results?.posts?.length || 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void performSearch(searchQuery);
            }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm kiếm người dùng, bài viết, hashtag..."
                className="w-full pl-12 pr-12 py-3 bg-gray-100 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="p-6">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-500">Đang tìm kiếm...</span>
            </div>
          ) : !hasSearched ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Tìm kiếm trên Social Mini</h3>
              <p className="text-sm text-gray-600">
                Nhập tên người dùng, nội dung bài viết hoặc hashtag để tìm kiếm.
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Không tìm thấy kết quả</h3>
              <p className="text-sm text-gray-600">Thử tìm kiếm với từ khóa khác.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {results?.users.length ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Người dùng ({results.users.length})
                  </h3>
                  <div className="space-y-2">
                    {results.users.map((user) => {
                      const isCurrentUser = user._id === currentUser?._id;
                      return (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => onOpenProfile?.(isCurrentUser ? undefined : user._id)}
                          className="flex w-full items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          <img src={avatarFor(user)} alt={user.display_name} className="w-12 h-12 rounded-full object-cover" />
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-gray-900 truncate">{user.display_name}</span>
                            <span className="block text-sm text-gray-600 truncate">
                              @{user.username}
                              {user.bio ? ` - ${user.bio}` : ""}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-600 rounded-full">
                              {user.followers?.length || 0} followers
                            </span>
                            {isCurrentUser ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                                <UserPlus className="h-3.5 w-3.5" />
                                Bạn
                              </span>
                            ) : (
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleStartConversation(user._id);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.stopPropagation();
                                    void handleStartConversation(user._id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Nhắn tin
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {results?.posts.length ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Bài viết ({results.posts.length})
                  </h3>
                  <div className="space-y-2">
                    {results.posts.map((post) => {
                      const author = typeof post.author_id === "object" ? post.author_id : null;
                      const authorName = author?.display_name || author?.username || "Người dùng";
                      const firstMedia = post.media?.[0];
                      return (
                        <button
                          key={post._id}
                          type="button"
                          onClick={onOpenPost}
                          className="flex w-full items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                        >
                          {firstMedia ? (
                            <img src={firstMedia.url} alt="Post" className="w-12 h-12 rounded-lg object-cover" />
                          ) : (
                            <span className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center text-lg">
                              #
                            </span>
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-gray-900 truncate">
                              {post.content?.substring(0, 60) || "Bài viết"}
                              {(post.content?.length || 0) > 60 ? "..." : ""}
                            </span>
                            <span className="block text-sm text-gray-600 truncate">
                              {authorName} - {post.stats?.likes || 0} lượt thích
                            </span>
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            Bài viết
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
