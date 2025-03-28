Component({
  options: {
    styleIsolation: "shared",
  },
  properties: {
    text: {
      type: String,
      value: "",
    },
    textId: {
      type: String,
      value: "",
    },
    openTyper: {
      type: Boolean,
      value: false,
    },
    speed: {
      type: Number,
      value: 15,
    },
    noType: {
      type: Boolean,
      value: true,
    },
  },
  observers: {
    textId: function (newVal) {
      if (this.data.hasInitCb == false) {
        this.data.hasInitCb = true;
        this.initCb();
      }
    },
  },
  lifetimes: {
    attached: function () {
      if (this.data.hasInitCb == false) {
        this.data.hasInitCb = true;
        this.initCb();
      }
    },
    ready: function () {
      if (this.data.hasLastLeafNode) {
        this.startTraverse();
      }
    },
  },
  data: {
    currentText: "",
    timer: null,
    isShow: false,
    hasLastLeafNode: false,
    hasInitCb: false,
  },
  methods: {
    show() {
      this.data.isShow = true;
      this.setData({ isShow: this.data.isShow });
    },
    initCb() {
      const newVal = this.data.textId;
      // 属性值变化时执行的逻辑
      const {
        typeShowCbMap,
        curLastLeafNodeId,
        openTyper,
      } = require("../typer");
      
      if (newVal && openTyper.value) {
        // 只有当文本非空时才注册打字回调
        if (this.data.text && this.data.text.trim()) {
          typeShowCbMap.value[newVal] = (resolve) => {
            this.show();
            this.startTyping(resolve);
          };
          
          if (newVal == curLastLeafNodeId.value) {
            this.data.hasLastLeafNode = true;
          }
        } else {
          // 对于空文本节点，直接显示并立即完成
          this.data.isShow = true;
          this.setData({ isShow: this.data.isShow });
          if (newVal == curLastLeafNodeId.value) {
            this.data.hasLastLeafNode = true;
            this.startTraverse();
          }
        }
      }
    },
    startTraverse() {
      const {
        typeShowCbMap,
        curNodes,
        lastScrollTime,
        scrollCb,
        scrollTimer,
        traverse,
        isTyping,
        renderStartTime,
      } = require("../typer");
      
      setTimeout(
        () => {
          wx.hideLoading();
          isTyping.value = true;
          traverse(curNodes.value.children);
          //默认情况下时typable-text组件中的文本打印完了之后，自动触发滚动，但是有时候，组件内的文本很多，可能要打印几秒甚至更久，这个时候就添加这个定时器，即距离上一次滚动超过一定时间了也触发滚动
          scrollTimer.value = setInterval(() => {
            if (Date.now() - lastScrollTime.value > 600) {
              if (scrollCb.value) {
                scrollCb.value();
              }
            }
          }, 200);
        },0
      );
    },
    startTyping(resolve) {
      this.clearTimer();
      
      // 如果文本为空，直接完成
      if (!this.data.text || this.data.text.length === 0) {
        if (resolve) resolve();
        return;
      }
      
      let index = 0;
      this.setData({ currentText: "" });
      this.data.timer = setInterval(() => {
        if (index < this.data.text.length) {
          this.setData({
            currentText: this.data.text.slice(0, index + 1),
          });
          index++;
        } else {
          this.clearTimer();
          if (resolve) resolve();
        }
      }, this.data.speed);
    },
    clearTimer() {
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }
    },
  },
});
