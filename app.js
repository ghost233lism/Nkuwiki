// app.js
const {getSystemInfo, createApiClient, storage, nav} = require('./utils/index');

App({
  async onLaunch() {
    try {
      if (!wx.cloud) {
        console.debug('请使用 2.2.3 或以上的基础库以使用云能力');
      } else {
        wx.cloud.init({
          env: this.globalData.cloudEnv, 
          traceUser: true
        });
      }
      
      // 获取系统信息并存储
      const systemInfo = getSystemInfo();
      storage.set('systemInfo', systemInfo);
      
      // 更新状态栏高度到全局数据
      this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20;
      
      storage.set('defaultAvatar', this.globalData.defaultAvatar);
      
      // 设置超时，防止about接口阻塞启动
      const aboutPromise = new Promise(async (resolve) => {
        const aboutApi = createApiClient('/api/wxapp', {about: {method: 'GET', path: '/about'}});
        try {
          const res = await aboutApi.about();
          if (res.code === 200) {
            storage.set('aboutInfo', res.data);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (err) {
          console.debug('获取关于信息失败', err);
          resolve(false);
        }
      });
      
      // 5秒超时
      const timeoutPromise = new Promise(resolve => {
        setTimeout(() => resolve(false), 5000);
      });
      
      // 不管about接口结果如何，都继续导航
      await Promise.race([aboutPromise, timeoutPromise]);
      
      // 导航到首页或登录页
      const isLoggedIn = storage.get('isLoggedIn');
      try {
        if (!isLoggedIn) {
          await nav.reLaunch('/pages/login/login');
        } else {
          await nav.reLaunch('/pages/index/index');
        }
      } catch (err) {
        console.debug('导航失败，尝试直接跳转', err);
        // 直接使用wx API尝试再次导航
        wx.reLaunch({
          url: isLoggedIn ? '/pages/index/index' : '/pages/login/login',
          fail: () => {
            console.error('导航重试失败，可能需要重启小程序');
          }
        });
      }
    } catch (err) {
      console.error('应用启动失败', err);
    }
  },
  
  globalData: {
    defaultAvatar: 'cloud://cloud1-7gu881ir0a233c29.636c-cloud1-7gu881ir0a233c29-1352978573/avatar1.png',
    cloudEnv: 'cloud1-7gu881ir0a233c29',
    version: '0.0.1',
    API_CONFIG: {
      base_url: 'https://nkuwiki.com',
      api_prefix: '/api',
      prefixes: {wxapp: '/wxapp', agent: '/agent'},
      headers: {'Content-Type': 'application/json'}
    }
  }
});
