import { useState, useCallback, useDeferredValue } from "react";
import { Search, TrendingUp, Clock, X, Loader2 } from "lucide-react";
import apiClient from "../../services/api";

interface SearchResult {
  id: string;
  type: "user" | "post" | "hashtag";
  title: string;
  subtitle?: string;
  image?: string;
  avatar?: string;
}

const trendingTopics = [
  { id: "1", tag: "ReactJS", posts: "125K bài viết" },
  { id: "2", tag: "WebDevelopment", posts: "89K bài viết" },
  { id: "3", tag: "TailwindCSS", posts: "67K bài viết" },
  { id: "4", tag: "TypeScript", posts: "54K bài viết" },
  { id: "5", tag: "AI", posts: "203K bài viết" },
  { id: "6", tag: "Design", posts: "156K bài viết" },
];

export function SearchView() {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("recentSearches") || "[]");
    } catch {
      return [];
    }
  });

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsLoading(true);

    try {
      const response = await apiClient.get(`/search?query=${encodeURIComponent(query)}`);
      const data = response.data.data;

      // Normalize kết quả từ backend
      const results: SearchResult[] = [];

      // Users
      const users = data?.users || data?.results?.users || [];
      users.forEach((u: any) => {
        results.push({
          id: u._id,
          type: "user",
          title: u.display_name || u.username,
          subtitle: `@${u.username}`,
          avatar: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.display_name || u.username)}&background=7c3aed&color=fff`,
        });
      });

      // Posts
      const posts = data?.posts || data?.results?.posts || [];
      posts.forEach((p: any) => {
        const author = p.author_id || {};
        results.push({
          id: p._id,
          type: "post",
          title: p.content?.substring(0, 80) || "Bài viết",
          subtitle: `${author.display_name || author.username || "Ẩn danh"} • ${p.likes_count || 0} lượt thích`,
          image: p.media_urls?.[0],
        });
      });

      setSearchResults(results);

      // Lưu vào recent searches
      if (query.trim()) {
        setRecentSearches((prev) => {
          const updated = [query, ...prev.filter((s) => s !== query)].slice(0, 6);
          localStorage.setItem("recentSearches", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error("Lỗi tìm kiếm:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search via deferredValue
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        performSearch(query.trim());
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    },
    [performSearch],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const handleRemoveRecentSearch = useCallback((search: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== search);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleClearAllRecent = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
        {/* Search Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm kiếm người dùng, bài viết, hashtag..."
              className="w-full pl-12 pr-12 py-3 bg-gray-100 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            {searchQuery ? (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="p-6">
          {!isSearching ? (
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 ? (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Tìm kiếm gần đây</h3>
                    <button
                      onClick={handleClearAllRecent}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <div
                        key={`${search}-${index}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSearch(search)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearch(search);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-700">{search}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRecentSearch(search);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-all"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Trending Topics */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Xu hướng</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trendingTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 rounded-xl cursor-pointer transition-all group"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSearch(topic.tag)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch(topic.tag);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                            #{topic.tag}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{topic.posts}</p>
                        </div>
                        <TrendingUp className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Loading */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  <span className="ml-2 text-gray-500">Đang tìm kiếm...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Kết quả tìm kiếm ({searchResults.length})
                  </h3>
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {result.type === "user" && result.avatar ? (
                          <img
                            src={result.avatar}
                            alt={result.title}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : null}
                        {result.type === "post" && result.image ? (
                          <img
                            src={result.image}
                            alt={result.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : null}
                        {result.type === "post" && !result.image ? (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg">📝</span>
                          </div>
                        ) : null}
                        {result.type === "hashtag" ? (
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl font-bold text-purple-600">#</span>
                          </div>
                        ) : null}

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{result.title}</h4>
                          {result.subtitle ? (
                            <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                          ) : null}
                        </div>

                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                          {result.type === "user" ? "Người dùng" : null}
                          {result.type === "post" ? "Bài viết" : null}
                          {result.type === "hashtag" ? "Hashtag" : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Không tìm thấy kết quả</h3>
                  <p className="text-sm text-gray-600">Thử tìm kiếm với từ khóa khác</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
