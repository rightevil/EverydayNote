import axios from 'axios';
import type { AxiosResponse } from 'axios';

// 定义响应类型
interface ApiResponse<T = any> {
  data: T;
  token?: string;
}

// 创建axios实例
const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response: AxiosResponse) => response.data as ApiResponse,
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除token
          localStorage.removeItem('token');
          break;
        case 403:
          // 权限不足
          break;
        case 404:
          // 资源不存在
          break;
        default:
          // 其他错误
          break;
      }
    }
    return Promise.reject(error);
  }
);

// 定义任务类型
type ApiTask = {
  type: keyof typeof apiService;
  args: unknown[];
};

// API接口
export const apiService = {
  // 设置服务端地址
  setServerUrl(url: string) {
    api.defaults.baseURL = url;
  },

  // 用户认证
  async login(userId: string): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/login', { userId });
    const data = response as unknown as ApiResponse;
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  // 同步数据
  async syncData(notes: any[]): Promise<ApiResponse> {
    return await api.post<ApiResponse>('/sync/data', { notes });
  },

  // 获取同步数据
  async getSyncData(startDate: string, endDate: string): Promise<ApiResponse> {
    return await api.get<ApiResponse>('/sync/data', {
      params: { startDate, endDate }
    });
  },

  // 发送搭档绑定请求
  async sendPartnerRequest(partnerId: string): Promise<ApiResponse> {
    return await api.post<ApiResponse>('/partner/request', { partnerId });
  },

  // 接受搭档绑定请求
  async acceptPartnerRequest(requestId: string): Promise<ApiResponse> {
    return await api.post<ApiResponse>('/partner/accept', { requestId });
  },

  // 获取搭档数据
  async getPartnerData(startDate: string, endDate: string): Promise<ApiResponse> {
    return await api.get<ApiResponse>('/partner/data', {
      params: { startDate, endDate }
    });
  },

  // 上传媒体文件
  async uploadMedia(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return await api.post<ApiResponse>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// 离线队列管理
export const offlineQueue = {
  queue: [] as ApiTask[],
  
  // 添加任务到队列
  addTask(task: ApiTask) {
    this.queue.push(task);
    this.saveQueue();
  },

  // 保存队列到本地存储
  saveQueue() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  },

  // 从本地存储加载队列
  loadQueue() {
    const saved = localStorage.getItem('offlineQueue');
    if (saved) {
      this.queue = JSON.parse(saved);
    }
  },

  // 处理队列中的任务
  async processQueue() {
    if (this.queue.length === 0) return;

    for (const task of this.queue) {
      try {
        const method = apiService[task.type];
        if (typeof method === 'function') {
          await method.apply(apiService, task.args);
          this.queue = this.queue.filter(t => t !== task);
          this.saveQueue();
        }
      } catch (error) {
        console.error('Failed to process offline task:', error);
        break;
      }
    }
  },
};

// 初始化：加载离线队列
offlineQueue.loadQueue(); 