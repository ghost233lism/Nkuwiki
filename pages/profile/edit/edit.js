// pages/profile/edit/edit.js
Page({
  data: {
    userInfo: null,
    newNickName: '',  // 用于存储修改后的昵称
    newStatus: ''     // 用于存储修改后的个性签名
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    // 初始化时，将现有信息填入输入框
    this.setData({ 
      userInfo,
      newNickName: userInfo.nickName || '',  // 显示现有昵称
      newStatus: userInfo.status || ''        // 显示现有个性签名
    })
  },

  // 微信用户的头像选择处理
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.updateAvatar(avatarUrl)
  },

  // 邮箱用户的头像选择处理
  async onChooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      
      if (res.tempFilePaths && res.tempFilePaths[0]) {
        this.updateAvatar(res.tempFilePaths[0])
      }
    } catch (err) {
      console.error('选择图片失败:', err)
      wx.showToast({
        title: '选择图片失败',
        icon: 'none'
      })
    }
  },

  // 统一的头像更新处理
  async updateAvatar(avatarUrl) {
    try {
      wx.showLoading({ title: '更新中...' })

      // 上传图片到云存储
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `avatars/${this.data.userInfo._id}_${Date.now()}.jpg`,
        filePath: avatarUrl
      })

      if (!uploadRes.fileID) {
        throw new Error('上传失败')
      }

      // 调用更新用户信息的云函数
      const res = await wx.cloud.callFunction({
        name: 'updateUser',
        data: {
          avatarUrl: uploadRes.fileID,
          userId: this.data.userInfo._id,  // 添加用户ID
          loginType: this.data.userInfo.loginType  // 添加登录类型
        }
      })

      if (res.result.code === 0) {
        // 更新本地存储和页面数据
        const userInfo = this.data.userInfo
        userInfo.avatarUrl = uploadRes.fileID
        wx.setStorageSync('userInfo', userInfo)
        this.setData({ userInfo })

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
      } else {
        throw new Error(res.result.message || '更新失败')
      }
    } catch (err) {
      console.error('更新头像失败:', err)
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 处理昵称输入
  onInputNickName(e) {
    this.setData({
      newNickName: e.detail.value
    })
  },

  // 处理个性签名输入
  onInputStatus(e) {
    this.setData({
      newStatus: e.detail.value
    })
  },

  // 保存修改
  async saveChanges() {
    try {
      wx.showLoading({ title: '保存中...' })
      
      // 构建更新数据，只包含已修改的字段
      const updateData = {
        userId: this.data.userInfo._id,
        loginType: this.data.userInfo.loginType
      }

      // 只有当内容真正发生变化时才更新
      if (this.data.newNickName !== this.data.userInfo.nickName) {
        updateData.nickName = this.data.newNickName
      }

      if (this.data.newStatus !== this.data.userInfo.status) {
        updateData.status = this.data.newStatus
      }

      // 如果没有任何字段需要更新，直接返回
      if (Object.keys(updateData).length <= 2) {  // 只有 userId 和 loginType
        wx.hideLoading()
        wx.showToast({
          title: '未做任何修改',
          icon: 'none'
        })
        return
      }

      const res = await wx.cloud.callFunction({
        name: 'updateUser',
        data: updateData
      })

      if (res.result.success) {
        // 更新本地存储中已修改的字段
        const userInfo = this.data.userInfo
        if (updateData.nickName) userInfo.nickName = updateData.nickName
        if (updateData.status) userInfo.status = updateData.status
        wx.setStorageSync('userInfo', userInfo)

        wx.hideLoading()
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        throw new Error(res.result.message || '保存失败')
      }
    } catch (err) {
      console.error('保存失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
})