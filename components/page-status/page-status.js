Component({
  properties: {
    // 加载状态
    loading: {
      type: Boolean,
      value: false
    },
    loadingText: {
      type: String,
      value: '加载中...'
    },
    loadingType: {
      type: String,
      value: 'inline' // 可选值: inline, fullscreen, dots
    },
    
    // 错误状态
    error: {
      type: [Boolean, String, Object],
      value: false,
      
      // 兼容字符串错误和布尔值的处理
      optionalTypes: [Boolean, String, Object]
    },
    errorText: {
      type: String,
      value: '出错了，请稍后再试'
    },
    retryText: {
      type: String,
      value: '重试'
    },
    
    // 空数据状态
    empty: {
      type: Boolean,
      value: false
    },
    emptyText: {
      type: String,
      value: '暂无数据'
    },
    emptyType: {
      type: String,
      value: 'default' // 可选值：default, search, network
    },
    emptyBtnText: {
      type: String,
      value: ''
    },
    showEmptyBtn: {
      type: Boolean,
      value: false
    },
    
    // 成功状态
    success: {
      type: Boolean,
      value: false
    },
    successText: {
      type: String,
      value: '操作成功'
    },
    
    // 加载更多状态
    hasMore: {
      type: Boolean,
      value: true
    },
    loadMoreText: {
      type: String,
      value: '上拉加载更多'
    },
    noMoreText: {
      type: String,
      value: '没有更多数据了'
    },
    
    // 布局相关
    fullscreen: {
      type: Boolean,
      value: false
    },
    padding: {
      type: String,
      value: '40rpx 0'
    },
    customClass: {
      type: String,
      value: ''
    }
  },
  
  data: {
    // 避免直接使用properties，解决递归更新问题
    _state: {
      isLoading: false,
      isError: false,
      isSuccess: false,
      isEmpty: false,
      errorMsg: '',
      isUpdating: false
    },
    
    // 计算样式
    containerStyle: ''
  },
  
  // 组件生命周期
  lifetimes: {
    attached() {
      // 初始化状态
      this._updateState();
      this._updateStyle();
    }
  },
  
  // 属性变化监听
  observers: {
    'loading, error, empty, success': function() {
      // 使用setTimeout延迟更新，避免递归调用
      if (!this.data._state.isUpdating) {
        setTimeout(() => {
          this._updateState();
        }, 0);
      }
    },
    
    'fullscreen, padding': function() {
      this._updateStyle();
    }
  },
  
  methods: {
    // 更新内部状态
    _updateState() {
      // 设置更新锁
      this.setData({
        '_state.isUpdating': true
      });
      
      // 获取当前属性值
      const { loading, error, empty, success, errorText } = this.properties;
      
      // 创建新状态对象
      const newState = {
        isLoading: !!loading,
        isError: !!error,
        isSuccess: !!success,
        isEmpty: !!empty,
        errorMsg: typeof error === 'string' ? error : errorText
      };
      
      // 更新内部状态
      this.setData({
        '_state.isLoading': newState.isLoading,
        '_state.isError': newState.isError,
        '_state.isSuccess': newState.isSuccess,
        '_state.isEmpty': newState.isEmpty,
        '_state.errorMsg': newState.errorMsg,
        '_state.isUpdating': false
      });
    },
    
    // 更新容器样式
    _updateStyle() {
      const { fullscreen, padding } = this.properties;
      
      const style = [
        padding ? `padding: ${padding};` : '',
        fullscreen ? 'min-height: 70vh;' : ''
      ].filter(Boolean).join(' ');
      
      this.setData({
        containerStyle: style
      });
    },
    
    // 错误重试
    onErrorRetry() {
      if (this.data._state.isUpdating) return;
      this.triggerEvent('retry');
    },
    
    // 关闭错误提示
    onErrorClose() {
      if (this.data._state.isUpdating) return;
      this.triggerEvent('close');
    },
    
    // 空状态按钮点击
    onEmptyBtnTap() {
      if (this.data._state.isUpdating) return;
      this.triggerEvent('emptybtn');
    },
    
    // 加载更多
    onLoadMore() {
      if (this.data._state.isUpdating || this.data._state.isLoading || !this.properties.hasMore) return;
      this.triggerEvent('loadmore');
    }
  }
}); 