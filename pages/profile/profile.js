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
    if (!this.data.userInfo) return

    try {
      console.log('开始获取用户帖子数量')
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'getUserPosts',
        data: {
          countOnly: true,
          openid: this.data.userInfo._id || this.data.userInfo.openid
        }
      })

      console.log('获取帖子数量结果:', res.result)

      if (res.result && res.result.success) {
        // 更新本地用户信息中的帖子数量
        const userInfo = this.data.userInfo
        userInfo.posts = res.result.count

        // 更新页面显示和本地存储
        this.setData({ userInfo })
        wx.setStorageSync('userInfo', userInfo)
        console.log('更新后的帖子数量:', userInfo.posts)
      }

      wx.hideLoading()
    } catch (err) {
      console.error('获取帖子数量失败：', err)
      wx.hideLoading()
    }
  },

  // 获取用户获赞总数
  async getUserTotalLikes() {
    if (!this.data.userInfo) return

    try {
      console.log('开始获取用户获赞总数')
      wx.showLoading({ title: '加载中...' })

      const res = await wx.cloud.callFunction({
        name: 'getUserPosts',
        data: {
          openid: this.data.userInfo._id || this.data.userInfo.openid,
          includePostData: true  // 请求包含帖子数据
        }
      })

      console.log('获取用户帖子结果:', res.result)

      if (res.result && res.result.success && res.result.posts) {
        // 计算所有帖子的点赞总数
        let totalLikes = 0
        res.result.posts.forEach(post => {
          totalLikes += (post.likes || 0)
        })

        // 更新页面显示
        this.setData({ totalLikes })
        console.log('用户获赞总数:', totalLikes)
      }

      wx.hideLoading()
    } catch (err) {
      console.error('获取获赞总数失败：', err)
      wx.hideLoading()
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

      const { result } = await wx.cloud.callFunction({
        name: 'login'
      })

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
      // 调用更新用户信息的云函数
      const res = await wx.cloud.callFunction({
        name: 'updateUser',
        data: {
          avatarUrl
        }
      })

      if (res.result.code === 0) {
        // 更新本地存储的用户信息
        const userInfo = wx.getStorageSync('userInfo')
        userInfo.avatarUrl = avatarUrl
        wx.setStorageSync('userInfo', userInfo)

        this.setData({
          userInfo
        })

        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        })
      }
    } catch (err) {
      wx.showToast({
        title: '头像更新失败',
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