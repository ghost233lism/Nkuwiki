Component({
  properties: {
    // 是否加载中
    loading: {
      type: Boolean,
      value: false,
      observer: 'updateState'
    },
    // 是否为空数据
    empty: {
      type: Boolean,
      value: false,
      observer: 'updateState'
    },
    // 是否出错
    error: {
      type: Boolean,
      value: false,
      observer: 'updateState'
    },
    // 错误消息
    errorText: {
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
    // 是否成功
    success: {
      type: Boolean,
      value: false,
      observer: 'updateState'
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
    // 加载类型：spinner或dots
    loadingType: {
      type: String,
      value: 'dots'
    }
  },
  
  data: {
    _state: {
      isLoading: false,
      isEmpty: false,
      isError: false,
      isSuccess: false,
      errorMsg: '',
      组件ID: ''
    }
  },
  
  // 组件生命周期
  lifetimes: {
    attached() {
      // 生成随机ID，用于调试
      const randomId = Math.random().toString(36).substring(2, 8);
      this.setData({
        '_state.组件ID': randomId
      });
      
      // 初始化状态
      this.updateState();
    }
  },
  
  methods: {
    updateState() {
      const { loading, empty, error, success } = this.properties;
      
      // 强制优先级: loading > error > empty > success > 正常内容
      let state = {
        isLoading: false,
        isEmpty: false,
        isError: false,
        isSuccess: false,
        errorMsg: this.properties.errorText
      };
      
      // 使用优先级计算最终状态
      if (loading) {
        state.isLoading = true;
      } else if (error) {
        state.isError = true;
      } else if (empty) {
        state.isEmpty = true;
      } else if (success) {
        state.isSuccess = true;
      }
      
      // 调试日志
      console.debug('page-status状态变化:', {
        ...state,
        组件ID: this.data._state.组件ID
      });
      
      // 更新状态
      this.setData({ _state: state });
      
      // 触发状态变化事件
      this.triggerEvent('stateChange', state);
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
    }
  }
}); 