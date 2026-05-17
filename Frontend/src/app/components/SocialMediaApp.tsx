import { useState } from "react";
import { Navigation } from "./Navigation";
import { PostFeed } from "./PostFeed";
import { Sidebar } from "./Sidebar";
import { ProfileCard } from "./ProfileCard";
import { ProfileView } from "./ProfileView";
import { NotificationsView } from "./NotificationsView";
import { MessagesView } from "./MessagesView";
import { SearchView } from "./SearchView";
import { SettingsView } from "./SettingsView";
import { CreatePostModal } from "./CreatePostModal";

type ViewType =
  | "feed"
  | "profile"
  | "notifications"
  | "messages"
  | "search"
  | "settings";

export function SocialMediaApp() {
  const [activeView, setActiveView] = useState<ViewType>("feed");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const renderMainContent = () => {
    switch (activeView) {
      case "feed":
        return <PostFeed onCreatePost={() => setIsCreatePostOpen(true)} />;
      case "profile":
        return <ProfileView onEditProfile={() => setActiveView("settings")} />;
      case "notifications":
        return <NotificationsView />;
      case "messages":
        return <MessagesView />;
      case "search":
        return (
          <SearchView
            onOpenProfile={() => setActiveView("profile")}
            onOpenPost={() => setActiveView("feed")}
          />
        );
      case "settings":
        return <SettingsView onViewChange={setActiveView} />;
      default:
        return <PostFeed onCreatePost={() => setIsCreatePostOpen(true)} />;
    }
  };

  const showSidebars = activeView === "feed";

  return (
    <div className="relative size-full overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      <div className="absolute bottom-0 right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-3000"></div>

      {/* Content */}
      <div className="relative z-10 size-full flex flex-col">
        <Navigation
          onViewChange={setActiveView}
          activeView={activeView}
          onCreatePost={() => setIsCreatePostOpen(true)}
        />

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 py-6 h-full">
            {showSidebars ? (
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 h-full">
                {/* Left Sidebar - Profile Card */}
                <div className="hidden lg:block">
                  <ProfileCard onEditProfile={() => setActiveView("profile")} />
                </div>

                {/* Main Content */}
                <div className="h-full overflow-y-auto">
                  {renderMainContent()}
                </div>

                {/* Right Sidebar */}
                <div className="hidden lg:block">
                  <Sidebar
                    onViewAllSuggestions={() => setActiveView("search")}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {renderMainContent()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
      />
    </div>
  );
}
