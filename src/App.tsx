import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { TabBar, Button, Input, Toast, Image, Space, PullToRefresh } from 'antd-mobile';
import { AppOutline, SendOutline, TeamOutline, PictureOutline } from 'antd-mobile-icons';
import { useEffect, useState, useRef } from 'react';
import { openDB } from 'idb';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
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
  const [partnerId, setPartnerId] = useState(localStorage.getItem('partnerId') || '');
  const [isBound, setIsBound] = useState(false);
  const [bindingDays, setBindingDays] = useState(0);
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [partnerNotes, setPartnerNotes] = useState<any[]>([]);

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
          text: note.text + ' (搭档)'
        })));
      }
    };
    fetchNotes();
  }, [isBound]);

  return (
    <div style={{ padding: 16 }}>
      <h3>搭档</h3>
      {!isBound ? (
        <div>
          <Input
            placeholder="请输入搭档ID"
            value={partnerId}
            onChange={val => setPartnerId(val)}
            clearable
          />
          <Button
            color="primary"
            block
            style={{ marginTop: 16 }}
            onClick={() => {
              localStorage.setItem('partnerId', partnerId);
              setIsBound(true);
              setBindingDays(7);
            }}
          >
            绑定
          </Button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div>已绑定搭档：{partnerId}</div>
            <div>绑定天数：{bindingDays}天</div>
          </div>
          <div style={{ marginTop: 24 }}>
            <h4>我的记录</h4>
            {myNotes.map(note => (
              <div
                key={note.date}
                style={{
                  background: '#f7f8fa',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 8 }}>{note.text} {note.emoji}</div>
                {note.media && note.media.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {note.media.map((m: any, idx: number) => (
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
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <h4>搭档记录</h4>
            {partnerNotes.map(note => (
              <div
                key={note.date}
                style={{
                  background: '#f7f8fa',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 8 }}>{note.text} {note.emoji}</div>
                {note.media && note.media.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {note.media.map((m: any, idx: number) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;

  const tabs = [
    {
      key: '/',
      title: '记录',
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
  ];

  return (
    <div className="app">
      <div className="body">
        <TransitionGroup>
          <CSSTransition
            key={pathname}
            timeout={300}
            classNames="fade"
          >
            <Routes>
              <Route path="/" element={<OneSentence />} />
              <Route path="/sync" element={<Sync />} />
              <Route path="/partner" element={<Partner />} />
            </Routes>
          </CSSTransition>
        </TransitionGroup>
      </div>
      <TabBar activeKey={pathname} onChange={value => navigate(value)}>
        {tabs.map(item => (
          <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </TabBar>
    </div>
  );
}

export default App;
