/**
 * 基础行为 - 整合所有页面通用的功能
 */
const { ui, nav, error, storage, ToastType } = require('../utils/util');

// 验证规则
const ValidationRules = {
  required: (value, message = '此项不能为空') => {
    if (value === null || value === undefined || value === '') return message;
    if (Array.isArray(value) && value.length === 0) return message;
    return '';
  },
  minLength: (value, length, message = `长度不能少于${length}个字符`) => {
    if (!value || value.length < length) return message;
    return '';
  },
  maxLength: (value, length, message = `长度不能超过${length}个字符`) => {
    if (value && value.length > length) return message;
    return '';
  },
  length: (value, [min, max], message = `长度应在${min}~${max}个字符之间`) => {
    if (!value || value.length < min || value.length > max) return message;
    return '';
  },
  pattern: (value, pattern, message = '格式不正确') => {
    if (!value || !pattern.test(value)) return message;
    return '';
  },
  phone: (value, message = '请输入正确的手机号') => {
    const phonePattern = /^1[3-9]\d{9}$/;
    return ValidationRules.pattern(value, phonePattern, message);
  },
  email: (value, message = '请输入正确的邮箱地址') => {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return ValidationRules.pattern(value, emailPattern, message);
  },
  number: (value, message = '请输入有效的数字') => {
    if (value === null || value === undefined || value === '') return '';
    return isNaN(Number(value)) ? message : '';
  },
  min: (value, min, message = `不能小于${min}`) => {
    if (value === null || value === undefined || value === '') return '';
    return Number(value) < min ? message : '';
  },
  max: (value, max, message = `不能大于${max}`) => {
    if (value === null || value === undefined || value === '') return '';
    return Number(value) > max ? message : '';
  }
};

module.exports = Behavior({
  // 定义 behavior 被应用到的组件或页面的生命周期方法
  lifetimes: {
    /**
     * Behavior实例刚刚被创建好时执行
     */
    created() {
    },
    /**
     * Behavior实例进入页面节点树时执行
     */
    attached() {
      // 初始化通用数据
      this.getCurrentOpenid();
    },
    /**
     * Behavior实例在组件布局完成后执行
     */
    ready() {
    },
    /**
     * Behavior实例被移动到节点树另一个位置时执行
     */
    moved() {
    },
    /**
     * Behavior实例被从页面节点树移除时执行
     */
    detached() {
      // 通常在这里可以做一些清理操作
    },
    /**
     * Behavior实例或其所在组件产生错误时执行
     * @param {Error} err 错误对象
     */
    error(err) {
      // 可以选择性地调用全局错误上报
      if (error && error.report) {
        error.report(err, 'BehaviorError');
      }
    }
  },

  // 定义 behavior 被应用到的页面的生命周期方法 (仅在页面中使用 Behavior 时生效)
  pageLifetimes: {
    /**
     * 页面加载时触发。一个页面只会调用一次。
     * @param {Object} query 页面参数
     */
    load(query) {
      this.pageQuery = query || {}; // 保存页面参数到 this 上，方便后续使用
    },
    /**
     * 页面显示/切入前台时触发。
     */
    show() {
    },
    /**
     * 页面初次渲染完成时触发。一个页面只会调用一次，代表页面已经准备妥当，可以和视图层进行交互。
     */
    ready() {
    },
    /**
     * 页面隐藏/切入后台时触发。
     */
    hide() {
    },
    /**
     * 页面卸载时触发。
     */
    unload() {
    }
    // resize(size) { // 页面尺寸变化时触发
    //   console.debug('baseBehavior pageLifetimes.resize triggered:', size);
    // },
    // // 页面事件处理函数
    // scroll(event) { // 页面滚动时触发
    //   console.debug('baseBehavior pageLifetimes.scroll triggered:', event);
    // },
    // shareAppMessage(options) { // 用户点击右上角转发
    //   console.debug('baseBehavior pageLifetimes.shareAppMessage triggered:', options);
    //   return {
    //     title: '默认分享标题', // 可被页面覆盖
    //     path: '/pages/index/index' // 可被页面覆盖
    //   };
    // },
    // shareTimeline() { // 用户点击右上角转发到朋友圈
    //   console.debug('baseBehavior pageLifetimes.shareTimeline triggered');
    //   return {
    //     title: '默认分享标题', // 可被页面覆盖
    //     query: '' // 可被页面覆盖
    //   };
    // },
    // addToFavorites(options) { // 用户点击右上角收藏
    //   console.debug('baseBehavior pageLifetimes.addToFavorites triggered:', options);
    //   return {
    //     title: '默认收藏标题', // 可被页面覆盖
    //     query: '' // 可被页面覆盖
    //   };
    // }
  },

  data: {
    // 基础状态
    loading: false,
    loadingText: '加载中...',
    loadingType: 'inline', // 'inline', 'page'
    error: false,
    errorText: '出错了，请稍后再试',
    empty: false,
    emptyText: '暂无数据',
    emptyType: 'default', // 'default', 'search', 'network'
    success: false,
    successText: '操作成功',

    // 用户标识
    currentOpenid: '',

    // 分页状态
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
    hasMore: true,
    loadingMore: false,

    // 表单状态
    form: {},
    formErrors: {},
    formSubmitting: false,
    pageQuery: {} // 用于存储页面 onLoad 时的参数
  },

  methods: {
    // ==================== 核心状态管理 ====================
    getStorage(key) {
      return storage.get(key);
    },
    setStorage(key, value) {
      storage.set(key, value);
    },
    // 统一状态更新入口
    updateState(stateUpdate = {}, nextTick = false) {
      if (Object.keys(stateUpdate).length === 0) return;
      if (nextTick) {
        Promise.resolve().then(() => { this.setData(stateUpdate); });
      } else {
        this.setData(stateUpdate);
      }
    },

    // 初始化或更新currentOpenid
    getCurrentOpenid(forceRefresh = false) {
      const openid = this.getStorage('openid');
      if (forceRefresh || !this.data.currentOpenid) {
        this.updateState({ currentOpenid: openid || '' });
      }
      return openid || '';
    },

    // 加载状态
    showLoading(text = '加载中...', type = 'inline', options = {}) {
      const loadingData = { 
        loading: true, 
        loadingText: text, 
        loadingType: type 
      };
      
      // 合并其他选项
      if (options.mask !== undefined) loadingData.loadingMask = options.mask;
      if (options.color !== undefined) loadingData.loadingColor = options.color;
      if (options.size !== undefined) loadingData.loadingSize = options.size;
      
      this.updateState(loadingData);
      
      // 如果有loading组件实例，直接调用它的方法
      const loadingComp = this.selectComponent && this.selectComponent('.loading-component');
      if (loadingComp) {
        loadingComp.showLoading({
          text, 
          type,
          mask: options.mask,
          color: options.color,
          size: options.size
        });
      }
    },
    hideLoading() {
      this.updateState({ loading: false });
      
      // 如果有loading组件实例，直接调用它的方法
      const loadingComp = this.selectComponent && this.selectComponent('.loading-component');
      if (loadingComp) {
        loadingComp.hideLoading();
      }
    },

    // 错误状态
    showError(text = '出错了，请稍后再试') {
      this.updateState({ error: true, errorText: text });
    },
    hideError() {
      this.updateState({ error: false });
    },

    // 空状态
    showEmpty(text = '暂无数据', type = 'default') {
      this.updateState({ empty: true, emptyText: text, emptyType: type });
    },
    hideEmpty() {
      this.updateState({ empty: false });
    },

    // 成功状态
    showSuccess(text = '操作成功') {
      this.updateState({ success: true, successText: text });
      setTimeout(() => { this.hideSuccess(); }, 1500);
    },
    hideSuccess() {
      this.updateState({ success: false });
    },

    // 加载更多状态
    showLoadingMore() {
      this.updateState({ loadingMore: true });
    },
    hideLoadingMore() {
      this.updateState({ loadingMore: false });
    },

    // ==================== 数据获取与分页 ====================

    // 重置分页数据
    resetPagination() {
      this.updateState({ 
        page: 1, 
        page_size: 20, 
        total: 0, 
        total_pages: 0, 
        hasMore: true, 
        loadingMore: false 
      });
    },

    /**
     * 更新分页数据和列表状态
     * @param {Array} newList 新加载的数据列表
     * @param {Object|Number} pagination 后端返回的分页信息对象或总数
     * @param {String} listKey 页面/组件中列表数据的键名
     */
    updatePagination(newList = [], pagination = {}, listKey = 'listData') {
      const oldList = this.data[listKey] || [];
      const currentPage = this.data.page;
      const isFirstPage = currentPage === 1;
      const updatedList = isFirstPage ? newList : oldList.concat(newList);
      
      // 处理不同类型的分页参数
      let total = 0;
      let total_pages = 0;
      let hasMore = false;
      let nextPage = currentPage;
      
      // 如果是后端标准分页对象
      if (pagination && typeof pagination === 'object') {
        total = pagination.total || 0;
        total_pages = pagination.total_pages || Math.ceil(total / this.data.page_size);
        hasMore = pagination.has_more !== undefined ? pagination.has_more : (currentPage < total_pages);
        nextPage = hasMore ? currentPage + 1 : currentPage;
      } 
      // 兼容旧版（直接传递total数字）
      else if (typeof pagination === 'number') {
        total = pagination;
        total_pages = Math.ceil(total / this.data.page_size);
        hasMore = updatedList.length < total;
        nextPage = hasMore ? currentPage + 1 : currentPage;
      }
      
      const isEmpty = isFirstPage && updatedList.length === 0;

      const updateData = {
        [listKey]: updatedList,
        total: total,
        total_pages: total_pages,
        hasMore: hasMore,
        page: nextPage,
        loading: false,
        loadingMore: false,
        empty: isEmpty,
        emptyText: isEmpty ? '暂无数据' : this.data.emptyText,
        emptyType: isEmpty ? 'default' : this.data.emptyType
      };
      this.updateState(updateData, false);
    },

    /**
     * 获取初始数据 (需要页面/组件实现 _fetchData 方法)
     * @param {Function} getData 获取数据的回调函数
     * @param {String} listKey 页面/组件中列表数据的键名
     */
    async getInitial(getData = null, listKey = 'listData') {
        this.resetPagination();
        this.showLoading('加载中...', 'page');
        this.hideEmpty();
        this.hideError();

        try {
            if (typeof getData !== 'function') {
              throw new Error('Page/Component must implement _getData(page, page_size)');
            }
            const result = await getData(this.data.page, this.data.page_size);
            
            // 处理不同的返回格式
            if (result && result.data && result.pagination) {
              // 标准API返回格式
              this.updatePagination(result.data, result.pagination, listKey);
            } else if (result && result.list && (result.total !== undefined)) {
              // 兼容旧格式
              this.updatePagination(result.list, result.total, listKey);
            } else {
              // 兜底处理
              const list = Array.isArray(result) ? result : (result?.data || result?.list || []);
              const total = result?.total || result?.pagination?.total || list.length;
              this.updatePagination(list, total, listKey);
            }
        } catch (err) {
            this.handleError(err, '加载数据失败', { [listKey]: [] });
        } finally {
          this.hideLoading();
        }
    },

    /**
     * 获取更多数据 (需要页面/组件实现 _fetchData 方法)
     * @param {Function} getData 获取数据的回调函数
     * @param {String} listKey 页面/组件中列表数据的键名
     */
    async getMore(getData = null, listKey = 'listData') {
      if (!this.data.hasMore || this.data.loading || this.data.loadingMore) return;

      this.showLoadingMore();

      try {
        if (typeof getData !== 'function') {
          throw new Error('Page/Component must provide getData function');
        }
        
        const result = await getData(this.data.page, this.data.page_size);
        
        // 处理不同的返回格式
        if (result && result.data && result.pagination) {
          // 标准API返回格式
          this.updatePagination(result.data, result.pagination, listKey);
        } else if (result && result.list && (result.total !== undefined)) {
          // 兼容旧格式
          this.updatePagination(result.list, result.total, listKey);
        } else {
          // 兜底处理
          const list = Array.isArray(result) ? result : (result?.data || result?.list || []);
          const total = result?.total || result?.pagination?.total || list.length;
          this.updatePagination(list, total, listKey);
        }
      } catch (err) {
        this.hideLoadingMore();
        this.handleError(err, '加载更多失败');
      }
    },

    // 通用空数据处理
    handleEmpty(type = 'default', message = '暂无数据') {
      const state = { loading: false, empty: true, emptyText: message, emptyType: type };
      this.updateState(state, true); // 使用 nextTick
    },

    // 检查数据是否为空
    checkEmpty(data, type = 'default', message = '暂无数据') {
      if (!data || (Array.isArray(data) && data.length === 0)) {
        this.handleEmpty(type, message);
        return true;
      }
      return false;
    },

    // ==================== 表单处理 ====================

    // 初始化表单
    initForm(initialData = {}) {
      this.updateState({ form: { ...initialData }, formErrors: {} });
    },

    // 获取表单数据
    getForm() {
      return this.data.form;
    },

    // 设置表单字段值
    setFormField(field, value) {
      const updateData = {
        [`form.${field}`]: value,
        [`formErrors.${field}`]: '' // 清除对应字段错误
      };
      this.updateState(updateData, false);
    },

    // 表单输入事件处理 (bindinput)
    formInput(e) {
      const { field } = e.currentTarget.dataset;
      this.setFormField(field, e.detail.value);
    },

    // Switch 切换事件处理 (bindchange) -> (bind:change)
    switchUpdate(e) {
      const { field } = e.currentTarget.dataset;
      this.setFormField(field, e.detail.value);
    },

    // Radio Group 变更事件处理 (bindchange) -> (bind:change)
    radioUpdate(e) {
      const { field } = e.currentTarget.dataset;
      this.setFormField(field, e.detail.value);
    },

    // Checkbox Group 变更事件处理 (bindchange) -> (bind:change)
    checkboxUpdate(e) {
      const { field } = e.currentTarget.dataset;
      this.setFormField(field, e.detail.value);
    },

    // Picker 变更事件处理 (bindchange) -> (bind:change)
    pickerUpdate(e) {
      const { field, options } = e.currentTarget.dataset;
      const index = parseInt(e.detail.value);
      const value = (options && Array.isArray(options)) ? options[index] : index;
      this.setFormField(field, value);
    },

    // 重置表单
    resetForm() {
      this.updateState({ form: {}, formErrors: {} });
    },

    // 验证表单
    validateForm(rules = {}) {
      let isValid = true;
      const errors = {};
      for (const [field, fieldRules] of Object.entries(rules)) {
        if (!Array.isArray(fieldRules)) continue;
        const fieldPath = field.split('.');
        let value = this.data.form;
        for (const part of fieldPath) {
          if (value === null || value === undefined) break;
          value = value[part];
        }
        for (const rule of fieldRules) {
          let error = '';
          const ruleName = typeof rule === 'function' ? 'custom' : rule.rule;
          const validator = typeof rule === 'function' ? rule : ValidationRules[ruleName];
          if (validator) {
            error = typeof rule === 'function'
                    ? validator(value, this.data.form) // 自定义函数
                    : validator(value, rule.param || rule[ruleName], rule.message); // 内建规则
          }
          if (error) {
            errors[field] = error;
            isValid = false;
            break;
          }
        }
      }
      this.updateState({ formErrors: errors }, false);
      return isValid;
    },

    // 显示首个表单验证错误
    showFormError() {
      const errors = this.data.formErrors;
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        this.showToast(errors[firstErrorField], ToastType.ERROR);
      }
    },

    /**
     * 提交表单 (包含验证)
     * @param {Object} rules 验证规则
     * @param {Function} submitCallback 实际提交操作的回调函数, 接收 form 数据
     */
    async submitFormWithValidation(rules, submitCallback) {
      if (this.data.formSubmitting) return null;
      const isValid = this.validateForm(rules);
      if (!isValid) {
        this.showFormError();
        return null;
      }
      this.updateState({ formSubmitting: true }, false);
      try {
        const result = await submitCallback(this.data.form);
        this.updateState({ formSubmitting: false }, false);
        return result;
      } catch (err) {
        this.updateState({ formSubmitting: false }, false);
        return this.handleError(err, err.message || '提交失败');
      }
    },

    // ==================== 错误处理 ====================

    /**
     * 通用错误处理
     * @param {Error|Object|*} err 错误对象
     * @param {String} errorMsg 显示给用户的错误消息
     * @param {Object} additionalState 需要额外更新的状态
     */
    handleError(err, errorMsg, additionalState = {}) {
      const baseState = { loading: false, error: true, errorText: errorMsg };
      const nextState = { ...baseState, ...additionalState };
      storage.set('isLogging', false); // 清理可能存在的日志标记
      if (additionalState.hasOwnProperty('pendingAction')) {
        this.data.pendingAction = additionalState.pendingAction; // 同步更新内部状态
      }
      // 使用 nextTick 更新 UI 并显示 Toast
      Promise.resolve().then(() => {
        if (this && this.setData) {
          this.updateState(nextState, false); // 已在 Promise 中，无需 nextTick=true
          if (errorMsg) {
            ui.showToast(errorMsg, { type: ToastType.ERROR });
          }
        }
      });
      if (error && error.report && err) {
        error.report(err); // 上报错误
      }
      return Promise.reject(err || new Error(errorMsg));
    },

    // 错误重试事件处理 (bind:retry)
    errorRetry() {
      this.hideError();
      if (this.retryLastOperation) { // 页面/组件可实现 retryLastOperation
        this.retryLastOperation();
      }
    },

    // 错误关闭事件处理 (bind:close)
    errorClose() {
      this.hideError();
    },

    // ==================== 导航封装 ====================

    navigateTo(url, params) { 
      try {
        console.debug('从页面跳转到:', url);
        return nav.navigateTo(url, params)
          .catch(err => {
            console.error('页面跳转失败:', err);
            // 显示错误提示
            ui.showToast('页面跳转失败: ' + (err.errMsg || '未知错误'), { type: ToastType.ERROR });
            throw err;
          });
      } catch (e) {
        console.error('页面跳转异常:', e);
        return Promise.reject(e);
      }
    },
    
    redirectTo(url, params) { 
      try {
        console.debug('从页面重定向到:', url);
        return nav.redirectTo(url, params)
          .catch(err => {
            console.error('页面重定向失败:', err);
            ui.showToast('页面重定向失败: ' + (err.errMsg || '未知错误'), { type: ToastType.ERROR });
            throw err;
          });
      } catch (e) {
        console.error('页面重定向异常:', e);
        return Promise.reject(e);
      }
    },
    
    navigateBack(delta = 1) { 
      try {
        console.debug('页面返回', delta, '层');
        return nav.navigateBack(delta)
          .catch(err => {
            console.error('页面返回失败:', err);
            // 返回失败时，可以尝试跳转到首页
            if (delta > 1) {
              console.debug('尝试直接返回首页');
              return this.switchTab('/pages/index/index');
            }
            throw err;
          });
      } catch (e) {
        console.error('页面返回异常:', e);
        return Promise.reject(e);
      }
    },
    
    reLaunch(url, params) { 
      try {
        console.debug('重启并跳转到:', url);
        // 如果url是对象，且有url属性，则提取出来
        if (typeof url === 'object' && url.url) {
          console.debug('将对象转换为url字符串:', url);
          const urlStr = url.url;
          return nav.reLaunch(urlStr)
            .catch(err => {
              console.error('重启跳转失败:', err);
              ui.showToast('应用重启失败: ' + (err.errMsg || '未知错误'), { type: ToastType.ERROR });
              throw err;
            });
        }
        
        return nav.reLaunch(url)
          .catch(err => {
            console.error('重启跳转失败:', err);
            ui.showToast('应用重启失败: ' + (err.errMsg || '未知错误'), { type: ToastType.ERROR });
            throw err;
          });
      } catch (e) {
        console.error('重启跳转异常:', e);
        return Promise.reject(e);
      }
    },
    
    switchTab(url) { 
      try {
        console.debug('切换到标签页:', url);
        return nav.switchTab(url)
          .catch(err => {
            console.error('切换标签页失败:', err);
            ui.showToast('切换标签失败: ' + (err.errMsg || '未知错误'), { type: ToastType.ERROR });
            throw err;
          });
      } catch (e) {
        console.error('切换标签页异常:', e);
        return Promise.reject(e);
      }
    },

    // ==================== 工具方法 ====================

    // 等待
    sleep(ms = 300) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 显示 Toast
    showToast(title, iconOrOptions = ToastType.NONE, duration = 2000) {
        let options = {};
        if (typeof iconOrOptions === 'string') {
            options.type = iconOrOptions;
            options.duration = duration;
        } else if (typeof iconOrOptions === 'object') {
            options = { ...iconOrOptions };
        }
        ui.showToast(title, options);
    },

    // 隐藏 Toast/Loading
    hideToast() {
        ui.hideToast();
    },

    /**
     * 显示模态对话框
     * @param {Object} options 配置对象, 同 wx.showModal
     * @returns {Promise<Boolean>} 用户点击确认返回 true，取消返回 false
     */
    showModal(options = {}) {
      return ui.showModal(options);
    },

    /**
     * 显示操作菜单
     * @param {Array<String>} items 菜单项列表
     * @returns {Promise<Number>} 用户点击的菜单项序号，从上到下，从0开始
     */
    showActionSheet(items = []) {
        return ui.showActionSheet(items);
    },

    /**
     * 复制文本到剪贴板
     * @param {String} text 要复制的文本
     * @param {String} [tip='复制成功'] 成功后的提示语
     */
    copyText(text, tip = '复制成功') {
        ui.copyText(text, tip);
    },
  }
}); 