import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../api/config';

interface ShareBottomSheetProps {
  postId: string;
  isVisible: boolean;
  onClose: () => void;
  token: string; 
}

export const ShareBottomSheet: React.FC<ShareBottomSheetProps> = ({ postId, isVisible, onClose, token }) => {
  const [activeTab, setActiveTab] = useState<'message' | 'repost'>('message');
  const [conversations, setConversations] = useState<any[]>([]);
  const [repostCaption, setRepostCaption] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && activeTab === 'message') {
      fetchConversations();
    }
  }, [isVisible, activeTab]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
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
      const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messageType: 'shared_post',
          sharedPostId: postId,
          content: 'Vừa chia sẻ một bài viết!'
        })
      });
      
      const data = await res.json();
      if (data.success) {
        Alert.alert('Thành công', 'Đã gửi tin nhắn thành công');
        onClose();
      } else {
        Alert.alert('Thất bại', 'Gửi tin nhắn thất bại');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleRepostToFeed = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/post/${postId}/repost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: repostCaption
        })
      });
      
      const data = await res.json();
      if (data.success || res.ok) {
        Alert.alert('Thành công', 'Đã chia sẻ lên tường nhà bạn');
        onClose();
      } else {
        Alert.alert('Thất bại', 'Chia sẻ thất bại');
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Chia sẻ</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'message' && styles.activeTab]} 
              onPress={() => setActiveTab('message')}
            >
              <Text style={[styles.tabText, activeTab === 'message' && styles.activeTabText]}>Gửi tin nhắn</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'repost' && styles.activeTab]} 
              onPress={() => setActiveTab('repost')}
            >
              <Text style={[styles.tabText, activeTab === 'repost' && styles.activeTabText]}>Lên tường</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'message' ? (
            <View style={styles.contentContainer}>
              {conversations.length === 0 ? (
                <Text style={styles.emptyText}>Không có cuộc trò chuyện nào.</Text>
              ) : (
                <FlatList
                  data={conversations}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => (
                    <View style={styles.conversationItem}>
                      <Text style={styles.partnerName}>{item.partner?.display_name || 'Người dùng'}</Text>
                      <TouchableOpacity 
                        style={styles.sendButton} 
                        disabled={loading}
                        onPress={() => handleSendToMessage(item._id)}
                      >
                        <Text style={styles.sendButtonText}>Gửi</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          ) : (
            <View style={styles.contentContainer}>
              <TextInput
                style={styles.input}
                placeholder="Bạn đang nghĩ gì về bài viết này?"
                multiline
                numberOfLines={4}
                value={repostCaption}
                onChangeText={setRepostCaption}
              />
              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.disabled]} 
                disabled={loading}
                onPress={handleRepostToFeed}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Chia sẻ ngay</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeText: {
    fontSize: 20,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6', // Primary color
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
