// app.js
const {getSystemInfo, createApiClient, storage, nav} = require('./utils/index');

App({
  async onLaunch() {
    if (!wx.cloud) {console.debug('请使用 2.2.3 或以上的基础库以使用云能力');}
    else {wx.cloud.init({env: this.globalData.cloudEnv, traceUser: true});}
    
    // 获取系统信息并存储
    const systemInfo = getSystemInfo();
    storage.set('systemInfo', systemInfo);
    
    // 更新状态栏高度到全局数据
    this.globalData.statusBarHeight = systemInfo.statusBarHeight || 20;
    
    storage.set('defaultAvatar', this.globalData.defaultAvatar);
    
    const aboutApi = createApiClient('/api/wxapp', {about: {method: 'GET', path: '/about'}});
    try {
      const res = await aboutApi.about();
      if (res.code === 200) {
        storage.set('aboutInfo', res.data);
        const isLoggedIn = storage.get('isLoggedIn');

        if(!isLoggedIn){
          nav.reLaunch('/pages/login/login');
        }else nav.reLaunch('/pages/index/index');
      }
    } catch (err) {throw err;}
  },
  globalData: {
    defaultAvatar: 'cloud://nkuwiki-0g6bkdy9e8455d93.6e6b-nkuwiki-0g6bkdy9e8455d93-1346872102/default/default-avatar.png',
    cloudEnv: 'nkuwiki-0g6bkdy9e8455d93',
    version: '0.0.1',
    API_CONFIG: {
      base_url: 'https://nkuwiki.com',
      api_prefix: '/api',
      prefixes: {wxapp: '/wxapp', agent: '/agent'},
      headers: {'Content-Type': 'application/json'}
    }
  }
});
