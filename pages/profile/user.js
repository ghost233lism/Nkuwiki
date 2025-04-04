const { ui, error, ToastType, createApiClient, formatRelativeTime } = require('../../utils/util');
const baseBehavior = require('../../behaviors/baseBehavior');
const userBehavior = require('../../behaviors/user-behavior');

// 使用createApiClient创建API客户端
const userApi = createApiClient('/api/wxapp/user', {
  detail: {
    method: 'GET',
    path: '/detail',
    params: {
      openid: false,
      user_id: true
    }
  },
  follow: {
    method: 'POST',
    path: '/follow',
    data: {
      openid: true,
      followed_id: true
    }
  }
});

Page({
  behaviors: [baseBehavior, userBehavior],
  
  data: {
    userId: '',
    userInfo: null,
    loading: false
  },
  
  onLoad(options) {
    if (options.id) {
      this.setData({ userId: options.id });
      this.loadUserData();
    } else {
      this.showToast('缺少用户ID', 'error');
    }
  },
  
  async loadUserData() {
    this.showLoading('加载中...');
    
    try {
      const res = await userApi.detail({ 
        user_id: this.data.userId,
        openid: wx.getStorageSync('openid')
      });
      
      if (res.code === 200) {
        this.setData({
          userInfo: {
            ...res.data,
            create_time_formatted: formatRelativeTime(res.data.create_time)
          }
        });
      } else {
        throw error.create(res.message || '获取用户信息失败');
      }
    } catch (err) {
      this.handleError(err, '加载用户信息失败');
    } finally {
      this.hideLoading();
    }
  },

  async handleFollow() {
    if (!this.checkLogin()) return;
    
    this.showLoading('处理中...');
    
    try {
      const res = await userApi.follow({
        followed_id: this.data.userId,
        openid: wx.getStorageSync('openid')
      });
      
      if (res.code === 200) {
        this.showToast(res.data.is_followed ? '关注成功' : '取消关注成功', 'success');
        this.loadUserData(); // 刷新用户数据
      } else {
        throw error.create(res.message || '操作失败');
      }
    } catch (err) {
      this.handleError(err, '关注操作失败');
    } finally {
      this.hideLoading();
    }
  }
}); 