// pages/profile/edit/edit.js
const userManager = require('../../../utils/user_manager');
const userAPI = require('../../../utils/api/user');
const { logger } = require('../../../utils/api/core');
const uploadHelper = require('../../../utils/upload_helper');

Page({
  data: {
    user: null,
    isUpdating: false,
    showDatePicker: false,
    dateValue: "",
    inputData: {
      nickname: '',
      birthday: '',
      wechatId: '',
      qqId: '',
      bio: ''
    },
    modified: {
      nickname: false,
      birthday: false,
      wechatId: false,
      qqId: false,
      bio: false,
      avatar: false
    }
  },

  onLoad() {
    // 获取当前用户信息
    const user = userManager.getCurrentUser();
    if (!user) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 设置已有的用户信息
    this.setData({
      user,
      inputData: {
        nickname: user.nickname || '',
        birthday: user.birthday || '',
        wechatId: user.wechatId || '',
        qqId: user.qqId || '',
        bio: user.bio || ''
      }
    });

    logger.debug('已加载用户信息:', this.data.user);
  },

  // 处理微信头像选择
  onChooseAvatar(e) {
    logger.debug('微信头像选择事件:', e);
    
    if (!e.detail || !e.detail.avatarUrl) {
      logger.error('未获取到微信头像URL');
      wx.showToast({
        title: '获取头像失败',
        icon: 'none'
      });
      return;
    }
    
    const avatarUrl = e.detail.avatarUrl;
    logger.debug('获取到微信头像URL:', avatarUrl);
    
    // 显示上传中提示
    wx.showLoading({
      title: '头像处理中...',
      mask: true
    });
    
    // 先下载头像到本地临时文件
    wx.downloadFile({
      url: avatarUrl,
      success: res => {
        if (res.statusCode !== 200) {
          logger.error(`下载头像失败，状态码: ${res.statusCode}`);
          wx.hideLoading();
          wx.showToast({
            title: '下载头像失败',
            icon: 'none'
          });
          return;
        }
        
        const tempFilePath = res.tempFilePath;
        logger.debug('头像已下载到临时文件:', tempFilePath);
        
        // 检查文件是否存在
        wx.getFileInfo({
          filePath: tempFilePath,
          success: fileInfo => {
            logger.debug('临时文件信息:', fileInfo);
            // 使用上传工具上传头像到云存储
            this.uploadAvatarToCloud(tempFilePath);
          },
          fail: err => {
            logger.error('获取临时文件信息失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '头像处理失败',
              icon: 'none'
            });
          }
        });
      },
      fail: err => {
        logger.error('下载头像失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '下载头像失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 上传头像到云存储
  async uploadAvatarToCloud(filePath) {
    try {
      this.setData({ isUpdating: true });
      
      // 获取用户openid
      const openid = this.data.user.openid || this.data.user._id || 'anonymous';
      logger.debug('准备上传头像，用户openid:', openid);
      
      // 检查云开发环境
      if (!wx.cloud) {
        logger.error('云开发SDK未找到，请确认是否在app.js中初始化云开发');
        wx.showModal({
          title: '上传失败',
          content: '云存储未初始化，请检查网络或重启小程序后再试',
          showCancel: false
        });
        throw new Error('云开发SDK未初始化');
      }
      
      // 获取云环境ID
      let cloudEnvId = null;
      try {
        const app = getApp();
        cloudEnvId = app && app.globalData && app.globalData.cloudEnvId;
        logger.debug('当前云环境ID:', cloudEnvId);
      } catch (e) {
        logger.error('获取云环境ID失败:', e);
      }
      
      // 检查文件是否可读
      try {
        const fs = wx.getFileSystemManager();
        const fileStats = fs.statSync(filePath);
        logger.debug('文件状态:', fileStats);
      } catch (fsError) {
        logger.error('文件系统检查失败:', fsError);
      }
      
      // 使用上传助手上传头像到云存储
      logger.debug('开始上传头像...');
      // 参数: 文件路径, 模块名称, openid, 是否压缩(默认true), 压缩质量(默认80), 最大宽度(默认400)
      const fileID = await uploadHelper.uploadImage(filePath, 'avatars', openid, true, 80, 400);
      
      if (!fileID) {
        throw new Error('上传头像失败: 未获取到云文件ID');
      }
      
      logger.debug('头像上传成功, 云文件ID:', fileID);
      
      // 创建包含头像信息的更新对象
      const updateData = { avatar: fileID };
      
      logger.debug('准备更新用户头像，数据:', updateData);
      
      try {
        // 更新用户头像信息
        const result = await userAPI.updateUser(openid, updateData);
        
        // 检查API调用结果
        if (result) {
          logger.debug('用户头像信息更新成功:', result);
          
          // 更新本地数据
          const updatedUser = {...this.data.user, avatar: fileID};
          userManager.updateUserInfo(updatedUser);
          
          this.setData({
            user: updatedUser,
            'modified.avatar': false
          });
          
          wx.hideLoading();
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          });
          
          logger.debug('用户头像更新成功');
        } else {
          // 后端响应但结果为空
          logger.error('更新用户头像响应为空');
          throw new Error('更新头像失败: 服务器响应为空');
        }
      } catch (apiError) {
        // API调用过程出错
        logger.error('头像更新API调用失败:', apiError);
        throw apiError;
      }
    } catch (error) {
      logger.error('头像上传失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '头像更新失败',
        icon: 'none',
        duration: 2000
      });
      
      // 显示详细错误信息
      setTimeout(() => {
        let errorMsg = error.message || '未知错误';
        
        // 针对常见错误提供更友好的提示
        if (errorMsg.includes('云开发环境未初始化') || errorMsg.includes('SDK未初始化')) {
          errorMsg = '云存储未准备好，请退出小程序重新进入后再试';
        } else if (errorMsg.includes('access denied') || errorMsg.includes('permission denied')) {
          errorMsg = '没有权限上传文件，请联系客服';
        } else if (errorMsg.includes('file size limit exceeded')) {
          errorMsg = '文件太大，请选择较小的图片';
        } else if (errorMsg.includes('network')) {
          errorMsg = '网络连接不稳定，请检查网络后重试';
        }
        
        wx.showModal({
          title: '头像上传失败',
          content: errorMsg,
          showCancel: false
        });
      }, 1000);
    } finally {
      this.setData({ isUpdating: false });
    }
  },

  // 昵称输入
  onNicknameInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.nickname': value,
      'modified.nickname': value !== this.data.user.nickname
    });
  },

  // 生日选择
  onBirthdayChange(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.birthday': value,
      'modified.birthday': value !== this.data.user.birthday
    });
  },

  // 微信ID输入
  onWechatIdInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.wechatId': value,
      'modified.wechatId': value !== this.data.user.wechatId
    });
  },

  // QQ号输入
  onQQIdInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.qqId': value,
      'modified.qqId': value !== this.data.user.qqId
    });
  },

  // 个人简介输入
  onBioInput(e) {
    const value = e.detail.value;
    this.setData({
      'inputData.bio': value,
      'modified.bio': value !== this.data.user.bio
    });
  },

  // 保存更改
  async saveChanges() {
    try {
      const { modified, inputData } = this.data;
      
      // 检查是否有修改
      const hasModifications = Object.values(modified).some(v => v);
      if (!hasModifications) {
        wx.showToast({
          title: '未做任何修改',
          icon: 'none'
        });
        return;
      }
      
      this.setData({ isUpdating: true });
      
      // 构建更新对象，只包含修改过的字段
      const updateData = {};
      
      // 添加所有修改过的字段
      if (modified.nickname) {
        updateData.nickname = inputData.nickname;
        updateData.nickName = inputData.nickname; // 兼容微信字段
        updateData.nick_name = inputData.nickname; // 兼容后端字段
      }
      if (modified.birthday) updateData.birthday = inputData.birthday;
      if (modified.wechatId) updateData.wechatId = inputData.wechatId;
      if (modified.qqId) updateData.qqId = inputData.qqId;
      if (modified.bio) updateData.bio = inputData.bio;
      
      // 获取用户openid
      const openid = this.data.user.openid || this.data.user._id || this.data.user.wxapp_id;
      if (!openid) {
        logger.error('未找到有效的用户标识符');
        throw new Error('未找到有效的用户ID，请重新登录');
      }
      
      logger.info('准备更新用户信息，openid:', openid, '数据:', JSON.stringify(updateData));
      
      // 确保更新对象中有昵称和个性签名的debug日志
      logger.info('更新对象包含昵称:', !!updateData.nickname, '包含个性签名:', !!updateData.bio);
      
      try {
        // 调用API更新用户信息
        const result = await userAPI.updateUser(openid, updateData, true); // 添加showError=true参数
        
        // 检查API调用结果
        if (result && result.code === 0) {
          logger.info('用户信息更新成功:', JSON.stringify(result));
          
          // 更新本地用户数据 - 合并旧数据和新数据
          const updatedUser = {
            ...this.data.user,
            ...updateData,
            update_time: new Date().toISOString()
          };
          
          // 1. 更新用户数据到user_manager中
          const updateResult = userManager.updateUserInfo(updatedUser);
          logger.info('更新user_manager中的用户信息:', updateResult ? '成功' : '失败');
          
          // 2. 强制清理用户数据缓存
          wx.removeStorageSync('_cached_user_info');
          
          // 3. 更新全局用户数据
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = updatedUser;
            // 触发全局更新事件
            if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
              app.globalDataChanged('userInfo', updatedUser);
            }
          }
          
          // 4. 重置应用程序状态 - 设置刷新标记
          wx.setStorageSync('needRefreshUserInfo', true);
          
          // 5. 强制所有页面刷新用户信息 
          try {
            const pages = getCurrentPages();
            logger.debug('当前页面栈:', pages.length);
            pages.forEach((page, index) => {
              if (page && typeof page.fetchUserInfo === 'function') {
                logger.debug(`尝试刷新页面[${index}].${page.route}的用户信息`);
                try {
                  page.fetchUserInfo();
                } catch (err) {
                  logger.error(`页面[${index}].${page.route}刷新用户信息失败:`, err);
                }
              } else if (page) {
                logger.debug(`页面[${index}].${page.route}没有fetchUserInfo方法`);
              }
            });
          } catch (pagesError) {
            logger.error('刷新页面栈失败:', pagesError);
          }
          
          // 显示成功提示
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 重置修改状态
          this.setData({
            user: updatedUser,
            modified: {
              nickname: false,
              birthday: false,
              wechatId: false,
              qqId: false,
              bio: false,
              avatar: false
            }
          });
          
          // 延迟返回
          setTimeout(() => {
            // 打印最终保存的用户信息，确认fields都存在
            logger.info('最终保存的用户信息:', JSON.stringify({
              nickname: updatedUser.nickname,
              nickName: updatedUser.nickName,
              nick_name: updatedUser.nick_name,
              bio: updatedUser.bio,
              openid: updatedUser.openid,
              wxapp_id: updatedUser.wxapp_id
            }));
            
            wx.navigateBack({
              success: () => {
                // 通知上一页需要刷新
                try {
                  const pages = getCurrentPages();
                  // 检查是否有上一页
                  if (pages.length > 0) {
                    const prevPage = pages[pages.length - 1]; // 返回后的当前页
                    if (prevPage) {
                      // 通过直接修改页面数据确保刷新
                      prevPage.setData({
                        forceRefresh: true
                      });
                      
                      // 如果存在专门的刷新方法，调用它
                      if (typeof prevPage.onShow === 'function') {
                        prevPage.onShow();
                      }
                      if (typeof prevPage.fetchUserInfo === 'function') {
                        prevPage.fetchUserInfo();
                      }
                    }
                  }
                } catch (navError) {
                  logger.error('通知上一页刷新失败:', navError);
                }
              }
            });
          }, 1500);
        } else {
          // 后端响应但结果为失败
          const errorMsg = (result && result.message) || '服务器响应错误';
          logger.error('更新用户信息响应失败:', errorMsg);
          throw new Error(`保存失败: ${errorMsg}`);
        }
      } catch (apiError) {
        // API调用过程出错
        logger.error('API调用失败:', apiError);
        throw apiError;
      }
    } catch (error) {
      logger.error('保存个人信息失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
      
      // 显示详细错误信息
      setTimeout(() => {
        wx.showModal({
          title: '保存用户信息失败',
          content: error.message || '未知错误，请检查网络后重试',
          showCancel: false
        });
      }, 1000);
    } finally {
      this.setData({ isUpdating: false });
    }
  },
  
  // 头像加载错误处理
  handleAvatarError() {
    this.setData({
      'user.avatar': '/assets/icons/default-avatar.png'
    });
  }
});