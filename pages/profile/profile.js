Page({
  data: {
    userInfo: null,
    loginType: '',
    totalLikes: 0  // 添加获赞总数字段
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo,
      loginType: userInfo?.loginType || ''
    })
    
    // 如果用户已登录，获取获赞总数
    if (userInfo) {
      this.getUserTotalLikes()
    }
  },

  onShow() {
    // 每次显示页面时，从本地存储获取最新的用户信息
    const userInfo = wx.getStorageSync('userInfo')
    console.log('当前用户信息:', userInfo)

    if (userInfo) {
      this.setData({
        userInfo: userInfo
      })

      // 获取最新的帖子数量
      this.getUserPostsCount()
      
      // 获取最新的获赞总数
      this.getUserTotalLikes()
    }
  },

  // 获取用户发帖数量
  async getUserPostsCount() {
    if (!this.data.userInfo) return;

    try {
      console.log('开始获取用户帖子数量');
      
      // 导入API模块
      const api = require('../../utils/api/index');
      
      wx.showLoading({ title: '加载中...' });
      
      // 调用API获取用户帖子数量
      const result = await api.post.getUserPosts({
        countOnly: true,
        openid: this.data.userInfo._id || this.data.userInfo.openid
      });

      wx.hideLoading();
      console.log('获取帖子数量结果:', result);

      if (result && result.success) {
        // 更新本地用户信息中的帖子数量
        const userInfo = this.data.userInfo;
        userInfo.posts = result.data.count;

        // 更新页面显示和本地存储
        this.setData({ userInfo });
        wx.setStorageSync('userInfo', userInfo);
        console.log('更新后的帖子数量:', userInfo.posts);
      }
    } catch (err) {
      console.error('获取帖子数量失败：', err);
      wx.hideLoading();
    }
  },

  // 获取用户获赞总数和其他统计数据
  async getUserTotalLikes() {
    if (!this.data.userInfo) return;

    try {
      console.log('开始获取用户统计数据');
      wx.showLoading({ title: '加载中...' });

      // 导入API模块
      const api = require('../../utils/api/index');
      
      // 使用用户API获取用户信息（包含统计数据）
      const result = await api.user.getProfile({ isSelf: true });
      
      wx.hideLoading();
      console.log('获取用户信息完整结果:', result);
      
      if (result && result.success && result.data) {
        // 提取用户统计数据
        const userData = result.data;
        
        // 更新获赞总数
        const totalLikes = userData.likes_count || 0;
        
        // 更新用户信息（包括头像、昵称和所有统计数据）
        const userInfo = {
          ...this.data.userInfo,
          // 完全匹配后端返回的所有字段
          id: userData.id,
          openid: userData.openid,
          unionid: userData.unionid,
          nick_name: userData.nick_name,
          avatar: userData.avatar,
          gender: userData.gender,
          bio: userData.bio,
          country: userData.country,
          province: userData.province,
          city: userData.city,
          language: userData.language,
          birthday: userData.birthday,
          wechatId: userData.wechatId,
          qqId: userData.qqId,
          token_count: userData.token_count,
          likes_count: userData.likes_count || 0,
          favorites_count: userData.favorites_count || 0,
          posts_count: userData.posts_count || 0,
          followers_count: userData.followers_count || 0,
          following_count: userData.following_count || 0,
          extra: userData.extra,
          create_time: userData.create_time,
          update_time: userData.update_time,
          last_login: userData.last_login,
          platform: userData.platform,
          status: userData.status,
          is_deleted: userData.is_deleted,
          
          // 兼容小程序使用的字段
          avatarUrl: userData.avatar,
          nickName: userData.nick_name,
          posts: userData.posts_count || 0, // 兼容旧版字段
          _id: userData.openid,
        };
        
        // 更新页面显示
        this.setData({ 
          totalLikes,
          userInfo 
        });
        console.log('用户获赞总数:', totalLikes);
        
        // 更新本地存储
        wx.setStorageSync('userInfo', userInfo);
        console.log('已更新本地用户信息:', userInfo);
      }
    } catch (err) {
      console.error('获取用户统计数据失败：', err);
      wx.hideLoading();
      
      // 出错时尝试备用方案
      this.calculateTotalLikes();
    }
  },
  
  // 通过获取用户帖子列表来计算总获赞数的备用方法
  async calculateTotalLikes() {
    try {
      console.log('开始通过帖子列表计算用户获赞总数');
      wx.showLoading({ title: '加载中...' });
      
      // 导入API模块
      const api = require('../../utils/api/index');
      
      // 获取用户帖子列表
      const result = await api.post.getUserPosts({
        isSelf: true,
        includePostData: true
      });
      
      wx.hideLoading();
      
      if (result && result.success && result.posts) {
        // 计算所有帖子的点赞总数
        let totalLikes = 0;
        result.posts.forEach(post => {
          totalLikes += (post.like_count || 0);
        });
        
        // 更新页面显示
        this.setData({ totalLikes });
        console.log('计算得到的用户获赞总数:', totalLikes);
        
        // 同时更新本地存储的用户信息
        const userInfo = this.data.userInfo;
        userInfo.likes_count = totalLikes;
        wx.setStorageSync('userInfo', userInfo);
      }
    } catch (err) {
      console.error('计算获赞总数失败：', err);
      wx.hideLoading();
      
      // 最终失败，使用0作为默认值
      this.setData({ totalLikes: 0 });
    }
  },

  // 查看我的帖子
  viewMyPosts() {
    console.log('触发了viewMyPosts函数')

    if (!this.data.userInfo) {
      console.log('用户未登录，无法查看帖子')
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    console.log('准备跳转到我的帖子页面')
    wx.navigateTo({
      url: '/pages/profile/myPosts/myPosts',
      success: () => {
        console.log('跳转到我的帖子页面成功')
      },
      fail: (err) => {
        console.error('跳转到我的帖子页面失败:', err)
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        })
      }
    })
  },

  onFunctionTap(e) {
    console.log(e)

    console.log('触发了onFunctionTap函数')
    const type = e.currentTarget.dataset.type

    if (!this.data.userInfo) {
      console.log('用户未登录，无法查看帖子')
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    console.log('准备跳转到我的帖子页面')
    wx.navigateTo({
      url: `/pages/profile/mylike_fav_comment/mylike_fav_comment?type=${type}`,
      success: () => {
        console.log('跳转到我的帖子页面成功')
      },
      fail: (err) => {
        console.error('跳转到我的帖子页面失败:', err)
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 清除缓存
  clearCache: function() {
      // 添加确认弹窗
      wx.showModal({
          title: '确认清除缓存',
          content: '确定要清除缓存吗？',
          confirmText: '确定',
          cancelText: '取消',
          success: (res) => {
              if (res.confirm) {
                  // 用户点击确定，开始清除缓存
                  wx.showLoading({
                      title: '清理中...'
                  });

                  // 获取所有缓存数据的键
                  wx.getStorageInfo({
                      success: (res) => {
                          const size = res.currentSize;
                          const keys = res.keys;

                          // 需要保留的键名列表
                          const keepKeys = ['userInfo', 'token', 'important_settings'];

                          // 过滤出需要删除的键
                          const keysToDelete = keys.filter(key => !keepKeys.includes(key));

                          // 删除非保留数据
                          Promise.all(keysToDelete.map(key => {
                              return new Promise((resolve, reject) => {
                                  wx.removeStorage({
                                      key: key,
                                      success: resolve,
                                      fail: reject
                                  });
                              });
                          }))
                              .then(() => {
                                  wx.hideLoading();
                                  wx.showToast({
                                      title: '清除成功',
                                      icon: 'success',
                                      duration: 2000
                                  });
                              })
                              .catch((err) => {
                                  wx.hideLoading();
                                  wx.showToast({
                                      title: '清除失败',
                                      icon: 'error',
                                      duration: 2000
                                  });
                                  console.error('清除缓存失败：', err);
                              });
                      },
                      fail: (err) => {
                          wx.hideLoading();
                          wx.showToast({
                              title: '获取缓存信息失败',
                              icon: 'error',
                              duration: 2000
                          });
                          console.error('获取缓存信息失败：', err);
                      }
                  });
              }
              // 用户点击取消则不执行任何操作
          }
      });
  },

  // 检查登录状态并获取最新用户信息
  async checkLogin() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.openid) {
        // 从云数据库获取最新用户信息
        const db = wx.cloud.database()
        const user = await db.collection('users')
          .where({
            openid: userInfo.openid
          })
          .get()

        if (user.data && user.data[0]) {
          // 更新本地存储和页面显示
          const latestUserInfo = user.data[0]
          wx.setStorageSync('userInfo', latestUserInfo)
          this.setData({ userInfo: latestUserInfo })
        } else {
          // 用户信息不存在，清除登录状态
          this.handleLogout()
        }
      } else {
        this.setData({ userInfo: null })
      }
    } catch (err) {
      console.error('获取用户信息失败：', err)
      wx.showToast({
        title: '获取信息失败',
        icon: 'none'
      })
    }
  },

  // 处理登录
  async handleLogin() {
    wx.showLoading({ title: '登录中...' })

    try {
      // 先清除旧的登录状态
      wx.clearStorageSync()

      // 导入API模块
      const api = require('../../utils/api/index');
      
      // 调用API进行登录
      const result = await api.user.login();

      if (result.code === 0 && result.data) {
        wx.setStorageSync('userInfo', result.data)
        this.setData({
          userInfo: result.data
        })

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.message || '登录失败')
      }
    } catch (err) {
      console.error('登录失败：', err)
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.clearStorageSync()

          // 更新页面状态
          this.setData({
            userInfo: null
          })

          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  },

  // 跳转到编辑页面
  goToEdit() {
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/profile/edit/edit',
      fail: (err) => {
        console.error('跳转失败：', err)
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        })
      }
    })
  },

  // 点击退出登录按钮
  onLogoutTap() {
    this.handleLogout()
  },

  // 处理头像选择
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    try {
      // 导入API模块
      const api = require('../../utils/api/index');
      
      // 调用API更新用户头像
      const result = await api.user.updateUser({
        avatarUrl
      });

      if (result.success) {
        // 更新本地存储的用户信息
        const userInfo = wx.getStorageSync('userInfo')
        userInfo.avatarUrl = avatarUrl
        wx.setStorageSync('userInfo', userInfo)

        this.setData({
          userInfo
        })

        wx.showToast({
          title: result.message || '头像更新成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: result.message || '头像更新失败',
          icon: 'none'
        })
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '头像更新失败',
        icon: 'none'
      })
    }
  },

    onFeedbackTap: function() {
        wx.navigateTo({
            url: '/pages/profile/feedback/feedback'
        });
    },

    onAboutTap: function() {
        wx.navigateTo({
            url: '/pages/profile/about/about'
        });
    }
})