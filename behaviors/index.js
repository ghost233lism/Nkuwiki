/**
 * 行为集合
 * 将所有behavior导出，便于统一引用
 */
// 我们直接使用原有的behavior对象
const baseBehavior = require('./baseBehavior');
const userBehavior = require('./userBehavior');
const authBehavior = require('./authBehavior');
const postBehavior = require('./postBehavior');
const commentBehavior = require('./commentBehavior');
const notificationBehavior = require('./notificationBehavior');
const weuiBehavior = require('./weuiBehavior');
const agentBehavior = require('./agentBehavior');
const knowledgeBehavior = require('./knowledgeBehavior');

// 直接导出原始的behavior对象
module.exports = {
  baseBehavior,
  userBehavior,
  authBehavior,
  postBehavior,
  commentBehavior,
  notificationBehavior,
  weuiBehavior,
  agentBehavior,
  knowledgeBehavior
};