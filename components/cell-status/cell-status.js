Component({
  properties: {
    // 当前状态类型: loading, error, empty, success, normal
    status: {
      type: String,
      value: 'normal',
      observer: 'updateState'
    },
    // 错误消息
    errorMsg: {
      type: String,
      value: '出错了，请重试'
    },
    // 加载文本
    loadingText: {
      type: String,
      value: '加载中...'
    },
    // 成功文本
    successText: {
      type: String,
      value: '操作成功'
    },
    // 空数据文本
    emptyText: {
      type: String,
      value: '暂无数据'
    },
    // 空状态按钮文本
    emptyBtnText: {
      type: String,
      value: ''
    },
    // 空状态类型（empty, search, network）
    emptyType: {
      type: String,
      value: 'empty'
    },
    // 是否显示空状态按钮
    showEmptyBtn: {
      type: Boolean,
      value: false
    },
    // 加载更多按钮文本
    loadMoreText: {
      type: String,
      value: '加载更多'
    },
    // 没有更多数据文本
    noMoreText: {
      type: String,
      value: '已经到底了'
    },
    // 是否有更多数据
    hasMore: {
      type: Boolean,
      value: undefined
    },
    // 重试按钮文本
    retryText: {
      type: String,
      value: '重试'
    },
    // 容器样式
    containerStyle: {
      type: String,
      value: ''
    },
    // 自定义类名
    customClass: {
      type: String,
      value: ''
    },
    // 是否全屏显示
    fullscreen: {
      type: Boolean,
      value: false
    },
    // 加载类型：spinner, dots, inline, fullscreen
    loadingType: {
      type: String,
      value: 'dots'
    },
    // 自定义图标名称
    customIcon: {
      type: String,
      value: ''
    },
    // 自定义图标大小
    iconSize: {
      type: Number,
      value: 60
    },
    // 自定义图标颜色
    iconColor: {
      type: String,
      value: ''
    },
    // 是否显示关闭按钮（针对错误状态）
    showCloseBtn: {
      type: Boolean,
      value: true
    },
    // 加载遮罩（仅fullscreen时有效）
    mask: {
      type: Boolean,
      value: false
    },
    // loading尺寸
    loadingSize: {
      type: String,
      value: '' // small, medium, large
    }
  },
  
  data: {
    _state: {
      isLoading: false,
      isEmpty: false,
      isError: false,
      isSuccess: false,
      isNormal: true
    },
    // 状态映射
    _iconMap: {
      loading: '',
      error: 'error',
      empty: 'empty',
      'empty-search': 'search-empty',
      'empty-network': 'network-empty',
      success: 'success'
    },
    // 颜色映射
    _colorMap: {
      loading: '#07c160',
      error: '#ff5252',
      empty: '#999999',
      'empty-search': '#999999',
      'empty-network': '#ff9800',
      success: '#07c160'
    }
  },
  
  // 组件生命周期
  lifetimes: {
    attached() {
      // 初始化状态
      this.updateState();
    }
  },
  
  methods: {
    // 更新组件状态
    updateState() {
      const { status } = this.properties;
      
      // 重置所有状态
      const state = {
        isLoading: false,
        isEmpty: false,
        isError: false,
        isSuccess: false,
        isNormal: false
      };
      
      // 根据status设置对应状态
      switch(status) {
        case 'loading':
          state.isLoading = true;
          break;
        case 'error':
          state.isError = true;
          break;
        case 'empty':
        case 'empty-search':
        case 'empty-network':
          state.isEmpty = true;
          break;
        case 'success':
          state.isSuccess = true;
          break;
        default:
          state.isNormal = true;
      }
      
      // 更新状态
      this.setData({ _state: state });
      
      // 触发状态变化事件
      this.triggerEvent('stateChange', {
        status,
        state
      });
    },
    
    // 获取当前显示的图标
    getIconForStatus(status) {
      if (this.properties.customIcon) {
        return this.properties.customIcon;
      }
      
      return this.data._iconMap[status] || '';
    },
    
    // 获取当前状态的颜色
    getColorForStatus(status) {
      if (this.properties.iconColor) {
        return this.properties.iconColor;
      }
      
      return this.data._colorMap[status] || '#999999';
    },
    
    // 错误重试
    onErrorRetry() {
      this.triggerEvent('retry');
    },
    
    // 错误关闭
    onErrorClose() {
      this.triggerEvent('close');
    },
    
    // 空状态按钮点击
    onEmptyBtnTap() {
      this.triggerEvent('emptyBtnTap');
    },
    
    // 加载更多
    onLoadMore() {
      this.triggerEvent('loadMore');
    },
    
    // 设置状态（供外部调用）
    setStatus(status, message = '') {
      let data = { status };
      
      // 如果提供了消息，更新对应的文本
      if (message) {
        switch(status) {
          case 'error':
            data.errorMsg = message;
            break;
          case 'empty':
          case 'empty-search':
          case 'empty-network':
            data.emptyText = message;
            break;
          case 'success':
            data.successText = message;
            break;
          case 'loading':
            data.loadingText = message;
            break;
        }
      }
      
      this.setData(data);
    },
    
    // 显示加载状态（外部调用）
    showLoading(options = {}) {
      const { text, type, mask, size } = options;
      const data = { status: 'loading' };
      
      if (text !== undefined) data.loadingText = text;
      if (type !== undefined) data.loadingType = type;
      if (mask !== undefined) data.mask = mask;
      if (size !== undefined) data.loadingSize = size;
      
      this.setData(data);
    },
    
    // 隐藏加载状态（外部调用）
    hideLoading() {
      this.setData({ status: 'normal' });
    },
    
    // 显示错误状态（外部调用）
    showError(message = this.properties.errorMsg) {
      this.setData({
        status: 'error',
        errorMsg: message
      });
    },
    
    // 显示空状态（外部调用）
    showEmpty(options = {}) {
      const { text, emptyType, showBtn, btnText } = options;
      const data = { status: 'empty' };
      
      if (text !== undefined) data.emptyText = text;
      if (emptyType !== undefined) data.emptyType = emptyType;
      if (showBtn !== undefined) data.showEmptyBtn = showBtn;
      if (btnText !== undefined) data.emptyBtnText = btnText;
      
      this.setData(data);
    },
    
    // 显示成功状态（外部调用）
    showSuccess(message = this.properties.successText) {
      this.setData({
        status: 'success',
        successText: message
      });
    },
    
    // 显示正常内容（外部调用）
    showNormal() {
      this.setData({ status: 'normal' });
    }
  }
}); 