// 引入API工具
const { userAPI, logger } = require('../../utils/api/index');
const userManager = require('../../utils/user_manager');

Page({
  data: {
    loading: false,
    showAvatarButton: false
  },

  // 微信一键登录
  async handleWxLogin() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      // 使用微信官方登录方法获取code
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: (res) => {
            if (res.code) {
              resolve(res);
            } else {
              reject(new Error(res.errMsg || '获取登录凭证失败'));
            }
          },
          fail: (err) => {
            reject(new Error(err.errMsg || '登录失败'));
          }
        });
      });
      
      logger.debug('获取登录code成功:', loginResult.code);
      
      // 使用云函数登录
      try {
        const res = await wx.cloud.callFunction({
          name: 'login',
          data: {},
          config: {
            env: 'nkuwiki-0g6bkdy9e8455d93'
          }
        });
        
        logger.debug('云函数登录结果:', res);
        
        if (res && res.result && res.result.code === 0) {
          // 处理云函数登录成功结果
          const userInfo = res.result.data;
          
          // 标准格式化用户数据
          const formattedUserInfo = {
            id: userInfo._id,
            _id: userInfo._id,
            wxapp_id: userInfo.openid,
            openid: userInfo.openid,
            unionid: userInfo.unionid || '',
            nickname: userInfo.nickName || '',
            avatar_url: userInfo.avatarUrl || '',
            gender: userInfo.gender || 0,
            // 兼容字段
            nickName: userInfo.nickName || '',
            avatarUrl: userInfo.avatarUrl || ''
          };
          
          // 保存用户信息
          userManager.saveUserInfo(formattedUserInfo);
          
          // 登录成功跳转
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500
          });
          
          // 延迟跳转，让用户看到成功提示
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' });
          }, 1500);
          
          return;
        } else {
          throw new Error((res && res.result && res.result.message) || '登录失败');
        }
      } catch (cloudError) {
        logger.error('云函数登录失败:', cloudError);
        throw new Error('登录失败，请稍后重试');
      }
    } catch (err) {
      logger.error('登录过程出错:', err);
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    // 使用用户管理器
    const userInfo = userManager.getCurrentUser();
    
    // 更新头像
    userManager.updateUserInfo({ avatar_url: avatarUrl });
    
    // 如果已登录，更新后端用户信息
    if (userInfo.id) {
      userAPI.updateUserInfo(userInfo.id, {
        avatar_url: avatarUrl
      }).catch(err => {
        logger.error('更新头像失败:', err);
      });
    }
    
    wx.showToast({
      title: '头像已更新',
      icon: 'success'
    });
  }
}) 