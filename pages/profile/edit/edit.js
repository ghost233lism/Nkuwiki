// pages/profile/edit/edit.js
// 避免模块导入失败
let userManager, userAPI, logger, uploadHelper;
try {
  userManager = require('../../../utils/user_manager');
  userAPI = require('../../../utils/api/user');
  const core = require('../../../utils/api/core');
  logger = core.logger;
  uploadHelper = require('../../../utils/upload_helper');
} catch (e) {
  console.error('模块导入失败:', e);
  // 创建简单的日志函数
  logger = {
    debug: console.debug,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
}

// 确保userAPI模块正确加载，显式检查并提供备用方案
const checkModules = () => {
  if (!userAPI) {
    console.error('userAPI模块加载失败，尝试重新加载');
    try {
      // 尝试直接加载模块对象
      const core = require('../../../utils/api/core');
      const API = core.API;
      // 创建简化版的userAPI对象
      return {
        updateUser: (openid, userData) => {
          console.debug('使用备用updateUser方法');
          return core.request({
            url: `${API.PREFIX.WXAPP}/users/${openid}`,
            method: 'PUT',
            data: userData,
            showLoading: true,
            loadingText: '保存中...'
          });
        }
      };
    } catch(e) {
      console.error('备用方案也失败:', e);
      wx.showModal({
        title: '系统错误',
        content: '用户API模块加载失败，请重启小程序',
        showCancel: false
      });
      return null;
    }
  }
  return userAPI;
};

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
    try {
      // 获取当前用户信息
      let user = null;
      
      // 尝试从userManager获取
      try {
        if (userManager && typeof userManager.getCurrentUser === 'function') {
          user = userManager.getCurrentUser();
        }
      } catch (e) {
        console.error('从userManager获取用户信息失败:', e);
      }
      
      // 如果userManager失败，尝试从本地存储获取
      if (!user) {
        try {
          user = wx.getStorageSync('userInfo');
        } catch (e) {
          console.error('从存储获取用户信息失败:', e);
        }
      }
      
      // 如果仍然没有获取到用户信息
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
      
      console.debug('已加载用户信息:', JSON.stringify(user, null, 2));
    } catch (err) {
      console.error('onLoad发生错误:', err);
      wx.showModal({
        title: '加载失败',
        content: '无法加载用户信息，请退出重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
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

  // 保存更改 - 完全重写
  saveChanges() {
    console.debug('开始保存用户信息...');
    
    // 创建安全的日志函数
    const log = {
      debug: (msg, data) => {
        try {
          console.debug(msg, data);
          if (logger && logger.debug) logger.debug(msg, data);
        } catch (e) {}
      },
      error: (msg, data) => {
        try {
          console.error(msg, data);
          if (logger && logger.error) logger.error(msg, data);
        } catch (e) {}
      }
    };
    
    try {
      const { modified, inputData } = this.data;
      
      // 检查是否有修改
      const hasModifications = Object.values(modified).some(v => v);
      log.debug('是否有字段被修改:', hasModifications);
      
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
      if (modified.nickname) updateData.nickname = inputData.nickname;
      if (modified.birthday) updateData.birthday = inputData.birthday;
      if (modified.wechatId) updateData.wechatId = inputData.wechatId;
      if (modified.qqId) updateData.qqId = inputData.qqId;
      if (modified.bio) updateData.bio = inputData.bio;
      
      log.debug('准备提交的更新数据:', JSON.stringify(updateData));
      
      // 获取用户openid
      const user = this.data.user;
      const openid = user.openid || user._id;
      log.debug('用户openid:', openid);
      
      if (!openid) {
        log.error('未找到有效的用户标识符');
        wx.showModal({
          title: '保存失败',
          content: '未找到有效的用户ID，请重新登录',
          showCancel: false
        });
        this.setData({ isUpdating: false });
        return;
      }
      
      // 直接使用wx.request发送请求
      log.debug('使用wx.request发送请求');
      wx.request({
        url: 'https://nkuwiki.com/api/wxapp/users/' + openid,
        method: 'PUT',
        data: updateData,
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          log.debug('请求成功:', res);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 本地更新数据
            try {
              // 创建更新后的用户对象
              const updatedUser = {
                ...user,
                ...updateData,
                update_time: new Date().toISOString()
              };
              
              // 更新本地存储
              try {
                wx.setStorageSync('userInfo', updatedUser);
                wx.setStorageSync('needRefreshUserInfo', true);
                wx.removeStorageSync('_cached_user_info');
                
                // 尝试更新userManager中的用户信息
                try {
                  // 使用更安全的方式调用userManager
                  if (userManager && typeof userManager.updateUserInfo === 'function') {
                    // 使用Promise方式处理
                    userManager.updateUserInfo(updatedUser)
                      .then(result => {
                        console.debug('userManager用户信息更新成功:', result);
                      })
                      .catch(error => {
                        // 仅记录错误，不影响后续流程
                        console.error('userManager.updateUserInfo失败，但已更新本地存储:', error);
                      });
                  } else {
                    // 备用方案，尝试多种可能的方法
                    console.debug('userManager.updateUserInfo方法不存在或不是函数，使用备用更新方式');
                    if (userManager && typeof userManager.saveUserInfo === 'function') {
                      userManager.saveUserInfo(updatedUser);
                    } else {
                      // 直接更新全局状态
                      const app = getApp();
                      if (app && app.globalData) {
                        app.globalData.userInfo = updatedUser;
                        if (app.globalDataChanged && typeof app.globalDataChanged === 'function') {
                          app.globalDataChanged('userInfo', updatedUser);
                        }
                      }
                    }
                  }
                } catch (userManagerError) {
                  // 仅记录错误，不影响后续流程
                  console.error('更新userManager异常，但已更新本地存储:', userManagerError);
                }
              } catch (storageError) {
                log.error('存储数据错误:', storageError);
              }
              
              // 更新页面数据
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
              
              // 显示成功提示
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              });
              
              // 延迟返回
              setTimeout(() => {
                // 标记存储，确保其他页面知道用户信息已更新
                try {
                  wx.setStorageSync('needRefreshUserInfo', true);
                  wx.removeStorageSync('_cached_user_info');
                } catch (e) {
                  log.error('设置刷新标记失败:', e);
                }
                
                // 返回上一页并触发刷新
                wx.navigateBack({
                  success: () => {
                    // 尝试刷新上一页
                    try {
                      // 获取页面栈
                      const pages = getCurrentPages();
                      if (pages.length > 1) {
                        const prevPage = pages[pages.length - 2]; // 上一页
                        
                        // 设置必要的刷新标记和数据
                        prevPage.setData({
                          forceRefresh: true,
                          updatedUserInfo: updatedUser
                        });
                        
                        // 尝试所有可能的刷新方法
                        if (typeof prevPage.refreshUserData === 'function') {
                          log.debug('调用上一页的refreshUserData方法');
                          prevPage.refreshUserData();
                        } else if (typeof prevPage.fetchUserInfo === 'function') {
                          log.debug('调用上一页的fetchUserInfo方法');
                          prevPage.fetchUserInfo();
                        } else if (typeof prevPage.getUserStats === 'function') {
                          log.debug('调用上一页的getUserStats方法');
                          const userId = updatedUser._id || updatedUser.id || updatedUser.openid;
                          prevPage.getUserStats(userId);
                        } else if (typeof prevPage.onShow === 'function') {
                          log.debug('调用上一页的onShow方法');
                          prevPage.onShow();
                        } else {
                          // 无法找到合适的刷新方法，可能需要重新加载整个页面
                          log.debug('无法找到合适的刷新方法，尝试重载页面');
                          const currentRoute = getCurrentPages()[getCurrentPages().length-2]?.route;
                          if (currentRoute) {
                            setTimeout(() => {
                              wx.reLaunch({
                                url: '/' + currentRoute
                              });
                            }, 100);
                          }
                        }
                      }
                    } catch (navError) {
                      log.error('通知上一页刷新失败:', navError);
                    }
                  }
                });
              }, 1000);
            } catch (successError) {
              log.error('处理成功响应时出错:', successError);
              wx.showToast({
                title: '保存成功，但刷新失败',
                icon: 'success'
              });
              setTimeout(() => wx.navigateBack(), 1500);
            }
          } else {
            // 处理非2xx响应
            log.error('请求失败，状态码:', res.statusCode);
            wx.showModal({
              title: '保存失败',
              content: `服务器返回错误 (${res.statusCode})`,
              showCancel: false
            });
          }
        },
        fail: (err) => {
          log.error('请求失败:', err);
          wx.showModal({
            title: '保存失败',
            content: '网络请求失败，请检查网络连接',
            showCancel: false
          });
        },
        complete: () => {
          this.setData({ isUpdating: false });
        }
      });
    } catch (error) {
      log.error('保存过程中出现异常:', error);
      wx.showModal({
        title: '保存失败',
        content: '发生未知错误',
        showCancel: false
      });
      this.setData({ isUpdating: false });
    }
  },
  
  // 头像加载错误处理
  handleAvatarError() {
    try {
      this.setData({
        'user.avatar': '/assets/icons/default-avatar.png'
      });
    } catch (e) {
      console.error('设置默认头像失败:', e);
    }
  }
});