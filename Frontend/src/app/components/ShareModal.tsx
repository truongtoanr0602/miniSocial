import React, { useState, useEffect } from 'react';
import { Share, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api';

interface ShareModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ postId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'message' | 'repost'>('message');
  const [conversations, setConversations] = useState<any[]>([]);
  const [repostCaption, setRepostCaption] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'message') {
      fetchConversations();
    }
  }, [isOpen, activeTab]);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/conversations');
      const data = res.data;
      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendToMessage = async (conversationId: string) => {
    try {
      setLoading(true);
      const res = await apiClient.post(`/conversations/${conversationId}/messages`, {
        messageType: 'shared_post',
        sharedPostId: postId,
        content: 'Vừa chia sẻ một bài viết!'
      });
      
      const data = res.data;
      if (data.success) {
        toast.success('Đã gửi tin nhắn thành công');
        onClose();
      } else {
        toast.error('Gửi tin nhắn thất bại');
      }
    } catch (e) {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleRepostToFeed = async () => {
    try {
      setLoading(true);
      const res = await apiClient.post(`/post/${postId}/repost`, {
        content: repostCaption
      });
      
      const data = res.data;
      if (data.success || res.status === 200 || res.status === 201) {
        toast.success('Đã chia sẻ lên tường nhà bạn');
        onClose();
      } else {
        toast.error('Chia sẻ thất bại');
      }
    } catch (e) {
      toast.error('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">Chia sẻ</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b dark:border-gray-700">
          <button
            className={`flex-1 pb-2 font-medium flex items-center justify-center gap-2 ${activeTab === 'message' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('message')}
          >
            <MessageCircle size={18} /> Gửi tin nhắn
          </button>
          <button
            className={`flex-1 pb-2 font-medium flex items-center justify-center gap-2 ${activeTab === 'repost' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
            onClick={() => setActiveTab('repost')}
          >
            <Share size={18} /> Lên tường
          </button>
        </div>

        {activeTab === 'message' ? (
          <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {conversations.length === 0 ? (
              <p className="text-center text-gray-500">Không có cuộc trò chuyện nào.</p>
            ) : (
              conversations.map((conv) => (
                <div key={conv._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <img src={conv.partner?.avatar_url || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                    <span className="font-medium dark:text-dark">{conv.partner?.display_name || 'Người dùng'}</span>
                  </div>
                  <button
                    disabled={loading}
                    onClick={() => handleSendToMessage(conv._id)}
                    className="flex items-center justify-center p-2 text-white bg-primary rounded-full hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <textarea
              placeholder="Bạn đang nghĩ gì về bài viết này?"
              className="w-full p-4 border rounded-xl resize-none focus:ring-2 focus:ring-primary/50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={4}
              value={repostCaption}
              onChange={(e) => setRepostCaption(e.target.value)}
            />
            <button
              disabled={loading}
              onClick={handleRepostToFeed}
              className="w-full py-3 text-white font-medium bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Chia sẻ ngay'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
