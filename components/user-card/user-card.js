const { createApiClient } = require('../../utils/util');

// 创建用户API客户端
const userApi = {
  follow: createApiClient('/api/wxapp/user', {}).follow
};

Component({
  properties: {
    user: {
      type: Object,
      value: {}
    },
    userInfo: {
      type: Object,
      value: {}
    },
    stats: {
      type: Object,
      value: {
        posts: 0,
        likes: 0,
        favorites: 0,
        comments: 0
      }
    },
    isCurrentUser: {
      type: Boolean,
      value: false
    },
    currentUserOpenid: {
      type: String,
      value: ''
    },
    // 加载状态
    loading: {
      type: Boolean,
      value: false
    },
    // 错误状态
    error: {
      type: Boolean,
      value: false
    },
    // 错误信息
    errorMsg: {
      type: String,
      value: ''
    }
  },

  data: {
    formattedUser: null
  },
  
  // 页面显示时检查是否需要刷新
  pageLifetimes: {
    show() {
      if (this.properties.isCurrentUser) {
        // 检查是否需要刷新
        const storage = wx.getStorageSync('needRefreshProfile');
        if (storage) {
          // 清除标记
          wx.removeStorageSync('needRefreshProfile');
          // 通知父组件需要刷新数据
          this.triggerEvent('refresh');
          
          // 同时获取最新的本地存储用户信息更新UI
          const localUserInfo = wx.getStorageSync('userInfo');
          if (localUserInfo && this.data.formattedUser) {
            // 更新用户信息显示
            const formattedUser = { ...this.data.formattedUser };
            
            // 更新关键字段
            if (localUserInfo.nickname) formattedUser.nickname = localUserInfo.nickname;
            if (localUserInfo.avatar) formattedUser.avatar = localUserInfo.avatar;
            if (localUserInfo.bio !== undefined) formattedUser.bio = localUserInfo.bio;
            
            // 更新统计数据
            if (localUserInfo.post_count !== undefined) formattedUser.post_count = localUserInfo.post_count;
            if (localUserInfo.like_count !== undefined) formattedUser.like_count = localUserInfo.like_count;
            if (localUserInfo.favorite_count !== undefined) formattedUser.favorite_count = localUserInfo.favorite_count;
            if (localUserInfo.token !== undefined) formattedUser.token = localUserInfo.token;
            
            this.setData({ formattedUser });
          }
        }
      }
    }
  },

  observers: {
    'user, userInfo, stats': function(user, userInfo, stats) {
      // 优先使用userInfo属性
      const userData = userInfo && userInfo.openid ? userInfo : user;
      if (userData && userData.openid) {
        this.setData({
          formattedUser: this.formatUser(userData, stats)
        });
      }
    },
    
    // 单独监听userInfo的变化，确保实时更新
    'userInfo.nickname, userInfo.avatar, userInfo.bio': function(nickname, avatar, bio) {
      if (this.data.formattedUser) {
        const formattedUser = { ...this.data.formattedUser };
        
        if (nickname !== undefined) formattedUser.nickname = nickname;
        if (avatar !== undefined) formattedUser.avatar = avatar;
        if (bio !== undefined) formattedUser.bio = bio;
        
        this.setData({ formattedUser });
      }
    }
  },

  methods: {
    // 格式化用户数据
    formatUser(user, stats) {
      if (!user) return null;
      
      // 统一兼容字段
      return {
        ...user,
        nickname: user.nickname || user.nickName || '未知用户',
        avatar: user.avatar || user.avatarUrl || '/icons/avatar1.png',
        bio: user.bio || user.signature || '',
        // 合并统计数据
        post_count: stats?.posts || user.post_count || 0,
        like_count: stats?.likes || user.like_count || 0,
        favorite_count: stats?.favorites || user.favorite_count || 0,
        token: user.token || 0
      };
    },

    // 强制刷新用户数据
    refreshUserData() {
      // 通知父组件需要刷新数据
      this.triggerEvent('refresh');
    },

    // 跳转到用户主页
    onTapUser() {
      if (this.data.isCurrentUser) {
        return;
      }
      
      const { openid } = this.data.formattedUser;
      if (openid) {
        wx.navigateTo({
          url: `/pages/profile/profile?id=${openid}`
        });
      }
    },
    
    // 编辑个人资料
    onEdit() {
      if (!this.data.isCurrentUser) {
        return;
      }
      
      this.triggerEvent('edit');
      wx.navigateTo({
        url: '/pages/profile/edit/edit'
      });
    },
    
    // 关注/取消关注用户
    onFollow() {
      if (this.data.isCurrentUser) {
        return;
      }
      
      const { openid, isFollowed } = this.data.formattedUser;
      if (!openid) return;
      
      if (isFollowed) {
        this.unfollowUser(openid);
      } else {
        this.followUser(openid);
      }
    },
    
    // 关注用户
    followUser(targetOpenid) {
      userApi.follow({
        followed_id: targetOpenid,
        openid: this.properties.currentUserOpenid
      })
        .then(res => {
          if (res.code === 0) {
            wx.showToast({
              title: '关注成功',
              icon: 'none'
            });
            this.updateFollowStatus(true);
            this.triggerEvent('follow', { user_id: targetOpenid });
          } else {
            wx.showToast({
              title: res.message || '关注失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        });
    },
    
    // 取消关注用户 - 使用同一个接口
    unfollowUser(targetOpenid) {
      userApi.follow({
        followed_id: targetOpenid,
        openid: this.properties.currentUserOpenid
      })
        .then(res => {
          if (res.code === 0) {
            wx.showToast({
              title: '已取消关注',
              icon: 'none'
            });
            this.updateFollowStatus(false);
            this.triggerEvent('follow', { user_id: targetOpenid });
          } else {
            wx.showToast({
              title: res.message || '取消关注失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        });
    },
    
    // 更新关注状态
    updateFollowStatus(isFollowed) {
      const formattedUser = { ...this.data.formattedUser };
      formattedUser.isFollowed = isFollowed;
      
      // 更新粉丝计数
      if (formattedUser.follower_count) {
        formattedUser.follower_count = isFollowed 
          ? formattedUser.follower_count + 1 
          : Math.max(0, formattedUser.follower_count - 1);
      }
      
      this.setData({ formattedUser });
    },
    
    // 头像加载失败
    onAvatarError() {
      const formattedUser = { ...this.data.formattedUser };
      formattedUser.avatar = '/icons/avatar1.png';
      this.setData({ formattedUser });
    },

    // 重试加载
    onRetry() {
      this.triggerEvent('retry');
    },
    
    // 点击帖子、点赞或收藏跳转到myContent页面
    onTapPosts(e) {
      // 只有当前用户可以点击查看自己的内容
      if (!this.data.isCurrentUser) {
        return;
      }
      
      const tabIndex = e.currentTarget.dataset.tab;
      wx.navigateTo({
        url: `/pages/profile/myContent/myContent?tab=${tabIndex}`
      });
    },
    
    // 点击积分跳转到积分页面
    onTapPoints() {
      // 只有当前用户可以点击查看自己的积分
      if (!this.data.isCurrentUser) {
        return;
      }
      
      wx.navigateTo({
        url: '/pages/profile/points/points'
      });
    }
  }
}); 