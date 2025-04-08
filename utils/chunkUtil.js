/**
 * 微信http流式响应处理
 * ```
 * // Example:
 * const chunkRes = createChunkRes()
 * // can`t use ref() to save task; it will lost task info
 * const task = wx.request({
 *  //...other params
 *  enableChunked: true,
 *  success: (res) => {
 *    const lastResTexts = chunkRes.onComplateReturn()
 *    // dosomething
 *   }
 * })
 * task.onChunkReceived(res => {
 *   const resTexts = chunkRes.onChunkReceivedReturn(res.data)
 *   // dosomething
 * })
 * ```
 * @returns {Object} 流式响应处理工具对象
 */
const createChunkRes = () => {
  /**
   * 分段返回开始
   */
  const CHUNK_START = 'data:';
  /**
   * 分段返回中断
   */
  const SPLIT_WORD = '\ndata:';
  /**
   * 保存返回文本
   */
  let lastText = '';
  /**
   * 保存解码异常的数据
   */
  let lastData = new Uint8Array();

  /**
   * 返回数据转文本
   * @param {any} data 接收到的数据
   * @returns {string} 转换后的文本
   */
  const getChunkText = (data) => {
    // 兼容处理,真机返回的的是 ArrayBuffer
    if (data instanceof ArrayBuffer) {
      data = new Uint8Array(data);
    }
    let text = data;
    // Uint8Array转码
    if (typeof data != 'string') {
      // 兼容处理 微信小程序不支持TextEncoder/TextDecoder
      try {
        text = decodeURIComponent(escape(String.fromCharCode(...lastData, ...data)));
        lastData = new Uint8Array();
      } catch (error) {
        text = '';
        // Uint8Array 拼接
        let swap = new Uint8Array(lastData.length + data.length);
        swap.set(lastData, 0);
        swap.set(data, lastData.length);
        lastData = swap;
      }
    }
    return text;
  };

  /**
   * 判断是否被拆分
   * @param {string} text 文本内容
   * @returns {boolean} 是否是分段开始
   */
  const isStartString = (text) => {
    return text.substring(0, 5) == CHUNK_START;
  };

  /**
   * 对被合并的多段请求拆分
   * @param {string} text 文本内容
   * @returns {string[]} 拆分后的文本数组
   */
  const splitText = (text) => {
    return text
      .replaceAll(`\n\n${SPLIT_WORD}`, `\n${SPLIT_WORD}`)
      .replaceAll(`\n${SPLIT_WORD}`, `${SPLIT_WORD}`)
      .split(SPLIT_WORD)
      .filter((str) => !!str);
  };

  /**
   * 删除文本开始的 data:
   * @param {string} text 文本内容
   * @returns {string} 处理后的文本
   */
  const removeStartText = (text) => {
    if (text.substring(0, CHUNK_START.length) == CHUNK_START) {
      return text.substring(CHUNK_START.length);
    }
    return text;
  };

  /**
   * 返回数据集
   * @param {any} res 接收到的数据
   * @param {Function} onSuccess 成功回调
   */
  const onChunkReceived = (res, onSuccess) => {
    let text = getChunkText(res);
    if (isStartString(text) && lastText) {
      onSuccess(splitText(removeStartText(lastText)));
      // 存储本次的数据
      lastText = text;
    } else {
      lastText = lastText + text;
    }
  };

  /**
   * 返回数据集(返回数据)
   * @param {any} res 接收到的数据
   * @returns {string[]|undefined} 处理后的文本数组
   */
  const onChunkReceivedReturn = function (res) {
    let text = getChunkText(res);
    if (isStartString(text) && lastText) {
      let swap = lastText;
      // 存储本次的数据
      lastText = text;
      return splitText(removeStartText(swap));
    } else {
      lastText = lastText + text;
    }
  };

  /**
   * 请求完成调用方法
   * @param {Function} onSuccess 成功回调
   */
  const onComplate = (onSuccess) => {
    if (lastText) {
      onSuccess(splitText(removeStartText(lastText)));
      lastText = '';
    }
  };

  /**
   * 请求完成调用方法(返回数据)
   * @returns {string[]|undefined} 处理后的文本数组
   */
  const onComplateReturn = () => {
    if (lastText) {
      let swap = lastText;
      lastText = '';
      return splitText(removeStartText(swap));
    }
  };

  return {
    getChunkText,
    onChunkReceived,
    onChunkReceivedReturn,
    onComplateReturn,
    onComplate
  };
};

module.exports = {
  createChunkRes
}; 