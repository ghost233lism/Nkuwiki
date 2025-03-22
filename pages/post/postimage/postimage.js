selectImage: function() {
  // 已有选择图片的逻辑...
  
  wx.chooseMedia({
    count: remainCount,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'], // 使用压缩模式
    success: function(res) {
      // 处理结果...
    }
  });
}