const { storage, createApiClient, parseUrl } = require('../utils/util');
const baseBehavior = require('./baseBehavior');

// 使用createApiClient创建统一的用户API
const userApi = createApiClient('/api/wxapp/user', {
  profile: { method: 'GET',  path: '/profile', params: { openid: true, user_id: false, target_openid: false } },
  update:  { method: 'POST', path: '/update',  params: { openid: true } },
  follow:  { method: 'POST', path: '/follow',  params: { openid: true, followed_id: true } },
  status:  { method: 'GET',  path: '/status',  params: { openid: true, target_id: true, target_openid: false } }
});

module.exports = Behavior({
  behaviors: [baseBehavior],
  
  data: {
    // 可以保留一些特定的用户状态，但加载/错误状态由 baseBehavior 处理
    // e.g., viewedUserProfile: null // 如果需要存储查看的用户信息
  },
  
  methods: {
    // ==== 数据获取 ====

    /**
     * 获取指定用户ID的公开信息
     * @param {string} userId - 要获取信息的用户ID
     * @returns {Promise<object|null>} 用户信息或 null
     */
    async _getUserProfileById(userId) {
      if (!userId) return this.handleError(new Error('缺少用户ID'), '缺少用户ID');
      // 可以显示加载状态，如果这是一个主要操作
      // this.showLoading('加载用户信息...');
      try {
        const res = await userApi.profile({
          user_id: userId,
          openid: storage.get('openid') // 传递当前用户 openid 用于获取关系状态等
        });
        if (res.code !== 200) throw new Error(res.message || '获取用户信息失败');
        // 直接返回 API 数据，格式化交给视图层
        return res.data;
      } catch (err) {
        this.handleError(err, err.message || '获取用户信息失败');
        return null;
      } finally {
        // this.hideLoading();
      }
    },

    /**
     * 获取指定openid的用户公开信息
     * @param {string} targetOpenid - 要获取信息的用户openid
     * @returns {Promise<object|null>} 用户信息或 null
     */
    async _getUserProfileByOpenid(targetOpenid) {
      if (!targetOpenid) return this.handleError(new Error('缺少用户openid'), '缺少用户openid');
      try {
        const res = await userApi.profile({
          target_openid: targetOpenid,
          openid: storage.get('openid') // 传递当前用户 openid 用于获取关系状态等
        });
        if (res.code !== 200) throw new Error(res.message || '获取用户信息失败');
        return res.data;
      } catch (err) {
        console.debug('获取用户信息失败:', err);
        return null;
      }
    },

    /**
     * 根据帖子获取作者信息并补充到帖子对象
     * @param {object} post - 帖子对象
     * @returns {Promise<object>} 补充了作者信息的帖子对象
     */
    async _enrichPostWithUserInfo(post) {
      if (!post || !post.openid) return post;
      
      try {
        // 尝试获取用户信息
        const userInfo = await this._getUserProfileByOpenid(post.openid);
        if (userInfo) {
          // 补充用户信息到帖子
          return {
            ...post,
            bio: userInfo.bio,
            // 其他可能需要的用户信息字段
          };
        }
      } catch (err) {
        console.debug('补充作者信息失败:', err);
      }
      
      return post;
    },

    /**
     * 获取当前登录用户的信息 (已在 authBehavior 中实现，按需保留或移除)
     * 这里假设 authBehavior._getUserInfo 是首选方法
     * 如果 userBehavior 独立使用或需要不同逻辑，可以保留此实现
     */
    // async _getUserInfo() { ... } // 参考 authBehavior._getUserInfo

    /**
     * 获取当前用户与目标用户的关系状态 (如是否关注)
     * @param {string} targetUserId - 目标用户ID
     * @returns {Promise<object|null>} 关系状态或 null
     */
    async _getUserStatus(targetUserId) {
      if (!targetUserId) return null;
      const openid = storage.get('openid');
      if (!openid) return null; // 未登录无法获取关系

      try {
        const res = await userApi.status({ openid, target_id: targetUserId });
        return res.code === 200 ? res.data : null;
      } catch (err) {
        console.debug('获取用户关系状态失败:', err);
        // 一般不需提示用户
        return null;
      }
    },

    /**
     * 获取当前用户与目标用户的关系状态(使用openid)
     * @param {string} targetOpenid - 目标用户openid
     * @returns {Promise<object|null>} 关系状态或 null
     */
    async _getUserStatusByOpenid(targetOpenid) {
      if (!targetOpenid) return null;
      const openid = storage.get('openid');
      if (!openid) return null; // 未登录无法获取关系

      try {
        const res = await userApi.status({ openid, target_openid: targetOpenid });
        return res.code === 200 ? res.data : null;
      } catch (err) {
        console.debug('获取用户关系状态失败:', err);
        return null;
      }
    },

    // ==== 用户操作 ====

    /**
     * 更新当前登录用户的资料
     * @param {object} profileData - 需要更新的字段对象
     * @returns {Promise<object|null>} 更新后的用户信息或 null
     */
    async _updateUserProfile(profileData) {
      // 检查登录状态
      const isLoggedIn = await this._checkLogin(); // 假设 _checkLogin 可用
      if (!isLoggedIn) return null;

      // 可以加入 baseBehavior 的表单校验 (如果 profileData 来自表单)
      // this.initForm(profileData);
      // const rules = { /* 定义校验规则 */ };
      // const isValid = this.validateForm(rules);
      // if (!isValid) { this.showFormError(); return null; }
      // const dataToSubmit = this.getForm(); // 获取校验后的数据

      const dataToSubmit = profileData; // 直接使用传入数据，或校验后数据

      // this.updateState({ formSubmitting: true }); // 使用 baseBehavior 状态
      this.showLoading('更新中...');

      try {
        const openid = storage.get('openid');
        const res = await userApi.update({ ...dataToSubmit, openid });
        if (res.code !== 200) throw new Error(res.message || '更新资料失败');

        // 更新成功后，更新本地缓存和全局状态
        const updatedUserInfo = res.data;
        storage.set('userInfo', updatedUserInfo);
        const app = getApp();
        if (app?.globalData) app.globalData.userInfo = updatedUserInfo;
        // 如果当前页面显示用户信息，也需要更新页面 data

        this.showToast('更新成功', 'success'); // 使用 baseBehavior.showToast
        return updatedUserInfo;
      } catch (err) {
        this.handleError(err, err.message || '更新资料失败'); // 使用 baseBehavior.handleError
        return null;
      } finally {
        // this.updateState({ formSubmitting: false });
        this.hideLoading();
      }
    },

    /**
     * 切换对目标用户的关注状态
     * @param {string} followedUserId - 被关注/取消关注的用户ID
     * @returns {Promise<object|null>} 操作结果或 null
     */
    async _toggleFollow(followedUserId) {
      if (!followedUserId) return null;
      // 检查登录
      const isLoggedIn = await this._checkLogin();
      if (!isLoggedIn) return null;

      // TODO: 添加操作进行中状态，防止重复点击
      // if (this.data.isFollowing) return;
      // this.updateState({ isFollowing: true });

      try {
        const openid = storage.get('openid');
        const res = await userApi.follow({ followed_id: followedUserId, openid });
        if (res.code !== 200 || !res.data) throw new Error(res.message || '操作失败');

        const message = res.data.status === 'followed' ? '关注成功' : '已取消关注';
        this.showToast(message, 'success');

        // TODO: 可能需要更新页面的关注状态显示
        // this.updateState({ 'viewedUserProfile.is_following': res.data.status === 'followed' });

        return res.data; // 返回包含最新状态的结果
      } catch (err) {
        this.handleError(err, err.message || '操作失败');
        return null;
      } finally {
        // this.updateState({ isFollowing: false });
      }
    },

    // ==== 导航与事件处理 ====

    /**
     * 跳转到指定用户的个人主页
     * @param {string} userId
     */
    _navigateToUserProfile(userId) {
      if (userId) this.navigateTo('/pages/profile/profile', { id: userId }); // 使用 baseBehavior.navigateTo
    },

    /**
     * 跳转到编辑当前用户资料的页面
     */
    _navigateToEditProfile() {
      // 检查登录
      const openid = storage.get('openid');
      if (!openid) {
         // 考虑调用 _checkLogin 提示并询问跳转登录
         this._checkLogin();
         return;
      }
      this.navigateTo('/pages/profile/edit/edit'); // 使用 baseBehavior.navigateTo
    },

    /**
     * 处理头像点击 (跳转到当前登录用户的个人主页)
     */
    _handleAvatarTap() {
      // 检查登录 (仅本地，不打断)
      const openid = storage.get('openid');
      if (!openid) {
        this.showToast('请先登录', 'error');
        // 不强制跳转登录，由用户决定后续操作
        return;
      }
      // 跳转到 tabBar 页面
      this.switchTab('/pages/profile/profile'); // 使用 baseBehavior.switchTab
    }
  }
}); 