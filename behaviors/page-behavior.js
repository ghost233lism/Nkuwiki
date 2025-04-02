/**
 * 页面基础行为
 * 提供页面通用方法和生命周期处理
 */
const { ui, nav, error, ToastType } = require('../utils/util');
const baseBehavior = require('./base-behavior');

module.exports = Behavior({
  behaviors: [baseBehavior],
  
  properties: {},

  data: {
    // 页面状态
    pageStatus: {
      loading: false,
      error: false,
      errorMsg: '',
      empty: false,
      emptyMsg: '暂无数据',
      success: false,
      successMsg: ''
    },
    
    // 分页和列表状态
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasMore: true
    }
  },
  
  lifetimes: {
    attached() {
      console.debug(`页面组件加载: ${this.is}`);
    },
    
    detached() {
      console.debug(`页面组件卸载: ${this.is}`);
    }
  },

  pageLifetimes: {
    show() {
      console.debug(`页面显示: ${this.is}`);
    },
    
    hide() {
      console.debug(`页面隐藏: ${this.is}`);
    }
  },

  methods: {
    /**
     * 设置页面状态
     * @param {Object} status 页面状态
     */
    setPageStatus(status = {}) {
      this.setData({
        pageStatus: {
          ...this.data.pageStatus,
          ...status
        }
      });
    },
    
    /**
     * 重置页面状态
     */
    resetPageStatus() {
      this.setData({
        pageStatus: {
          loading: false,
          error: false,
          errorMsg: '',
          empty: false,
          emptyMsg: '暂无数据',
          success: false,
          successMsg: ''
        }
      });
    },
    
    /**
     * 显示页面加载状态
     */
    showPageLoading() {
      this.setPageStatus({ 
        loading: true, 
        error: false, 
        empty: false 
      });
    },
    
    /**
     * 显示页面错误状态
     * @param {String} message 错误信息
     */
    showPageError(message = '加载失败') {
      this.setPageStatus({ 
        loading: false, 
        error: true, 
        errorMsg: message 
      });
    },
    
    /**
     * 显示页面空状态
     * @param {String} message 空状态提示
     */
    showPageEmpty(message = '暂无数据') {
      this.setPageStatus({ 
        loading: false, 
        empty: true, 
        emptyMsg: message 
      });
    },
    
    /**
     * 显示页面成功状态
     * @param {String} message 成功提示
     */
    showPageSuccess(message = '操作成功') {
      this.setPageStatus({ 
        loading: false, 
        success: true, 
        successMsg: message 
      });
      
      setTimeout(() => {
        this.setPageStatus({ success: false });
      }, 1500);
    },
    
    /**
     * 显示消息提示
     * @param {String} message 提示内容
     * @param {String} type 提示类型 success|error|none
     * @param {Number} duration 显示时长
     */
    showToast(message, type = 'none', duration = 1500) {
      const iconType = type === 'success' ? ToastType.SUCCESS :
                      type === 'error' ? ToastType.ERROR :
                      ToastType.NONE;
      
      ui.showToast(message, { type: iconType, duration });
    },
    
    /**
     * 显示确认对话框
     * @param {Object} options 对话框选项
     * @returns {Promise<Boolean>} 确认结果
     */
    showConfirm({ title = '提示', content, confirmText = '确定', cancelText = '取消', showCancel = true } = {}) {
      return ui.showDialog({ title, content, confirmText, cancelText, showCancel });
    },
    
    /**
     * 页面异步初始化封装
     * @param {Function} initFunction 初始化函数
     */
    async initPage(initFunction) {
      this.showPageLoading();
      
      try {
        await initFunction();
      } catch (err) {
        console.debug('页面初始化失败:', err);
        this.showPageError(err.message || '页面加载失败');
      }
    },
    
    /**
     * 重置分页状态
     * @param {Number} pageSize 每页数量
     */
    resetPagination(pageSize = 10) {
      this.setData({
        pagination: {
          page: 1,
          pageSize,
          total: 0,
          hasMore: true
        }
      });
    },
    
    /**
     * 更新分页状态
     * @param {Object} pagination 分页信息
     */
    updatePagination(pagination = {}) {
      this.setData({
        pagination: {
          ...this.data.pagination,
          ...pagination
        }
      });
    },
    
    /**
     * 加载下一页
     */
    loadNextPage() {
      const { page, hasMore } = this.data.pagination;
      
      if (!hasMore) return false;
      
      this.setData({
        'pagination.page': page + 1
      });
      
      return true;
    },
    
    /**
     * 设置分页数据总量和是否有更多
     * @param {Number} total 数据总量
     */
    setPaginationTotal(total) {
      const { page, pageSize } = this.data.pagination;
      const hasMore = page * pageSize < total;
      
      this.setData({
        'pagination.total': total,
        'pagination.hasMore': hasMore
      });
    },
    
    /**
     * 导航到指定页面
     * @param {String} url 页面路径
     */
    navigateTo(url) {
      nav.to(url);
    },
    
    /**
     * 返回上一页
     * @param {Number} delta 返回的层级
     */
    navigateBack(delta = 1) {
      nav.back(delta);
    },
    
    /**
     * 重定向到指定页面
     * @param {String} url 页面路径
     */
    redirectTo(url) {
      nav.redirect(url);
    },
    
    /**
     * 处理API错误
     * @param {Object} error 错误对象
     * @param {String} defaultMsg 默认错误消息
     */
    handleApiError(error, defaultMsg = '操作失败') {
      console.debug('API错误:', error);
      
      const errorMsg = error?.message || 
                      (error?.details?.message) || 
                      (typeof error === 'string' ? error : defaultMsg);
      
      // 显示错误提示
      this.showToast(errorMsg, 'error');
      
      // 如果是列表加载错误，设置页面错误状态
      if (defaultMsg.includes('加载')) {
        this.showPageError(errorMsg);
      }
      
      return errorMsg;
    }
  }
}); 