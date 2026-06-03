import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PostCard } from './PostCard';
import apiClient from '../../services/api';
import { useLangText } from '../../hooks/useLangText';

interface PostDetailModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({ postId, isOpen, onClose, onOpenProfile }) => {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const text = useLangText();

  useEffect(() => {
    if (isOpen && postId) {
      loadPost();
    }
  }, [isOpen, postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/post/${postId}`);
      if (res.data.success || res.data.status === 'success') {
        setPost(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load post', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-xl dark:bg-gray-800 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 z-10 sticky top-0">
          <h2 className="text-xl font-bold dark:text-white">{text('Chi tiết bài viết', 'Post Detail')}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : post ? (
            <PostCard
              post={post}
              onLike={() => {}}
              onCommentCreated={() => {}}
              onShare={() => {}}
              onPostUpdated={(updated) => setPost(updated)}
              onPostDeleted={() => onClose()}
              onOpenProfile={onOpenProfile}
            />
          ) : (
            <div className="text-center text-gray-500 py-10">
              {text('Không tìm thấy bài viết', 'Post not found')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
