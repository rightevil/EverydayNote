import axios from 'axios';
import type { AxiosResponse } from 'axios';

export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

// 创建 axios 实例
const instance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const data = response.data;
    if (data.code !== 0) {
      return Promise.reject(new Error(data.message));
    }
    return response;
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，清除 token 并跳转到登录页
          localStorage.removeItem('token');
          break;
        case 403:
          // 权限不足
          break;
        case 404:
          // 资源不存在
          break;
        default:
          break;
      }
    }
    return Promise.reject(error);
  }
);

// API 服务
export const apiService = {
  setServerUrl(url: string) {
    instance.defaults.baseURL = url;
  },

  async login(userId: string): Promise<ApiResponse> {
    const response = await instance.post<ApiResponse>('/api/login', { userId });
    return response.data;
  },

  async syncData(notes: any[]): Promise<ApiResponse> {
    const response = await instance.post<ApiResponse>('/api/sync', { notes });
    return response.data;
  },

  async getSyncData(startDate: string, endDate: string): Promise<ApiResponse> {
    const response = await instance.get<ApiResponse>(`/api/sync?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  async sendPartnerRequest(partnerId: string): Promise<ApiResponse> {
    const response = await instance.post<ApiResponse>('/api/partner/request', { partnerId });
    return response.data;
  },

  async acceptPartnerRequest(requestId: string): Promise<ApiResponse> {
    const response = await instance.post<ApiResponse>(`/api/partner/accept/${requestId}`);
    return response.data;
  },

  async getPartnerData(startDate: string, endDate: string): Promise<ApiResponse> {
    const response = await instance.get<ApiResponse>(`/api/partner/data?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  async uploadMedia(file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await instance.post<ApiResponse>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// 离线队列管理
type ApiMethod = typeof apiService[keyof typeof apiService];
type ApiMethodArgs<T extends ApiMethod> = T extends (...args: infer A) => any ? A : never;

interface ApiTask {
  method: keyof typeof apiService;
  args: any[];
}

class OfflineQueue {
  private queue: ApiTask[] = [];

  async addTask(task: ApiTask) {
    this.queue.push(task);
    await this.saveQueue();
  }

  private async saveQueue() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  async loadQueue() {
    const queue = localStorage.getItem('offlineQueue');
    if (queue) {
      this.queue = JSON.parse(queue);
    }
  }

  async processQueue() {
    await this.loadQueue();
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          const method = apiService[task.method];
          if (typeof method === 'function') {
            await (method as Function).apply(apiService, task.args);
          }
        } catch (error) {
          console.error('处理离线任务失败:', error);
          this.queue.unshift(task);
          break;
        }
      }
    }
    await this.saveQueue();
  }
}

export const offlineQueue = new OfflineQueue(); 