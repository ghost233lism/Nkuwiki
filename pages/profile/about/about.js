Page({
  data: {
    companyName: '', // 公司名称
    address: '',     // 公司地址
    email: '',       // 联系邮箱
    currentYear: new Date().getFullYear(),
    introduction: `
      <h2 class="section-title">服务平台</h2>

      <div class="platform-item">
        <h3>1. Website</h3>
        <ul>
          <li>Coze</li>
          <li>Hiagent</li>
        </ul>
      </div>

      <div class="platform-item">
        <h3>2. 微信公众号</h3>
        <ul>
          <li>nkuwiki知识社区服务号（无限制，服务体验更佳）</li>
          <li>nkuwiki订阅号（消极回复限制）</li>
        </ul>
      </div>

      <div class="platform-item">
        <h3>3. 企业微信</h3>
        <p>可以群聊里@nkuwiki南开小知与wiki互动，或者把wiki拉入自己的群聊哦！（需要转为企微群）</p>
      </div>

      <div class="platform-item">
        <h3>4. 小程序</h3>
        <p>nkuwiki小程序</p>
      </div>

      <div class="platform-item">
        <h3>5. 邮箱</h3>
        <p>反馈：support@nkuwiki.com</p>
      </div>

      <div class="platform-item">
        <h3>6. 飞书Wiki</h3>
        <p>敬请期待</p>
      </div>

      <h2 class="section-title">参与方式</h2>
      <p class="subtitle">（根据项目进度动态更新中）</p>

      <div class="contribution-item">
        <h3>1. 知识维护</h3>
        <p>更新Coze知识库/飞书Wiki</p>
      </div>

      <div class="contribution-item">
        <h3>2. 数据源开发</h3>
        <p>（需编程）完善网站/校园集市/社交平台数据接口</p>
      </div>

      <div class="contribution-item">
        <h3>3. 智能体开发</h3>
        <p>（零代码/低代码）通过Prompt工程/工作流编排/LLMs等技术优化Coze智能体。目前咱们主打的是nkuwiki（定位为南开百事通），也欢迎大家利用社区提供的海量数据资源探索搭建其他智能体。</p>
      </div>

      <div class="contribution-item">
        <h3>4. 产品体验</h3>
        <p>测试智能体回答准确率/用户对话日志分析/用户需求调研/指出未来开发演进方向</p>
      </div>

      <div class="contribution-item">
        <h3>5. 创意传播</h3>
        <p>撰写宣传文案/公众号运营/制作展示素材/根据知识库和智能体生成有价值的insight<span class="highlight">（重要❗我们有了数据以后，下一步是如何利用好这些数据）</span></p>
      </div>
    `
  },

  onLoad: function() {
    this.setData({
      companyName: '沈阳最优解教育科技有限公司',
      address: '辽宁省沈阳市沈阳经济技术开发区花海路19-1号407',
      email: 'support@nkuwiki.com',
    });
  }
}); 