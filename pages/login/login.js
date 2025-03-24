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
        
        logger.debug('云函数登录结果:', JSON.stringify(res).substring(0, 200) + '...');
        
        if (res && res.result && res.result.code === 0) {
          // 处理云函数登录成功结果
          const userData = res.result.data;
          
          // 记录同步结果日志
          logger.debug('用户同步结果:', res.result.syncResult || '未同步');
          
          // 标准格式化用户数据
          const formattedUserInfo = {
            // 主ID字段
            id: userData.id || userData._id || userData.openid,
            _id: userData._id || userData.id || userData.openid,
            // OpenID
            openid: userData.openid,
            wxapp_id: userData.openid,
            // 用户基本信息
            nickname: userData.nickName || userData.nick_name || '',
            nick_name: userData.nickName || userData.nick_name || '',
            avatar_url: userData.avatarUrl || userData.avatar || '',
            avatar: userData.avatarUrl || userData.avatar || '',
            gender: userData.gender || 0,
            // 兼容字段 - 提供微信小程序常用格式
            nickName: userData.nickName || userData.nick_name || '',
            avatarUrl: userData.avatarUrl || userData.avatar || '',
            // 同步状态
            server_synced: true
          };
          
          // 保存标准化的用户信息
          userManager.saveUserInfo(formattedUserInfo);
          
          // 使用新API同步用户信息到主服务器
          try {
            logger.debug('开始同步用户到主服务器...');
            
            const syncData = {
              openid: formattedUserInfo.openid,
              nick_name: formattedUserInfo.nickname,
              avatar: formattedUserInfo.avatar_url,
              gender: formattedUserInfo.gender
            };
            
            // 调用API同步用户数据
            const syncResult = await userAPI.syncUser(syncData);
            logger.debug('用户同步到服务器结果:', JSON.stringify(syncResult));
            
            // 检查同步是否成功
            if (syncResult && syncResult.code === 200 && syncResult.data) {
              // 合并服务器返回的用户数据
              const serverUserData = syncResult.data;
              
              // 创建合并后的用户数据
              const mergedUserInfo = {
                ...formattedUserInfo,
                // 服务器返回的字段
                id: serverUserData.id || formattedUserInfo.id,
                token_count: serverUserData.token_count || 0,
                likes_count: serverUserData.likes_count || 0,
                favorites_count: serverUserData.favorites_count || 0,
                followers_count: serverUserData.followers_count || 0,
                following_count: serverUserData.following_count || 0,
                create_time: serverUserData.create_time || new Date().toISOString(),
                update_time: serverUserData.update_time || new Date().toISOString(),
                last_login: serverUserData.last_login || new Date().toISOString(),
                server_synced: true
              };
              
              // 更新本地用户信息
              userManager.saveUserInfo(mergedUserInfo);
              logger.debug('用户数据同步成功，已合并服务器信息');
            }
          } catch (syncError) {
            logger.error('同步用户到主服务器失败:', syncError);
            // 同步失败不影响登录流程
          }
          
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
      userAPI.updateUser(userInfo.id, {
        avatar: avatarUrl
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