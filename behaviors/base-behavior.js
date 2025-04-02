/**
 * 基础行为 - 整合所有页面通用的功能
 */
const { ui, nav, error, storage, ToastType } = require('../utils/util');

module.exports = Behavior({
  data: {
    loading: false,
    loadingText: '加载中...',
    loadingType: 'inline',
    
    error: false,
    errorText: '出错了，请稍后再试',
    
    empty: false,
    emptyText: '暂无数据',
    emptyType: 'default',
    
    success: false,
    successText: '操作成功'
  },
  
  methods: {
    // ==================== 页面状态管理 ====================
    
    // 显示加载
    showLoading(text = '加载中...', type = 'inline') {
      this.setData({
        loading: true,
        loadingText: text,
        loadingType: type
      });
    },
    
    // 隐藏加载
    hideLoading() {
      this.setData({
        loading: false
      });
    },
    
    // 显示错误
    showError(text = '出错了，请稍后再试') {
      this.setData({
        error: true,
        errorText: text
      });
    },
    
    // 隐藏错误
    hideError() {
      this.setData({
        error: false
      });
    },
    
    // 显示空状态
    showEmpty(text = '暂无数据', type = 'default') {
      this.setData({
        empty: true,
        emptyText: text,
        emptyType: type
      });
    },
    
    // 隐藏空状态
    hideEmpty() {
      this.setData({
        empty: false
      });
    },
    
    // 显示成功状态
    showSuccess(text = '操作成功') {
      this.setData({
        success: true,
        successText: text
      });
      
      // 默认1.5秒后隐藏成功状态
      setTimeout(() => {
        this.hideSuccess();
      }, 1500);
    },
    
    // 隐藏成功状态
    hideSuccess() {
      this.setData({
        success: false
      });
    },
    
    // 安全的状态更新 - 统一管理状态变更，防止递归更新
    safeUpdateState(stateUpdate = {}) {
      if (Object.keys(stateUpdate).length > 0) {
        this.setData(stateUpdate);
      }
    },
    
    // 在下一个tick更新状态 - 避免递归更新
    nextTickUpdate(stateUpdate = {}) {
      if (Object.keys(stateUpdate).length === 0) return;
      
      // 使用Promise微任务延迟更新，确保不会在当前数据更新周期内触发
      Promise.resolve().then(() => {
        this.setData(stateUpdate);
      });
    },
    
    // ==================== 错误处理 ====================
    
    // 错误重试
    onErrorRetry() {
      this.hideError();
      
      // 子类可以重写这个方法来实现具体的重试逻辑
      if (this.retryLastOperation) {
        this.retryLastOperation();
      }
    },
    
    // 关闭错误
    onErrorClose() {
      this.hideError();
    },
    
    // 通用错误处理 - 使用微任务避免递归更新
    handleError(err, errorMsg, additionalState = {}) {
      // 基础错误状态
      const baseState = {
        loading: false,
        error: true,
        errorText: errorMsg
      };
      // 合并基础状态和额外状态
      const nextState = { ...baseState, ...additionalState };

      // 清理isLogging存储标记
      storage.set('isLogging', false);
      // 如果传入了pendingAction，同步更新内部状态（setData稍后会覆盖，但这是即时反映）
      if (additionalState.hasOwnProperty('pendingAction')) {
          this.data.pendingAction = additionalState.pendingAction;
      }

      // 使用Promise微任务延迟执行状态更新和提示
      Promise.resolve().then(() => {
        if (this && this.setData) {
          this.setData(nextState); // 更新UI状态，包括error和pendingAction
          if (errorMsg) {
            ui.showToast(errorMsg, { type: ToastType.ERROR });
          }
        }
      });

      // 记录错误日志
      console.debug('错误详情:', err);
      if (error && error.report && err) {
        error.report(err);
      }

      return Promise.reject(err || new Error(errorMsg));
    },
    
    // ==================== 数据处理 ====================
    
    // 通用空数据处理 - 重写以避免递归更新
    handleEmptyData(type = 'default', message = '暂无数据') {
      // 使用微任务避免在当前更新周期执行setData
      Promise.resolve().then(() => {
        this.setData({
          loading: false,
          empty: true, 
          emptyText: message,
          emptyType: type
        });
      });
    },
    
    // 检查是否有数据，无数据则显示空状态
    checkEmptyData(data, type = 'default', message = '暂无数据') {
      if (!data || (Array.isArray(data) && data.length === 0)) {
        this.handleEmptyData(type, message);
        return true;
      }
      return false;
    },
    
    // ==================== 工具方法 ====================
    
    // 等待指定时间
    sleep(ms = 300) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // 显示toast消息
    showToast(title, icon = 'none', duration = 2000) {
      ui.showToast(title, { 
        type: icon === 'none' ? ToastType.NONE : 
              icon === 'success' ? ToastType.SUCCESS :
              icon === 'error' ? ToastType.ERROR :
              icon === 'loading' ? ToastType.LOADING : ToastType.NONE,
        duration
      });
    }
  }
}); 