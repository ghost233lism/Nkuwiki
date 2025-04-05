/**
 * 帖子行为 - 统一帖子API交互逻辑
 */
const { createApiClient } = require('../utils/util');

// 创建帖子API客户端
const postApi = createApiClient('/api/wxapp/post', {
  list:     { method: 'GET',  path: '/list',    params: { openid: true } },
  detail:   { method: 'GET',  path: '/detail',  params: { openid: true, post_id: true } },
  like:     { method: 'POST', path: '/like',    params: { openid: true, post_id: true } },
  favorite: { method: 'POST', path: '/favorite',params: { openid: true, post_id: true } },
  status:   { method: 'GET',  path: '/status',  params: { openid: true, post_id: true } },
  create:   { method: 'POST', path: '',         params: { openid: true, title: true, content: true } },
  delete:   { method: 'POST', path: '/delete',  params: { openid: true, post_id: true } },
  update:   { method: 'POST', path: '/update',  params: { openid: true, post_id: true, title: true, content: true } }
});

module.exports = Behavior({
  methods: {
    /**
     * 获取帖子列表
     * @param {number|object} filter 分类ID或筛选条件对象
     * @param {number} page 页码
     * @param {number} limit 每页数量
     * @returns {Promise<Object>} API响应
     */
    async _getPostList(filter = {}, page = 1, limit = 10) {
      // 构建查询参数
      const params = { page, limit };
      
      // 支持直接传入分类ID的简写方式，兼容旧代码
      if (typeof filter === 'number') {
        if (filter !== 0) params.category_id = filter;
      } 
      // 支持传入对象形式的筛选条件
      else if (typeof filter === 'object') {
        // 提取通用筛选条件
        const validFilters = [
          'category_id', 'openid', 'tag', 'keyword', 
          'status', 'is_public', 'sort', 'favorite', 
          'followed', 'hot', 'type', 'order_by'
        ];
        
        // 将有效的筛选条件添加到参数中
        validFilters.forEach(key => {
          if (filter[key] !== undefined && filter[key] !== null && filter[key] !== '') {
            // 对于数组类型的参数进行处理
            if (Array.isArray(filter[key])) {
              if (filter[key].length > 0) {
                params[key] = filter[key].join(',');
              }
            } 
            // 对于0值需要特殊处理（分类ID为0表示全部分类，应该不传）
            else if (key === 'category_id' && filter[key] === 0) {
              // 不添加此条件
            }
            // 其他普通参数直接添加
            else {
              params[key] = filter[key];
            }
          }
        });
      }
      
      try {
        console.debug('API请求参数:', params);
        const res = await postApi.list(params);
        if (res.code !== 200) {
          throw new Error(res.message || '获取帖子列表失败');
        }
        return res;
      } catch (err) {
         console.debug('postBehavior _getPostList failed:', err);
         throw err;
      }
    },
    
    /**
     * 获取帖子详情
     * @param {string} postId 帖子ID
     * @returns {Promise<Object>} 帖子详情
     */
    async _getPostDetail(postId) {
      if (!postId) {
        throw new Error('未指定帖子ID');
      }
      
      try {
        const res = await postApi.detail({ post_id: postId });
        
        if (res.code !== 200) {
          throw new Error(res.message || '获取帖子详情失败');
        }
        
        return res;
      } catch (err) {
        throw err;
      }
    },
    
    /**
     * 获取帖子状态（点赞、收藏、关注等）
     * @param {string|string[]} post_ids 帖子ID或ID数组
     * @returns {Promise<Object>} API响应
     */
    async _getPostStatus(post_ids) {
      try {
        if (!post_ids || (Array.isArray(post_ids) && post_ids.length === 0)) {
          return { code: -1, message: '没有提供帖子ID' };
        }
        
        // 检查登录状态
        const openid = this.getStorage('openid');
        if (!openid) {
          return { code: -1, message: '用户未登录' };
        }
        
        // 将数组转换为逗号分隔的字符串
        const postIdsParam = Array.isArray(post_ids) ? post_ids.join(',') : post_ids;
        
        // 使用postApi发送请求，确保请求被发出
        const res = await postApi.status({ 
          post_id: postIdsParam, 
          openid: openid 
        });
        
        return res;
      } catch (err) {
        return { code: -1, message: err.message || '获取状态失败' };
      }
    },
    
    /**
     * 创建帖子
     * @param {object} postData 帖子数据
     * @returns {Promise<Object>} API响应
     */
    async _createPost(postData) {
      if (!postData || !postData.content) {
        throw new Error('帖子内容不能为空');
      }
      
      // 如果不是Markdown模式（通过判断标题是否为空字符串而不是null或undefined）
      if (postData.title !== '' && !postData.title) {
        throw new Error('帖子标题不能为空');
      }
      
      try {
        // 准备API所需参数
        const apiParams = { 
          title: postData.title,
          content: postData.content 
        };
        
        // 处理分类ID，确保是数字类型
        if (postData.category_id !== undefined) {
          // 转换为数字
          apiParams.category_id = parseInt(postData.category_id) || 1;
        } else {
          // 默认分类ID
          apiParams.category_id = 1;
        }
        
        // 处理标签
        if (postData.tag) {
          if (typeof postData.tag === 'string') {
            apiParams.tag = postData.tag;
          } else if (Array.isArray(postData.tag)) {
            apiParams.tag = JSON.stringify(postData.tag);
          }
          console.debug('处理标签字段', { 原始值: postData.tag, 处理后值: apiParams.tag });
        }
        
        // 处理图片，使用正确的字段名image
        if (postData.images) {
          if (typeof postData.images === 'string') {
            apiParams.image = postData.images;
          } else if (Array.isArray(postData.images)) {
            apiParams.image = JSON.stringify(postData.images);
          }
          console.debug('处理图片字段', { 原始值: postData.images, 处理后值: apiParams.image });
        }
        
        // 处理其他字段
        if (postData.is_public !== undefined) apiParams.is_public = postData.is_public;
        if (postData.allow_comment !== undefined) apiParams.allow_comment = postData.allow_comment;
        if (postData.location) apiParams.location = JSON.stringify(postData.location);
        if (postData.nickname) apiParams.nickname = postData.nickname;
        if (postData.avatar) apiParams.avatar = postData.avatar;
        if (postData.wiki_knowledge !== undefined) apiParams.wiki_knowledge = postData.wiki_knowledge;
        if (postData.style) apiParams.style = postData.style;
        
        const res = await postApi.create(apiParams);
        if (res.code !== 200) {
          throw new Error(res.message || '创建帖子失败');
        }
        return res;
      } catch (err) {
        throw err;
      }
    },
    
    /**
     * 更新帖子
     * @param {string} postId 帖子ID
     * @param {object} postData 更新的帖子数据
     * @returns {Promise<Object>} API响应
     */
    async _updatePost(postId, postData) {
      if (!postId) {
        throw new Error('未指定帖子ID');
      }
      
      try {
        // 准备API参数
        const apiParams = { post_id: postId };
        
        // 处理可更新字段
        if (postData.title !== undefined) apiParams.title = postData.title;
        if (postData.content !== undefined) apiParams.content = postData.content;
        if (postData.category_id !== undefined) apiParams.category_id = postData.category_id;
        
        // 处理图片
        if (postData.image !== undefined) {
          if (typeof postData.image === 'string') {
            apiParams.image = postData.image;
          } else if (Array.isArray(postData.image)) {
            apiParams.image = JSON.stringify(postData.image);
          }
        }
        
        // 处理标签
        if (postData.tag !== undefined) {
          if (typeof postData.tag === 'string') {
            apiParams.tag = postData.tag;
          } else if (Array.isArray(postData.tag)) {
            apiParams.tag = JSON.stringify(postData.tag);
          }
        }
        
        const res = await postApi.update(apiParams);
        if (res.code !== 200) {
          throw new Error(res.message || '更新帖子失败');
        }
        return res;
      } catch (err) {
        throw err;
      }
    },
    
    /**
     * 删除帖子
     * @param {string} postId 帖子ID
     * @returns {Promise<Object>} API响应
     */
    async _deletePost(postId) {
      if (!postId) {
        throw new Error('未指定帖子ID');
      }
      
      try {
        const res = await postApi.delete({ post_id: postId });
        if (res.code !== 200) {
          throw new Error(res.message || '删除帖子失败');
        }
        return res;
      } catch (err) {
        throw err;
      }
    },
    
    /**
     * 点赞/取消点赞帖子
     * @param {string} postId 帖子ID
     * @returns {Promise<Object>} API响应
     */
    async _likePost(postId) {
      if (!postId) {
        throw new Error('未指定帖子ID');
      }
      
      try {
        const res = await postApi.like({ post_id: postId });
        if (res.code !== 200) {
          throw new Error(res.message || '点赞操作失败');
        }
        return res;
      } catch (err) {
        console.debug('postBehavior _likePost failed:', err);
        throw err;
      }
    },
    
    /**
     * 收藏/取消收藏帖子
     * @param {string} postId 帖子ID
     * @returns {Promise<Object>} API响应
     */
    async _favoritePost(postId) {
      if (!postId) {
        throw new Error('未指定帖子ID');
      }
      
      try {
        const res = await postApi.favorite({ post_id: postId });
        if (res.code !== 200) {
          throw new Error(res.message || '收藏操作失败');
        }
        return res;
      } catch (err) {
        console.debug('postBehavior _favoritePost failed:', err);
        throw err;
      }
    }
  }
}); 