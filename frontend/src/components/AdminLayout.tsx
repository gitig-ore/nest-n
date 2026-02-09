"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

type User = {
  id: string;
  nama: string;
  role: string;
};

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  sender?: User;
  receiver?: User;
  loan?: { id: string; barang?: { namaBarang: string } };
  isRead: boolean;
  createdAt: string;
};

type Conversation = {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
};

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Data Master', href: '/barang', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { name: 'Transaksi', href: '/loan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { name: 'Users', href: '/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', adminOnly: true },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showMessages, setShowMessages] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastMessagesFetch = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (showMessages) {
        if (selectedUser) {
          fetchMessages(selectedUser);
        } else {
          fetchConversations();
        }
        fetchUnreadCount();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [showMessages, selectedUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  useEffect(() => {
    if (showMessages && !selectedUser) {
      fetchConversations();
    }
  }, [showMessages]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
    }
  }, [selectedUser]);

  const fetchUnreadCount = async () => {
    try {
      const res = await apiClient.get('/message');
      setUnreadMessages(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch unread messages', err);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/message');
      const allMessages: Message[] = res.data?.messages || [];
      
      const userMap = new Map<string, Conversation>();
      
      allMessages.forEach((msg: Message) => {
        const otherUser = msg.senderId === user?.id ? msg.receiver : msg.sender;
        if (!otherUser) return;
        
        const existing = userMap.get(otherUser.id);
        if (!existing) {
          // Create new conversation
          userMap.set(otherUser.id, {
            userId: otherUser.id,
            userName: otherUser.nama,
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unreadCount: 0,
            messages: [],
          });
        } else {
          // Update existing conversation - only if this message is newer
          const msgTime = new Date(msg.createdAt).getTime();
          const existingTime = new Date(existing.lastMessageTime).getTime();
          if (msgTime > existingTime) {
            existing.lastMessage = msg.content;
            existing.lastMessageTime = msg.createdAt;
          }
        }
      });
      
      const sorted = Array.from(userMap.values()).sort(
        (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      setConversations(sorted);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
      setLoading(false);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    const now = Date.now();
    if (now - lastMessagesFetch.current < 30000 && messages.length > 0) {
      return;
    }

    try {
      const res = await apiClient.get(`/message/conversation/${otherUserId}`);
      const msgs: Message[] = res.data?.messages || [];
      setMessages(msgs);
      lastMessagesFetch.current = now;
      
      // Mark messages as read - messages received by admin (where receiverId === admin id)
      msgs.forEach((msg: Message) => {
        if (msg.receiverId === user?.id && !msg.isRead) {
          markAsRead(msg.id);
        }
      });
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await apiClient.post(`/message/${messageId}/read`);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    
    setSendingMessage(true);
    try {
      await apiClient.post('/message', { 
        content: newMessage,
        receiverId: selectedUser,
      });
      setNewMessage('');
      fetchMessages(selectedUser);
      fetchConversations();
      fetchUnreadCount();
      toast.success('Pesan terkirim');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pesan');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const filteredMenu = menuItems.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center ml-5 h-20 px-4">
          <div className="w-13 h-13 bg-[#0b2140] rounded-md flex items-center justify-center overflow-hidden">
            <img src="/igpp.png" alt="Logo" className="w-15 h-15 object-contain" />
          </div>
          <div className="flex items-center justify-center ml-2">
            <h1 className="ml-3 text-2xl font-bold text-gray-900">IGP-P</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                  isActive ? 'bg-orange-500 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.name}
              </Link>
            );
          })}
        </nav>

       
         
        
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 border-b border-gray-200">
          <div className="flex items-center">
            <div className="relative w-80">
              <h1 className="text-xl font-semibold text-black">
                Dashboard Admin
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Messages Button */}
            <button
              onClick={() => setShowMessages(true)}
              className="relative p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.nama}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {children}
        </main>

        {/* Messages Popup */}
        {showMessages && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pesan dari Peminjam</h2>
                <button
                  onClick={() => {
                    setShowMessages(false);
                    setSelectedUser(null);
                    setMessages([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Conversation List */}
                <div className={`${selectedUser ? 'hidden md:block w-1/3' : 'w-full'} border-r border-gray-100 overflow-y-auto`}>
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>Belum ada percakapan</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.userId}
                        onClick={() => setSelectedUser(conv.userId)}
                        className={`p-4 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          selectedUser === conv.userId ? 'bg-orange-50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <span className="text-orange-600 font-medium">{conv.userName.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{conv.userName}</p>
                              <p className="text-sm text-gray-500 truncate max-w-[150px]">{conv.lastMessage}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{formatTime(conv.lastMessageTime)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Chat Area */}
                {selectedUser ? (
                  <div className="w-full md:w-2/3 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={messagesEndRef}>
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                          <p>Belum ada pesan</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMine = msg.senderId === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                isMine ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'
                              }`}>
                                <p className="text-sm">{msg.content}</p>
                                <p className={`text-xs mt-1 ${isMine ? 'text-orange-100' : 'text-gray-500'}`}>
                                  {formatTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Message Input */}
                    <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Ketik pesan..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || sendingMessage}
                          className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                          {sendingMessage ? '...' : 'Kirim'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="hidden md:flex w-2/3 items-center justify-center text-gray-500">
                    <p>Pilih percakapan untuk melihat pesan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
