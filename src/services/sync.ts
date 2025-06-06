import { apiService, offlineQueue } from '../api';
import { format, subDays } from 'date-fns';

// 定义笔记类型
export interface Note {
  id: string;
  date: string;
  content: string;
  emoji?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  synced: boolean;
}

// 同步服务
export class SyncService {
  private static instance: SyncService;
  private syncInProgress: boolean = false;
  private lastSyncTime: Date | null = null;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // 获取本地笔记
  private getLocalNotes(startDate: Date, endDate: Date): Note[] {
    const notes: Note[] = [];
    const start = startDate.getTime();
    const end = endDate.getTime();

    // 从 localStorage 获取笔记
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('note_')) {
        try {
          const note = JSON.parse(localStorage.getItem(key) || '') as Note;
          const noteDate = new Date(note.date).getTime();
          if (noteDate >= start && noteDate <= end) {
            notes.push(note);
          }
        } catch (error) {
          console.error('Failed to parse note:', error);
        }
      }
    }

    return notes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // 保存笔记到本地
  private saveNote(note: Note) {
    localStorage.setItem(`note_${note.id}`, JSON.stringify(note));
  }

  // 删除本地笔记
  private deleteNote(id: string) {
    localStorage.removeItem(`note_${id}`);
  }

  // 同步数据
  async sync(syncDays: number = 7): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    try {
      this.syncInProgress = true;
      const endDate = new Date();
      const startDate = subDays(endDate, syncDays);

      // 获取本地未同步的笔记
      const localNotes = this.getLocalNotes(startDate, endDate)
        .filter(note => !note.synced);

      // 获取远程笔记
      const remoteNotes = await apiService.getSyncData(
        format(startDate, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      // 合并数据
      const mergedNotes = this.mergeNotes(localNotes, remoteNotes.data);

      // 保存合并后的数据
      mergedNotes.forEach(note => this.saveNote(note));

      // 同步到服务器
      if (localNotes.length > 0) {
        try {
          await apiService.syncData(localNotes);
          // 标记本地笔记为已同步
          localNotes.forEach(note => {
            note.synced = true;
            this.saveNote(note);
          });
        } catch (error) {
          // 如果同步失败，将任务添加到离线队列
          offlineQueue.addTask({
            type: 'syncData',
            args: [localNotes]
          });
        }
      }

      this.lastSyncTime = new Date();
    } finally {
      this.syncInProgress = false;
    }
  }

  // 合并本地和远程笔记
  private mergeNotes(localNotes: Note[], remoteNotes: Note[]): Note[] {
    const mergedNotes = new Map<string, Note>();

    // 添加远程笔记
    remoteNotes.forEach(note => {
      mergedNotes.set(note.id, note);
    });

    // 合并本地笔记
    localNotes.forEach(localNote => {
      const remoteNote = mergedNotes.get(localNote.id);
      if (!remoteNote || new Date(localNote.date) > new Date(remoteNote.date)) {
        mergedNotes.set(localNote.id, localNote);
      }
    });

    return Array.from(mergedNotes.values());
  }

  // 获取最后同步时间
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  // 检查是否有未同步的数据
  hasUnsyncedData(): boolean {
    const notes = this.getLocalNotes(
      subDays(new Date(), 7),
      new Date()
    );
    return notes.some(note => !note.synced);
  }
}

// 导出单例实例
export const syncService = SyncService.getInstance(); 