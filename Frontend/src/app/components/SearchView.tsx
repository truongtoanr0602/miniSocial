import { useState, useEffect, useCallback, useDeferredValue } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "../../services/api";
import type { IUser, IPost } from "../../types/models";

interface SearchResults {
  users: IUser[];
  posts: (IPost & { author_id: IUser })[];
}

interface SearchViewProps {
  onOpenProfile?: () => void;
  onOpenPost?: () => void;
}

export function SearchView({ onOpenProfile, onOpenPost }: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const deferredQuery = useDeferredValue(searchQuery);

  // Gọi API tìm kiếm thật
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await apiClient.get(
        `/search?q=${encodeURIComponent(query)}`,
      );
      const data = response.data.data || response.data;
      setResults({
        users: data.users || [],
        posts: data.posts || [],
      });
      setHasSearched(true);
    } catch (err) {
      console.error("Lỗi tìm kiếm:", err);
      setResults({ users: [], posts: [] });
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setResults(null);
      setHasSearched(false);
    }
  };

  useEffect(() => {
    const query = deferredQuery.trim();
    if (query.length >= 2) {
      performSearch(query);
      return;
    }
    if (!query) {
      setResults(null);
      setHasSearched(false);
    }
  }, [deferredQuery, performSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setResults(null);
    setHasSearched(false);
  };

  const totalResults =
    (results?.users?.length || 0) + (results?.posts?.length || 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        {/* Search Header */}
        <div className="p-6 border-b border-gray-100">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tìm kiếm người dùng, bài viết, hashtag..."
                className="w-full pl-12 pr-12 py-3 bg-gray-100 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="p-6">
          {/* Loading */}
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
              <span className="ml-2 text-gray-500">Đang tìm kiếm...</span>
            </div>
          ) : !hasSearched ? (
            /* Default state — hướng dẫn tìm kiếm */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Tìm kiếm trên Social Mini
              </h3>
              <p className="text-sm text-gray-600">
                Nhập tên người dùng, nội dung bài viết hoặc hashtag để tìm kiếm
              </p>
            </div>
          ) : totalResults === 0 ? (
            /* No results */
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Không tìm thấy kết quả
              </h3>
              <p className="text-sm text-gray-600">
                Thử tìm kiếm với từ khóa khác
              </p>
            </div>
          ) : (
            /* Search Results — dữ liệu thật */
            <div className="space-y-8">
              {/* Users */}
              {results && results.users.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Người dùng ({results.users.length})
                  </h3>
                  <div className="space-y-2">
                    {results.users.map((user) => {
                      const avatar =
                        user.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.username)}&background=7c3aed&color=fff`;
                      return (
                        <div
                          key={user._id}
                          onClick={() => {
                            if (onOpenProfile) {
                              onOpenProfile();
                              return;
                            }
                            toast.info(
                              "Tính năng xem hồ sơ chi tiết đang được cập nhật.",
                            );
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <img
                            src={avatar}
                            alt={user.display_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {user.display_name}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              @{user.username}
                              {user.bio ? ` • ${user.bio}` : ""}
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-600 rounded-full">
                            {user.followers?.length || 0} người theo dõi
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Posts */}
              {results && results.posts.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Bài viết ({results.posts.length})
                  </h3>
                  <div className="space-y-2">
                    {results.posts.map((post) => {
                      const author =
                        typeof post.author_id === "object"
                          ? post.author_id
                          : null;
                      const authorName =
                        author?.display_name ||
                        author?.username ||
                        "Người dùng";
                      const firstMedia = post.media?.[0];
                      return (
                        <div
                          key={post._id}
                          onClick={() => {
                            if (onOpenPost) {
                              onOpenPost();
                              return;
                            }
                            toast.info(
                              "Tính năng mở bài viết chi tiết đang được cập nhật.",
                            );
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        >
                          {firstMedia ? (
                            <img
                              src={firstMedia.url}
                              alt="Post"
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-xl">📝</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {post.content?.substring(0, 60) || "Bài viết"}
                              {(post.content?.length || 0) > 60 ? "..." : ""}
                            </h4>
                            <p className="text-sm text-gray-600 truncate">
                              {authorName} • {post.stats?.likes || 0} lượt thích
                            </p>
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            Bài viết
                          </span>
                        </div>
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
