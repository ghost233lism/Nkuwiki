const { storage, ui, nav, error, ToastType, createApiClient } = require('../utils/util');
const baseBehavior = require('./base-behavior');

// 使用createApiClient创建统一的用户API
const userApi = createApiClient('/api/wxapp/user', {
  sync: {
    method: 'POST',
    path: '/sync',
    params: {
      openid: true
    }
  },
  profile: {
    method: 'GET',
    path: '/profile',
    params: {
      openid: true,
      user_id: false
    }
  },
  update: {
    method: 'POST',
    path: '/update',
    params: {
      openid: true
    }
  },
  follow: {
    method: 'POST',
    path: '/follow',
    params: {
      openid: true,
      followed_id: true
    }
  },
  posts: {
    method: 'GET',
    path: '/post',
    params: {
      openid: true,
      offset: false,
      limit: false
    }
  },
  likes: {
    method: 'GET',
    path: '/like',
    params: {
      openid: true,
      offset: false,
      limit: false
    }
  },
  favorites: {
    method: 'GET',
    path: '/favorite',
    params: {
      openid: true,
      offset: false,
      limit: false
    }
  },
  comments: {
    method: 'GET',
    path: '/comment',
    params: {
      openid: true,
      offset: false,
      limit: false
    }
  },
  status: {
    method: 'GET',
    path: '/status',
    params: {
      openid: true,
      target_id: true
    }
  }
});

module.exports = Behavior({
  behaviors: [baseBehavior],
  
  methods: {
    // 获取用户信息
    async getUserInfo(userId) {
      try {
        const res = await userApi.profile({
          user_id: userId,
          openid: storage.get('openid')
        });
        
        if (res.code === 200) {
          return this.formatUserInfo(res.data);
        } else {
          ui.showToast(res.message || '获取用户信息失败', { type: ToastType.ERROR });
          return Promise.reject(res);
        }
      } catch (err) {
        console.debug('获取用户信息失败:', err);
        ui.showToast('网络错误', { type: ToastType.ERROR });
        return Promise.reject(err);
      }
    },
    // 更新用户信息
    async updateProfile(userInfo) {
      try {
        const res = await userApi.update(userInfo);
        if (res.code === 200) {
          ui.showToast('更新成功', { type: ToastType.SUCCESS });
          return res.data;
        } else {
          ui.showToast(res.message || '操作失败', { type: ToastType.ERROR });
          return Promise.reject(res);
        }
      } catch (err) {
        console.debug('更新用户信息失败:', err);
        ui.showToast('网络错误', { type: ToastType.ERROR });
        return Promise.reject(err);
      }
    },
    // 格式化用户信息
    formatUserInfo(userInfo) {
      if (!userInfo) return null;
      
      // 统一兼容字段
      return {
        ...userInfo,
        nickname: userInfo.nickname || userInfo.nickName || '未知用户',
        avatar: userInfo.avatar || userInfo.avatarUrl || '/assets/icons/default-avatar.png'
      };
    },
    
    // 关注/取消关注用户（根据当前状态自动判断）
    async toggleFollow(userId) {
      try {
        const res = await userApi.follow({
          followed_id: userId,
          openid: storage.get('openid')
        });
        
        if (res.code === 200) {
          const isFollowing = res.data.status === 'followed';
          const message = isFollowing ? '关注成功' : '已取消关注';
          ui.showToast(message, { type: ToastType.SUCCESS });
          return res.data;
        } else {
          ui.showToast(res.message || '操作失败', { type: ToastType.ERROR });
          return Promise.reject(res);
        }
      } catch (err) {
        console.debug('关注操作失败:', err);
        ui.showToast('网络错误', { type: ToastType.ERROR });
        return Promise.reject(err);
      }
    },
    
    // 获取当前登录用户信息
    async getCurrentUserInfo() {
      try {
        // 先从storage获取openid
        const openid = storage.get('openid');
        if (!openid) {
          return null;
        }
        
        // 调用profile接口获取最新用户信息
        const res = await userApi.profile({
          openid: openid
        });
        
        if (res.code === 200) {
          const userInfo = this.formatUserInfo(res.data);
          // 确保用户信息包含id字段
          if (!userInfo || !userInfo.id) {
            console.debug('用户信息不完整:', userInfo);
            // 清除无效的用户信息
            storage.remove('userInfo');
            return null;
          }
          // 缓存用户信息到本地
          storage.set('userInfo', userInfo);
          return userInfo;
        } else {
          console.debug('获取用户个人信息失败:', res.message);
          // 可能是用户不存在，清除无效的登录状态
          if (res.code === 404) {
            storage.remove('userInfo');
          }
          return null;
        }
      } catch (err) {
        console.debug('获取个人信息失败:', err);
        return null;
      }
    },
    
    // 获取用户关系状态
    async getUserStatus(targetUserId) {
      try {
        const res = await userApi.status({
          openid: storage.get('openid'),
          target_id: targetUserId
        });
        
        return res.code === 200 ? res.data : null;
      } catch (err) {
        console.debug('获取用户状态失败:', err);
        return null;
      }
    },
    
    // 跳转到用户主页
    navigateToUserProfile(userId) {
      this.navigateTo('/pages/profile/profile', { id: userId });
    },
    
    // 跳转到编辑个人资料页
    navigateToEditProfile() {
      this.navigateTo('/pages/profile/edit/edit');
    }
  }
}); 