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
    }
  },

  data: {
    formattedUser: null
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
        avatar: user.avatar || user.avatarUrl || '/assets/icons/default-avatar.png',
        // 合并统计数据
        post_count: stats?.posts || user.post_count || 0,
        like_count: stats?.likes || user.like_count || 0,
        favorite_count: stats?.favorites || user.favorite_count || 0,
        token: user.token || 0
      };
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
          console.debug('关注失败:', err);
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
          console.debug('取消关注失败:', err);
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
      formattedUser.avatar = '/assets/icons/default-avatar.png';
      this.setData({ formattedUser });
    }
  }
}); 