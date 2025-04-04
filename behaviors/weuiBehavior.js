/**
 * WEUI组件通用行为
 * 封装了常用的WEUI组件配置和方法
 */
module.exports = Behavior({
    data: {
      // 上传组件
      selectFile: null,
      uploadFile: null,
      
      // 搜索栏
      search: null,
      cancel: null,
      
      // 对话框
      dialogButtons: [{text: '取消'}, {text: '确定'}],
      dialogShow: false,
      dialogTitle: '',
      dialogContent: '',
      
      // 底部操作菜单
      actionSheetShow: false,
      actionSheetGroups: [],
      
      // 消息提示
      toptipsShow: false,
      toptipsMsg: '',
      toptipsType: 'error',
      
      // ActionSheet组件数据
      actionSheetItems: [],
      actionSheetTitle: ''
    },
    
    methods: {
      // 初始化上传组件
      initUploader() {
        this.setData({
          selectFile: this.selectFile.bind(this),
          uploadFile: this.uploadFile.bind(this)
        });
      },
      
      // 选择文件
      selectFile(files) {
        return new Promise((resolve) => {
          resolve({
            tempFilePaths: files.tempFilePaths,
            tempFiles: files.tempFiles
          });
        });
      },
      
      // 上传文件（仅保存临时文件路径）
      uploadFile(file) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ url: file.tempFilePath });
          }, 100);
        });
      },
      
      // 图片选择回调
      onImageSelect(e) {
        const { tempFilePaths, tempFiles } = e.detail;
        
        // 获取当前图片列表字段名（可通过dataset指定）
        const field = e.currentTarget.dataset.field || 'images';
        
        // 获取当前图片列表
        const currentImages = this.data[field] || [];
        
        // 将新选择的图片添加到列表
        const newImages = tempFilePaths.map((path, index) => ({
          url: path,
          type: tempFiles[index].type,
          size: tempFiles[index].size
        }));
        
        const updatedImages = [...currentImages, ...newImages];
        
        // 更新数据
        const updateData = {};
        updateData[field] = updatedImages;
        this.setData(updateData);
        
        return updatedImages;
      },
      
      // 图片删除回调
      onImageDelete(e) {
        const { index } = e.detail;
        
        // 获取当前图片列表字段名（可通过dataset指定）
        const field = e.currentTarget.dataset.field || 'images';
        
        // 获取当前图片列表
        const images = [...this.data[field]];
        images.splice(index, 1);
        
        // 更新数据
        const updateData = {};
        updateData[field] = images;
        this.setData(updateData);
        
        return images;
      },
      
      // 初始化搜索栏
      initSearchbar() {
        this.setData({
          search: this.search.bind(this),
          cancel: this.cancel.bind(this)
        });
      },
      
      // 搜索回调（子类可覆盖）
      search(e) {
        const value = e.detail.value;
        console.debug('[weui-behavior] search:', value);
      },
      
      // 取消搜索回调（子类可覆盖）
      cancel() {
        console.debug('[weui-behavior] cancel search');
      },
      
      // 显示对话框
      showDialog(options = {}) {
        const { title, content, buttons, success } = options;
        
        this.setData({
          dialogTitle: title || '',
          dialogContent: content || '',
          dialogButtons: buttons || [{text: '取消'}, {text: '确定'}],
          dialogShow: true
        });
        
        this._dialogCallback = success;
      },
      
      // 关闭对话框
      closeDialog() {
        this.setData({ dialogShow: false });
      },
      
      // 对话框按钮点击回调
      tapDialogButton(e) {
        const { index } = e.detail;
        this.closeDialog();
        
        if (this._dialogCallback) {
          this._dialogCallback({ index });
        }
      },
      
      /**
       * 显示顶部提示
       * @param {String} msg 提示消息
       * @param {String} type 提示类型 error|success|info
       * @param {Number} duration 显示时长，单位毫秒
       */
      showToptips(msg, type = 'error', duration = 2000) {
        this.setData({
          toptipsShow: true,
          toptipsMsg: msg,
          toptipsType: type
        });
        
        setTimeout(() => {
          this.setData({
            toptipsShow: false
          });
        }, duration);
      },
      
      /**
       * 关闭顶部提示
       */
      closeToptips() {
        this.setData({
          toptipsShow: false
        });
      },
      
      /**
       * 显示动作面板
       * @param {Array} items 选项数组，每项应包含text和value属性
       * @param {String} title 面板标题
       * @returns {Promise} 用户选择的选项
       */
      showActionSheet(items, title = '') {
        return new Promise((resolve) => {
          this.setData({
            actionSheetShow: true,
            actionSheetItems: items,
            actionSheetTitle: title
          });
          
          // 保存resolve函数以便在选择时调用
          this._actionSheetResolve = resolve;
        });
      },
      
      /**
       * 关闭动作面板
       * @param {Object|null} item 选中的项目，如果为null表示取消
       */
      closeActionSheet(item = null) {
        this.setData({
          actionSheetShow: false
        });
        
        if (this._actionSheetResolve) {
          this._actionSheetResolve(item);
          this._actionSheetResolve = null;
        }
      },
      
      /**
       * 动作面板项点击事件
       * @param {Event} e 事件对象
       */
      onActionSheetItemTap(e) {
        const { index } = e.currentTarget.dataset;
        const item = this.data.actionSheetItems[index];
        
        this.closeActionSheet(item);
      },
      
      /**
       * 动作面板取消事件
       */
      onActionSheetCancel() {
        this.closeActionSheet(null);
      }
    }
  }); 