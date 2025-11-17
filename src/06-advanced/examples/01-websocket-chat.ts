/**
 * WebSocket 聊天室實現
 * 使用 Socket.io 實現實時雙向通信
 *
 * 安裝依賴:
 * npm install socket.io socket.io-client express @types/express
 */

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// ==================== 類型定義 ====================

/**
 * 用戶接口
 */
interface User {
  id: string;
  username: string;
  room: string;
  joinedAt: Date;
}

/**
 * 消息接口
 */
interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  room: string;
  timestamp: Date;
  type: 'text' | 'system' | 'image';
}

/**
 * 房間統計信息
 */
interface RoomStats {
  room: string;
  userCount: number;
  users: User[];
  messageCount: number;
}

/**
 * Socket.io 客戶端到服務器的事件
 */
interface ClientToServerEvents {
  'join-room': (data: { username: string; room: string }) => void;
  'leave-room': () => void;
  'send-message': (message: string) => void;
  'typing': () => void;
  'stop-typing': () => void;
  'get-room-stats': (callback: (stats: RoomStats) => void) => void;
}

/**
 * Socket.io 服務器到客戶端的事件
 */
interface ServerToClientEvents {
  'user-joined': (user: User) => void;
  'user-left': (user: User) => void;
  'new-message': (message: Message) => void;
  'user-typing': (data: { userId: string; username: string }) => void;
  'user-stop-typing': (data: { userId: string }) => void;
  'room-stats': (stats: RoomStats) => void;
  'error': (error: { message: string }) => void;
}

/**
 * Socket 間共享數據
 */
interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket 數據
 */
interface SocketData {
  user: User;
}

// ==================== 聊天室管理器 ====================

/**
 * 聊天室管理器類
 * 管理用戶、消息和房間
 */
class ChatRoomManager {
  private users: Map<string, User> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map();

  /**
   * 添加用戶到房間
   */
  addUser(socketId: string, username: string, room: string): User {
    const user: User = {
      id: socketId,
      username,
      room,
      joinedAt: new Date()
    };

    this.users.set(socketId, user);

    // 初始化房間消息數組
    if (!this.messages.has(room)) {
      this.messages.set(room, []);
    }

    return user;
  }

  /**
   * 移除用戶
   */
  removeUser(socketId: string): User | undefined {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      // 清理打字狀態
      this.removeTypingUser(user.room, socketId);
    }
    return user;
  }

  /**
   * 獲取用戶
   */
  getUser(socketId: string): User | undefined {
    return this.users.get(socketId);
  }

  /**
   * 獲取房間內的所有用戶
   */
  getRoomUsers(room: string): User[] {
    return Array.from(this.users.values()).filter(user => user.room === room);
  }

  /**
   * 添加消息
   */
  addMessage(message: Message): void {
    const roomMessages = this.messages.get(message.room) || [];
    roomMessages.push(message);

    // 保留最近 100 條消息
    if (roomMessages.length > 100) {
      roomMessages.shift();
    }

    this.messages.set(message.room, roomMessages);
  }

  /**
   * 獲取房間消息歷史
   */
  getRoomMessages(room: string, limit: number = 50): Message[] {
    const messages = this.messages.get(room) || [];
    return messages.slice(-limit);
  }

  /**
   * 設置用戶正在打字
   */
  setTyping(room: string, userId: string): void {
    if (!this.typingUsers.has(room)) {
      this.typingUsers.set(room, new Set());
    }
    this.typingUsers.get(room)!.add(userId);
  }

  /**
   * 移除用戶打字狀態
   */
  removeTypingUser(room: string, userId: string): void {
    const roomTyping = this.typingUsers.get(room);
    if (roomTyping) {
      roomTyping.delete(userId);
    }
  }

  /**
   * 獲取房間統計信息
   */
  getRoomStats(room: string): RoomStats {
    const users = this.getRoomUsers(room);
    const messages = this.messages.get(room) || [];

    return {
      room,
      userCount: users.length,
      users,
      messageCount: messages.length
    };
  }
}

// ==================== Socket.io 服務器設置 ====================

/**
 * 創建並配置 WebSocket 聊天服務器
 */
export function createChatServer(port: number = 3000) {
  const app = express();
  const httpServer = createServer(app);

  // 創建 Socket.io 服務器，帶類型支持
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    // 連接配置
    pingTimeout: 60000,
    pingInterval: 25000
  });

  const chatManager = new ChatRoomManager();

  // 提供簡單的 HTML 客戶端
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>聊天室</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          #messages { border: 1px solid #ccc; height: 400px; overflow-y: scroll; padding: 10px; margin-bottom: 10px; }
          .message { margin: 5px 0; padding: 5px; }
          .system { color: #999; font-style: italic; }
          .typing { color: #666; font-size: 12px; }
          input, button { padding: 10px; margin: 5px; }
          input[type="text"] { width: 60%; }
        </style>
      </head>
      <body>
        <h1>Socket.io 聊天室</h1>
        <div id="login">
          <input type="text" id="username" placeholder="輸入用戶名" />
          <input type="text" id="room" placeholder="房間名稱" value="general" />
          <button onclick="joinRoom()">加入聊天室</button>
        </div>
        <div id="chat" style="display: none;">
          <div id="room-info"></div>
          <div id="messages"></div>
          <div id="typing-indicator" class="typing"></div>
          <input type="text" id="message-input" placeholder="輸入消息..." />
          <button onclick="sendMessage()">發送</button>
          <button onclick="leaveRoom()">離開房間</button>
        </div>

        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          let currentRoom = '';

          function joinRoom() {
            const username = document.getElementById('username').value;
            const room = document.getElementById('room').value;
            if (username && room) {
              socket.emit('join-room', { username, room });
              currentRoom = room;
              document.getElementById('login').style.display = 'none';
              document.getElementById('chat').style.display = 'block';
            }
          }

          function sendMessage() {
            const input = document.getElementById('message-input');
            if (input.value) {
              socket.emit('send-message', input.value);
              input.value = '';
              socket.emit('stop-typing');
            }
          }

          function leaveRoom() {
            socket.emit('leave-room');
            document.getElementById('login').style.display = 'block';
            document.getElementById('chat').style.display = 'none';
            document.getElementById('messages').innerHTML = '';
          }

          // 監聽消息
          socket.on('new-message', (message) => {
            const div = document.createElement('div');
            div.className = 'message ' + message.type;
            div.textContent = \`[\${new Date(message.timestamp).toLocaleTimeString()}] \${message.username}: \${message.content}\`;
            document.getElementById('messages').appendChild(div);
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
          });

          socket.on('user-joined', (user) => {
            const div = document.createElement('div');
            div.className = 'message system';
            div.textContent = \`\${user.username} 加入了聊天室\`;
            document.getElementById('messages').appendChild(div);
          });

          socket.on('user-left', (user) => {
            const div = document.createElement('div');
            div.className = 'message system';
            div.textContent = \`\${user.username} 離開了聊天室\`;
            document.getElementById('messages').appendChild(div);
          });

          // 打字指示器
          let typingTimeout;
          document.getElementById('message-input').addEventListener('input', (e) => {
            if (e.target.value) {
              socket.emit('typing');
              clearTimeout(typingTimeout);
              typingTimeout = setTimeout(() => {
                socket.emit('stop-typing');
              }, 1000);
            }
          });

          socket.on('user-typing', (data) => {
            document.getElementById('typing-indicator').textContent = \`\${data.username} 正在輸入...\`;
          });

          socket.on('user-stop-typing', () => {
            document.getElementById('typing-indicator').textContent = '';
          });

          // Enter 鍵發送
          document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
          });
        </script>
      </body>
      </html>
    `);
  });

  // ==================== Socket.io 事件處理 ====================

  /**
   * 連接事件
   */
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    console.log(`✅ 新用戶連接: ${socket.id}`);

    /**
     * 加入房間
     */
    socket.on('join-room', ({ username, room }) => {
      try {
        // 添加用戶
        const user = chatManager.addUser(socket.id, username, room);
        socket.data.user = user;

        // 加入 Socket.io 房間
        socket.join(room);

        // 發送歡迎消息
        const welcomeMessage: Message = {
          id: `${Date.now()}-welcome`,
          userId: 'system',
          username: '系統',
          content: `歡迎 ${username} 加入 ${room} 聊天室！`,
          room,
          timestamp: new Date(),
          type: 'system'
        };

        socket.emit('new-message', welcomeMessage);

        // 通知其他用戶
        socket.to(room).emit('user-joined', user);

        // 發送歷史消息
        const history = chatManager.getRoomMessages(room);
        history.forEach(msg => socket.emit('new-message', msg));

        console.log(`👤 ${username} 加入房間: ${room}`);
      } catch (error) {
        socket.emit('error', { message: '加入房間失敗' });
      }
    });

    /**
     * 發送消息
     */
    socket.on('send-message', (content) => {
      const user = socket.data.user;
      if (!user) {
        socket.emit('error', { message: '請先加入房間' });
        return;
      }

      const message: Message = {
        id: `${Date.now()}-${socket.id}`,
        userId: user.id,
        username: user.username,
        content,
        room: user.room,
        timestamp: new Date(),
        type: 'text'
      };

      // 保存消息
      chatManager.addMessage(message);

      // 廣播消息到房間
      io.to(user.room).emit('new-message', message);

      console.log(`💬 [${user.room}] ${user.username}: ${content}`);
    });

    /**
     * 正在打字
     */
    socket.on('typing', () => {
      const user = socket.data.user;
      if (user) {
        chatManager.setTyping(user.room, user.id);
        socket.to(user.room).emit('user-typing', {
          userId: user.id,
          username: user.username
        });
      }
    });

    /**
     * 停止打字
     */
    socket.on('stop-typing', () => {
      const user = socket.data.user;
      if (user) {
        chatManager.removeTypingUser(user.room, user.id);
        socket.to(user.room).emit('user-stop-typing', { userId: user.id });
      }
    });

    /**
     * 獲取房間統計
     */
    socket.on('get-room-stats', (callback) => {
      const user = socket.data.user;
      if (user) {
        const stats = chatManager.getRoomStats(user.room);
        callback(stats);
      }
    });

    /**
     * 離開房間
     */
    socket.on('leave-room', () => {
      const user = socket.data.user;
      if (user) {
        socket.leave(user.room);
        socket.to(user.room).emit('user-left', user);
        chatManager.removeUser(socket.id);
        console.log(`👋 ${user.username} 離開房間: ${user.room}`);
      }
    });

    /**
     * 斷開連接
     */
    socket.on('disconnect', () => {
      const user = chatManager.removeUser(socket.id);
      if (user) {
        socket.to(user.room).emit('user-left', user);
        console.log(`❌ ${user.username} 斷開連接`);
      }
    });
  });

  // 啟動服務器
  httpServer.listen(port, () => {
    console.log(`🚀 聊天服務器運行在 http://localhost:${port}`);
  });

  return { app, httpServer, io, chatManager };
}

// ==================== 最佳實踐和常見陷阱 ====================

/**
 * 🎯 最佳實踐:
 *
 * 1. 類型安全
 *    - 使用 TypeScript 泛型定義 Socket.io 事件
 *    - 明確定義所有接口和類型
 *
 * 2. 命名空間
 *    - 使用命名空間分隔不同的功能
 *    - 例如: io.of('/admin'), io.of('/chat')
 *
 * 3. 房間管理
 *    - 合理使用房間功能分組用戶
 *    - 及時清理空房間
 *
 * 4. 認證和授權
 *    - 在連接時驗證用戶身份
 *    - 使用中間件處理認證
 *
 * 5. 錯誤處理
 *    - 捕獲並處理所有可能的錯誤
 *    - 向客戶端返回友好的錯誤消息
 *
 * 6. 性能優化
 *    - 限制消息大小
 *    - 實現消息限流
 *    - 使用 Redis adapter 實現水平擴展
 *
 * ⚠️ 常見陷阱:
 *
 * 1. 內存洩漏
 *    - 忘記清理斷開連接的用戶數據
 *    - 消息歷史無限增長
 *
 * 2. 廣播風暴
 *    - 過度使用 io.emit() 廣播到所有客戶端
 *    - 應該使用房間或特定用戶發送
 *
 * 3. 缺少驗證
 *    - 沒有驗證消息內容
 *    - 沒有限制消息頻率
 *
 * 4. 同步操作
 *    - 在事件處理器中使用同步操作阻塞事件循環
 *    - 應該使用異步操作
 *
 * 5. 沒有心跳機制
 *    - 沒有配置 pingTimeout 和 pingInterval
 *    - 導致死連接無法及時清理
 */

// ==================== 使用示例 ====================

if (require.main === module) {
  // 創建聊天服務器
  const server = createChatServer(3000);

  // 優雅關閉
  process.on('SIGTERM', () => {
    console.log('📴 收到 SIGTERM 信號，正在關閉服務器...');
    server.httpServer.close(() => {
      console.log('✅ 服務器已關閉');
      process.exit(0);
    });
  });
}

/**
 * 進階功能示例:
 *
 * 1. 私聊功能
 * socket.on('private-message', ({ toUserId, message }) => {
 *   io.to(toUserId).emit('private-message', {
 *     from: socket.data.user.username,
 *     message
 *   });
 * });
 *
 * 2. 文件分享
 * socket.on('share-file', (fileData) => {
 *   // 處理文件上傳
 *   socket.to(user.room).emit('file-shared', fileData);
 * });
 *
 * 3. 在線狀態
 * socket.on('status-change', (status) => {
 *   socket.to(user.room).emit('user-status', {
 *     userId: socket.id,
 *     status
 *   });
 * });
 *
 * 4. Redis Adapter (多服務器)
 * import { createAdapter } from '@socket.io/redis-adapter';
 * import { createClient } from 'redis';
 *
 * const pubClient = createClient({ host: 'localhost', port: 6379 });
 * const subClient = pubClient.duplicate();
 *
 * io.adapter(createAdapter(pubClient, subClient));
 */
