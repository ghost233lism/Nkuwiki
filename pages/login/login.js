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
          
          // 记录同步结果日志
          logger.debug('用户同步结果:', res.result.syncResult || '未同步');
          
          // 标准格式化用户数据 - 使用云数据库ID
          const formattedUserInfo = {
            // 优先使用云ID - 不再使用main_server_id
            id: userInfo._id,
            _id: userInfo._id,
            // 记录同步状态
            server_synced: userInfo.server_synced || false,
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
          
          // 保存标准化的用户信息
          userManager.saveUserInfo(formattedUserInfo);
          
          // 确保服务器已同步用户信息，等待一定时间并添加重试机制
          if (formattedUserInfo.id) {
            logger.debug('等待服务器同步用户数据...');
            // 添加延迟和重试，等待同步完成
            const verifyUserSync = async (retryCount = 5, delay = 1500) => {
              try {
                // 首次尝试前先等待一段时间，让服务器有时间完成同步
                await new Promise(resolve => setTimeout(resolve, delay));
                
                logger.debug(`尝试验证用户同步状态(剩余${retryCount}次): ${formattedUserInfo.id}`);
                // 附加随机参数避免缓存
                const timestamp = new Date().getTime();
                const userData = await userAPI.getUserInfo(`${formattedUserInfo.id}?t=${timestamp}`);
                
                if (userData) {
                  logger.debug('成功获取服务器用户信息:', userData);
                  // 合并服务器数据，但保留云ID作为主ID
                  const mergedData = {
                    ...userData,
                    id: formattedUserInfo.id,    // 保持云ID
                    _id: formattedUserInfo._id   // 保持云ID
                  };
                  
                  // 更新本地用户信息
                  userManager.saveUserInfo(mergedData);
                  return true;
                } else {
                  throw new Error('服务器返回空数据');
                }
              } catch (verifyError) {
                logger.warn(`验证用户同步状态失败(剩余${retryCount}次):`, verifyError);
                if (retryCount > 0) {
                  // 增加延迟时间，指数退避
                  const nextDelay = delay * 1.5;
                  return verifyUserSync(retryCount - 1, nextDelay);
                } else {
                  logger.error('用户同步验证重试次数已用完，使用本地数据继续');
                  return false;
                }
              }
            };
            
            // 执行验证但不阻塞登录流程
            verifyUserSync().catch(err => {
              logger.error('用户同步验证过程出错:', err);
            });
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