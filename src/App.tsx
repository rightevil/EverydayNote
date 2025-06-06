import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { TabBar, Button, Input, Toast, Image, Space, DotLoading, PullToRefresh } from 'antd-mobile';
import { AppOutline, SendOutline, TeamOutline, UserOutline, SmileOutline, PictureOutline, VideoOutline } from 'antd-mobile-icons';
import { useEffect, useState, useRef } from 'react';
import { openDB } from 'idb';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import './App.css';
import { syncService } from './services/sync';
import { apiService } from './api';

// 简单 emoji 列表
const emojiList = ['😀', '😂', '😍', '🥰', '😎', '😭', '👍', '🎉', '❤️', '🌟'];

// IndexedDB 初始化
const dbPromise = openDB('everyday-note', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('notes')) {
      db.createObjectStore('notes', { keyPath: 'date' });
    }
  },
});

function OneSentence() {
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('');
  const [media, setMedia] = useState<{ type: 'image' | 'video'; url: string }[]>([]);
  const [saved, setSaved] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  // 读取当天内容
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const db = await dbPromise;
        const note = await db.get('notes', today);
        if (note) {
          setSaved(note);
          setText(note.text || '');
          setEmoji(note.emoji || '');
          setMedia(note.media || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [today]);

  // 选择图片/视频
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr: { type: 'image' | 'video'; url: string }[] = [];
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      if (file.type.startsWith('image/')) {
        arr.push({ type: 'image', url });
      } else if (file.type.startsWith('video/')) {
        arr.push({ type: 'video', url });
      }
    });
    setMedia([...media, ...arr]);
    e.target.value = '';
  };

  // 保存到本地
  const handleSave = async () => {
    setLoading(true);
    try {
      const db = await dbPromise;
      await db.put('notes', {
        date: today,
        text,
        emoji,
        media,
      });
      setSaved({ date: today, text, emoji, media });
      Toast.show({ icon: 'success', content: '保存成功' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: '保存失败' });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    const db = await dbPromise;
    const note = await db.get('notes', today);
    if (note) {
      setSaved(note);
      setText(note.text || '');
      setEmoji(note.emoji || '');
      setMedia(note.media || []);
    }
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 16, color: '#333' }}>记录今天的一句话</h3>
        <Input
          placeholder="写下今天的心情..."
          value={text}
          onChange={val => setText(val)}
          clearable
          maxLength={100}
          style={{ background: '#f7f8fa' }}
        />
        <div style={{ margin: '12px 0' }}>
          <Space wrap>
            {emojiList.map(e => (
              <span
                key={e}
                style={{
                  fontSize: 24,
                  cursor: 'pointer',
                  border: emoji === e ? '2px solid #1677ff' : '1px solid #eee',
                  borderRadius: 4,
                  padding: 4,
                  transition: 'all 0.3s',
                }}
                onClick={() => setEmoji(e)}
              >
                {e}
              </span>
            ))}
          </Space>
        </div>
        <div style={{ margin: '12px 0' }}>
          <Button
            onClick={() => fileInputRef.current?.click()}
            style={{ marginRight: 8 }}
            shape="rounded"
            size="small"
          >
            <PictureOutline style={{ marginRight: 4 }} />图片/视频
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        <div style={{ margin: '12px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {media.map((m, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              {m.type === 'image' ? (
                <Image src={m.url} width={80} height={80} fit="cover" />
              ) : (
                <video src={m.url} width={120} height={80} style={{ objectFit: 'cover' }} controls preload="metadata" />
              )}
              <Button
                size="mini"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                }}
                onClick={() => setMedia(media.filter((_, i) => i !== idx))}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
        <Button
          color="primary"
          block
          loading={loading}
          onClick={handleSave}
          style={{ marginTop: 16 }}
        >
          保存
        </Button>
        {saved && (
          <div
            style={{
              marginTop: 24,
              background: '#f7f8fa',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>今日已保存：</div>
            <div style={{ fontSize: 18, marginBottom: 12 }}>{saved.text} {saved.emoji}</div>
            {saved.media && saved.media.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {saved.media.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    {m.type === 'image' ? (
                      <Image src={m.url} width={80} height={80} fit="cover" />
                    ) : (
                      <video src={m.url} width={120} height={80} style={{ objectFit: 'cover' }} controls preload="metadata" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

function Sync() {
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('serverUrl') || '');
  const [syncDays, setSyncDays] = useState(7);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSync = async () => {
    if (!serverUrl) {
      Toast.show({ icon: 'fail', content: '请先设置服务端地址' });
      return;
    }
    setSyncing(true);
    setSyncStatus('同步中...');
    try {
      // 设置服务端地址
      apiService.setServerUrl(serverUrl);
      localStorage.setItem('serverUrl', serverUrl);
      // 执行同步
      await syncService.sync(syncDays);
      setSyncStatus('同步成功');
      Toast.show({ icon: 'success', content: '同步成功' });
    } catch (error) {
      setSyncStatus('同步失败，请重试');
      Toast.show({ icon: 'fail', content: '同步失败' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h3>同步设置</h3>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="请输入服务端地址"
          value={serverUrl}
          onChange={val => setServerUrl(val)}
          clearable
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>同步时间范围：</div>
        <Space>
          {[7, 14, 30].map(days => (
            <Button
              key={days}
              color={syncDays === days ? 'primary' : 'default'}
              size='small'
              onClick={() => setSyncDays(days)}
            >
              {days}天
            </Button>
          ))}
        </Space>
      </div>
      <Button
        color="primary"
        block
        loading={syncing}
        onClick={handleSync}
        disabled={!serverUrl}
      >
        开始同步
      </Button>
      {syncStatus && (
        <div style={{ marginTop: 16, textAlign: 'center', color: syncing ? '#1677ff' : '#00b578' }}>
          {syncStatus}
        </div>
      )}
    </div>
  );
}

function Partner() {
  const [partnerId, setPartnerId] = useState('');
  const [isBound, setIsBound] = useState(false);
  const [bindingDays, setBindingDays] = useState(0);
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [partnerNotes, setPartnerNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 模拟获取绑定状态
  useEffect(() => {
    // TODO: 实际应从服务端获取
    const mockBound = localStorage.getItem('partnerId');
    if (mockBound) {
      setIsBound(true);
      setPartnerId(mockBound);
      setBindingDays(7); // 模拟绑定天数
    }
  }, []);

  // 获取最近一周的数据
  useEffect(() => {
    const fetchNotes = async () => {
      const db = await dbPromise;
      const notes = await db.getAll('notes');
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      const filteredNotes = notes.filter(note => {
        const noteDate = new Date(note.date);
        return noteDate >= startDate && noteDate <= today;
      });
      setMyNotes(filteredNotes);

      // 模拟搭档数据
      if (isBound) {
        setPartnerNotes(filteredNotes.map(note => ({
          ...note,
          text: `搭档的${note.text}`,
          emoji: '👥'
        })));
      }
    };
    fetchNotes();
  }, [isBound]);

  const handleBind = async () => {
    if (!partnerId) {
      Toast.show({ icon: 'fail', content: '请输入搭档ID' });
      return;
    }
    setLoading(true);
    try {
      // TODO: 实际应向服务端发送绑定请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      localStorage.setItem('partnerId', partnerId);
      setIsBound(true);
      setBindingDays(1);
      Toast.show({ icon: 'success', content: '绑定请求已发送' });
    } catch (error) {
      Toast.show({ icon: 'fail', content: '绑定失败' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      {!isBound ? (
        <div>
          <h3>绑定搭档</h3>
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="请输入搭档ID"
              value={partnerId}
              onChange={val => setPartnerId(val)}
              clearable
            />
          </div>
          <Button
            color="primary"
            block
            loading={loading}
            onClick={handleBind}
            disabled={!partnerId}
          >
            发送绑定请求
          </Button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <h3>已绑定搭档</h3>
            <div style={{ color: '#666' }}>ID: {partnerId}</div>
            <div style={{ color: '#666' }}>已绑定 {bindingDays} 天</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {/* 左侧：我的数据 */}
            <div style={{ flex: 1 }}>
              <h4>我的记录</h4>
              {myNotes.map(note => (
                <div key={note.date} style={{ marginBottom: 12, padding: 8, background: '#f7f8fa', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>{note.date}</div>
                  <div>{note.text} {note.emoji}</div>
                  {note.media && note.media.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {note.media.map((m: any, idx: number) => (
                        <span key={idx} style={{ marginRight: 4 }}>
                          {m.type === 'image' ? (
                            <Image src={m.url} width={32} height={32} fit="cover" style={{ borderRadius: 4 }} />
                          ) : (
                            <video src={m.url} width={48} height={32} style={{ borderRadius: 4 }} controls preload="metadata" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* 右侧：搭档数据 */}
            <div style={{ flex: 1 }}>
              <h4>搭档记录</h4>
              {partnerNotes.map(note => (
                <div key={note.date} style={{ marginBottom: 12, padding: 8, background: '#f7f8fa', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>{note.date}</div>
                  <div>{note.text} {note.emoji}</div>
                  {note.media && note.media.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {note.media.map((m: any, idx: number) => (
                        <span key={idx} style={{ marginRight: 4 }}>
                          {m.type === 'image' ? (
                            <Image src={m.url} width={32} height={32} fit="cover" style={{ borderRadius: 4 }} />
                          ) : (
                            <video src={m.url} width={48} height={32} style={{ borderRadius: 4 }} controls preload="metadata" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Profile() {
  const [userId, setUserId] = useState('');
  const [avatar, setAvatar] = useState('');
  const [stats, setStats] = useState({
    totalDays: 0,
    isBound: false,
    partnerId: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化用户信息
  useEffect(() => {
    // 生成随机用户ID（实际应从服务端获取）
    const storedId = localStorage.getItem('userId');
    if (storedId) {
      setUserId(storedId);
    } else {
      const newId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', newId);
      setUserId(newId);
    }

    // 获取绑定状态
    const partnerId = localStorage.getItem('partnerId');
    if (partnerId) {
      setStats(prev => ({ ...prev, isBound: true, partnerId }));
    }

    // 获取记录天数
    const fetchStats = async () => {
      const db = await dbPromise;
      const notes = await db.getAll('notes');
      setStats(prev => ({ ...prev, totalDays: notes.length }));
    };
    fetchStats();
  }, []);

  // 处理头像上传
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setAvatar(result);
          // 实际应上传到服务端
          localStorage.setItem('userAvatar', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 复制用户ID
  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    Toast.show({ icon: 'success', content: 'ID已复制' });
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            margin: '0 auto 16px',
            background: avatar ? `url(${avatar}) center/cover` : '#f0f0f0',
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {!avatar && (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: '#999'
            }}>
              点击上传头像
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
          我的ID
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16
        }}>
          <span style={{ color: '#666' }}>{userId}</span>
          <Button
            size='small'
            onClick={copyUserId}
          >
            复制
          </Button>
        </div>
      </div>

      <div style={{ 
        background: '#f7f8fa', 
        borderRadius: 8, 
        padding: 16,
        marginBottom: 16
      }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: '#666' }}>已记录天数：</span>
          <span style={{ fontWeight: 'bold' }}>{stats.totalDays} 天</span>
        </div>
      <div>
          <span style={{ color: '#666' }}>搭档状态：</span>
          <span style={{ fontWeight: 'bold' }}>
            {stats.isBound ? `已绑定 (${stats.partnerId})` : '未绑定'}
          </span>
        </div>
      </div>

      <div style={{ 
        background: '#f7f8fa', 
        borderRadius: 8, 
        padding: 16
      }}>
        <h4 style={{ marginBottom: 12 }}>使用说明</h4>
        <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>
          <p>1. 复制你的ID，分享给想要绑定的搭档</p>
          <p>2. 在搭档页面输入对方的ID进行绑定</p>
          <p>3. 每天记录一句话，支持文字、表情、图片和视频</p>
          <p>4. 在同步页面设置服务端地址，定期同步数据</p>
        </div>
      </div>
    </div>
  );
}

const tabs = [
  {
    key: '/',
    title: '一句话',
    icon: <AppOutline />,
  },
  {
    key: '/sync',
    title: '同步',
    icon: <SendOutline />,
  },
  {
    key: '/partner',
    title: '搭档',
    icon: <TeamOutline />,
  },
  {
    key: '/profile',
    title: '自己',
    icon: <UserOutline />,
  },
];

interface BottomNavProps {
  activeKey: string;
  onChange: (key: string) => void;
}

function BottomNav({ activeKey, onChange }: BottomNavProps) {
  const navigate = useNavigate();
  return (
    <TabBar
      activeKey={activeKey}
      onChange={key => {
        onChange(key);
        navigate(key);
      }}
    >
      {tabs.map(item => (
        <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
      ))}
    </TabBar>
  );
}

function App() {
  const location = useLocation();
  const [activeKey, setActiveKey] = useState('/');

  useEffect(() => {
    setActiveKey(location.pathname);
  }, [location]);

  return (
    <div className="app">
      <TransitionGroup>
        <CSSTransition
          key={location.key}
          timeout={300}
          classNames="page"
        >
          <div className="page-container">
            <Routes>
              <Route path="/" element={<OneSentence />} />
              <Route path="/sync" element={<Sync />} />
              <Route path="/partner" element={<Partner />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
        </CSSTransition>
      </TransitionGroup>
      <BottomNav activeKey={activeKey} onChange={setActiveKey} />
    </div>
  );
}

export default App;
