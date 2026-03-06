// HTML 转义函数，防止 XSS 攻击
const escapeHtml = (text) => {
  if (text == null) return '';
  const str = String(text);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// 主应用逻辑
const App = {
  currentPage: '',

  // 初始化
  init() {
    try {
      console.log('App.init() started');
      this.initStorage();
      console.log('Storage initialized');
      this.router();
      console.log('Router called');
    } catch (e) {
      console.error('App init error:', e);
      this.showError('初始化失败: ' + e.message);
    }
  },

  // 显示错误信息
  showError(msg) {
    document.getElementById('page-container').innerHTML = `
      <div style="padding: 50px; text-align: center;">
        <div style="font-size: 18px; color: #ff4d4f; margin-bottom: 10px;">⚠️ 出错了</div>
        <div style="font-size: 14px; color: #666;">${escapeHtml(msg)}</div>
        <pre style="font-size: 12px; color: #999; margin-top: 20px; text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${escapeHtml(msg)}</pre>
      </div>
    `;
  },

  // 确保存储初始化
  initStorage() {
    if (typeof localStorage === 'undefined') {
      throw new Error('浏览器不支持 localStorage');
    }
    if (!localStorage.getItem('weight_challenge_data')) {
      localStorage.setItem('weight_challenge_data', JSON.stringify({
        competitions: [],
        version: '1.0'
      }));
    }
  },

  // 路由管理
  router() {
    const hash = location.hash.slice(1) || 'index';
    const [page, ...params] = hash.split('/');

    switch(page) {
      case 'index':
        this.renderIndex();
        break;
      case 'competition':
        this.renderCompetition(params[0]);
        break;
      case 'create':
        this.renderCreate();
        break;
      case 'participant':
        this.renderParticipant(params[0]);
        break;
      case 'record':
        this.renderRecord(params[0]);
        break;
      case 'chart':
        this.renderChart(params[0]);
        break;
      case 'export':
        this.renderExport(params[0]);
        break;
      default:
        this.renderIndex();
    }

    this.currentPage = page;
  },

  // 导航
  navigateTo(hash) {
    location.hash = hash;
    this.router();
  },

  goBack() {
    history.back();
  },

  // Toast 提示
  toast(message, duration = 2000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  },

  // 确认弹窗
  confirm(title, content, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">${escapeHtml(title)}</div>
        <div class="modal-text">${escapeHtml(content)}</div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-block" id="btn-cancel">取消</button>
          <button class="btn btn-primary btn-block" id="btn-confirm">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-cancel').onclick = () => modal.remove();
    modal.querySelector('#btn-confirm').onclick = () => {
      modal.remove();
      onConfirm && onConfirm();
    };
  },

  // ========== 页面渲染 ==========

  // 首页 - 比赛列表
  renderIndex() {
    const competitions = Storage.getCompetitions();
    const totalParticipants = competitions.reduce((sum, c) => sum + (c.participants?.length || 0), 0);
    const totalFund = competitions.reduce((sum, c) => {
      return sum + c.participants?.reduce((pSum, p) => pSum + (p.investment || 0), 0) || 0;
    }, 0);

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-title">体重挑战</div>
          <span></span>
        </div>

        <div class="card card-flat">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${competitions.length}</div>
              <div class="stat-label">比赛</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${totalParticipants}</div>
              <div class="stat-label">参与者</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">¥${totalFund.toFixed(0)}</div>
              <div class="stat-label">总奖金</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="import-section">
            <button class="btn btn-secondary btn-sm" onclick="App.showGlobalImport()">
              <span>↓</span> 导入比赛
            </button>
          </div>

          ${competitions.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">⊘</div>
              <div class="empty-title">暂无比赛</div>
              <p>点击右下角创建新比赛</p>
            </div>
          ` : `
            <div class="list">
              ${competitions.map(c => {
                const fund = Calculator.calculateFund(c);
                const progress = Calculator.getProgressPercent(c.startDate, c.endDate);
                const statusClass = c.status === 'registering' ? 'primary' : c.status === 'ongoing' ? 'success' : 'warning';
                const statusText = { 'registering': '报名中', 'ongoing': '进行中', 'ended': '已结束' }[c.status] || c.status;

                return `
                  <div class="list-item" onclick="App.navigateTo('competition/${c._id}')">
                    <div class="list-item-content" style="flex: 1; min-width: 0;">
                      <div class="list-item-title">${escapeHtml(c.name)}</div>
                      <div class="list-item-meta">
                        ${Calculator.formatDate(c.startDate)} - ${Calculator.formatDate(c.endDate)}
                        · ${c.participants?.length || 0}人
                      </div>
                      ${c.status === 'ongoing' ? `
                        <div class="progress-bar">
                          <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                      ` : ''}
                    </div>
                    <div style="text-align: right; margin-left: 16px; flex-shrink: 0;">
                      <div style="font-size: 17px; font-weight: 600; margin-bottom: 4px;">¥${fund.totalFund.toFixed(0)}</div>
                      <span class="tag tag-${statusClass}">${statusText}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <div class="fab" onclick="App.navigateTo('create')">+</div>
      </div>
    `;
  },

  // 创建比赛页面
  renderCreate() {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const thirtyDaysLater = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">创建比赛</div>
          <span></span>
        </div>

        <div class="card">
          <div class="form-group">
            <label class="form-label">比赛名称</label>
            <input type="text" class="form-input" id="name" placeholder="例如：春节减重挑战" maxlength="50">
          </div>

          <div class="form-group">
            <label class="form-label">开始日期</label>
            <input type="date" class="form-input" id="startDate" value="${tomorrow}" min="${today}">
          </div>

          <div class="form-group">
            <label class="form-label">结束日期</label>
            <input type="date" class="form-input" id="endDate" value="${thirtyDaysLater}" min="${tomorrow}">
          </div>

          <div class="form-group">
            <label class="form-label">人数上限（可选）</label>
            <input type="number" class="form-input" id="maxParticipants" placeholder="不填则无限制" min="2" max="100">
          </div>

          <button class="btn btn-primary btn-block" onclick="App.submitCreate()">创建</button>
        </div>
      </div>
    `;
  },

  // 提交创建
  submitCreate() {
    const nameInput = document.getElementById('name');
    const name = nameInput ? nameInput.value.trim() : '';
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const maxParticipants = document.getElementById('maxParticipants').value;

    if (!name) {
      this.toast('请输入比赛名称');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    if (end <= start) {
      this.toast('结束日期应晚于开始日期');
      return;
    }

    if (days < 7) {
      this.toast('比赛时长至少7天');
      return;
    }

    if (days > 365) {
      this.toast('比赛时长不超过一年');
      return;
    }

    const competition = Storage.createCompetition({
      name,
      startDate,
      endDate,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : 0,
      targetLossPercent: 5,
      suggestedInvestment: 0
    });

    this.toast('创建成功');
    setTimeout(() => this.navigateTo('competition/' + competition._id), 500);
  },

  // 比赛详情页
  renderCompetition(id) {
    const competition = Storage.getCompetition(id);
    if (!competition) {
      this.toast('比赛不存在');
      this.navigateTo('index');
      return;
    }

    const fund = Calculator.calculateFund(competition);
    const ranking = Calculator.calculateRanking(competition);
    const rewards = Calculator.calculateRewards(competition);

    const statusClass = competition.status === 'registering' ? 'primary' : competition.status === 'ongoing' ? 'success' : 'warning';
    const statusText = { 'registering': '报名中', 'ongoing': '进行中', 'ended': '已结束' }[competition.status] || competition.status;

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">${escapeHtml(competition.name)}</div>
          <span></span>
        </div>

        <div class="card card-flat">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span class="tag tag-${statusClass}">${statusText}</span>
            <span style="font-size: 13px; color: var(--color-text-secondary);">
              ${Calculator.formatDate(competition.startDate)} - ${Calculator.formatDate(competition.endDate)}
            </span>
          </div>

          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${fund.totalFundText}</div>
              <div class="stat-label">总奖金</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${fund.participantCount}</div>
              <div class="stat-label">参与者</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${Calculator.getRemainingDays(competition.endDate)}</div>
              <div class="stat-label">剩余天数</div>
            </div>
          </div>

          <div class="actions-row" style="margin-top: 20px;">
            ${competition.status === 'registering' && competition.participants.length >= 2 ? `
              <button class="btn btn-primary" onclick="App.startCompetition('${id}')">开始比赛</button>
            ` : ''}
            ${competition.status === 'ongoing' ? `
              <button class="btn btn-danger" onclick="App.endCompetition('${id}')">结束比赛</button>
            ` : ''}
            <button class="btn btn-secondary" onclick="App.navigateTo('export/${id}')">导出</button>
            <button class="btn btn-ghost" onclick="App.deleteCompetition('${id}')">删除</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">参与者 (${competition.participants.length})</span>
            ${competition.status !== 'ended' ? `
              <button class="btn btn-primary btn-sm" onclick="App.navigateTo('participant/${id}')">+ 添加</button>
            ` : ''}
          </div>

          ${competition.participants.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">⊘</div>
              <div class="empty-title">暂无参与者</div>
              <p>点击右上角添加参与者</p>
            </div>
          ` : `
            <div class="list">
              ${ranking.map((p, index) => {
                const isWeightLoss = p.targetWeight < p.initialWeight;
                const reward = competition.status === 'ended' && rewards.length > 0 ? rewards.find(r => r.id === p.id) : null;
                return `
                  <div class="list-item" onclick="App.navigateTo('record/${id}')">
                    <div class="rank-number ${index < 3 ? 'top3' : ''}">${index + 1}</div>
                    <div class="rank-info" style="flex: 1; min-width: 0;">
                      <div class="rank-name">${escapeHtml(p.name)}</div>
                      <div class="rank-meta">
                        ${isWeightLoss ? '↓' : '↑'} ${Math.abs(p.initialWeight - p.currentWeight).toFixed(1)}kg / ${Math.abs(p.initialWeight - p.targetWeight).toFixed(1)}kg · ${p.progress.toFixed(0)}%
                      </div>
                    </div>
                    <div style="text-align: right; margin-left: 16px; flex-shrink: 0;">
                      <div style="font-size: 17px; font-weight: 600; margin-bottom: 4px;">${p.currentWeight}kg</div>
                      <div style="font-size: 12px; color: ${p.isCompleted ? 'var(--color-success)' : 'var(--color-text-secondary)'}; font-weight: 500;">
                        ${p.isCompleted ? '✓ 已达标' : '○ 进行中'}
                      </div>
                      ${reward ? `
                        <div style="font-size: 13px; color: ${reward.profit >= 0 ? 'var(--color-success)' : '#ff3b30'}; font-weight: 500; margin-top: 2px;">
                          ${reward.profit >= 0 ? '+' : ''}${reward.profit.toFixed(0)}元
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        ${competition.participants.length > 0 ? `
          <div class="card">
            <button class="btn btn-primary btn-block" onclick="App.navigateTo('chart/${id}')">查看趋势图</button>
          </div>
        ` : ''}
      </div>
    `;
  },

  // 开始比赛
  startCompetition(id) {
    const competition = Storage.getCompetition(id);
    if (competition.participants.length < 2) {
      this.toast('至少需要2人才能开始');
      return;
    }
    if (competition.maxParticipants > 0 && competition.participants.length > competition.maxParticipants) {
      this.toast(`人数超过上限（最多${competition.maxParticipants}人）`);
      return;
    }

    Storage.updateCompetition(id, { status: 'ongoing' });
    this.toast('比赛开始！');
    this.renderCompetition(id);
  },

  // 结束比赛
  endCompetition(id) {
    this.confirm('确认结束', '结束后将无法再记录体重，确定要结束比赛吗？', () => {
      Storage.updateCompetition(id, { status: 'ended' });
      this.toast('比赛已结束');
      this.renderCompetition(id);
    });
  },

  // 删除比赛
  deleteCompetition(id) {
    this.confirm('确认删除', '删除后将无法恢复，确定要删除吗？', () => {
      Storage.deleteCompetition(id);
      this.toast('已删除');
      this.navigateTo('index');
    });
  },

  // 添加参与者页面
  renderParticipant(competitionId) {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">添加参与者</div>
          <span></span>
        </div>

        <div class="card">
          <div class="form-group">
            <label class="form-label">姓名</label>
            <input type="text" class="form-input" id="name" placeholder="请输入姓名" maxlength="20">
          </div>

          <div class="form-group">
            <label class="form-label">初始体重 (kg)</label>
            <input type="number" class="form-input" id="initialWeight" placeholder="例如：70.5" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label">目标体重 (kg)</label>
            <input type="number" class="form-input" id="targetWeight" placeholder="例如：65.0" step="0.1">
          </div>

          <div class="form-group">
            <label class="form-label">投入金额 (¥)</label>
            <input type="number" class="form-input" id="investment" placeholder="例如：100" min="1">
          </div>

          <div id="preview" class="card card-flat" style="display: none;">
            <div style="font-size: 14px; color: var(--color-text-secondary);">
              计划<span id="preview-action"></span> <span id="preview-amount" style="font-weight: 600; color: var(--color-accent);"></span>kg
              (<span id="preview-percent"></span>%)
            </div>
          </div>

          <button class="btn btn-primary btn-block" onclick="App.submitParticipant('${competitionId}')">添加</button>
        </div>
      </div>
    `;

    // 监听输入变化
    ['initialWeight', 'targetWeight'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updatePreview());
    });
  },

  updatePreview() {
    const initial = parseFloat(document.getElementById('initialWeight')?.value);
    const target = parseFloat(document.getElementById('targetWeight')?.value);

    if (initial && target && initial !== target) {
      const isLoss = target < initial;
      const change = Math.abs(initial - target).toFixed(1);
      const percent = ((change / initial) * 100).toFixed(1);

      document.getElementById('preview').style.display = 'block';
      document.getElementById('preview-action').textContent = isLoss ? '减重' : '增重';
      document.getElementById('preview-amount').textContent = change;
      document.getElementById('preview-percent').textContent = percent;
    } else {
      document.getElementById('preview').style.display = 'none';
    }
  },

  submitParticipant(competitionId) {
    const name = document.getElementById('name').value.trim();
    const initialWeight = parseFloat(document.getElementById('initialWeight').value);
    const targetWeight = parseFloat(document.getElementById('targetWeight').value);
    const investment = parseFloat(document.getElementById('investment').value);

    if (!name) {
      this.toast('请输入姓名');
      return;
    }
    if (!initialWeight || initialWeight < 20 || initialWeight > 300) {
      this.toast('初始体重应在 20-300kg 之间');
      return;
    }
    if (!targetWeight || targetWeight < 20 || targetWeight > 300) {
      this.toast('目标体重应在 20-300kg 之间');
      return;
    }
    if (initialWeight === targetWeight) {
      this.toast('目标体重不能与初始体重相同');
      return;
    }
    if (!investment || investment < 1) {
      this.toast('投入金额至少为1元');
      return;
    }
    if (investment > 100000) {
      this.toast('投入金额不能超过10万元');
      return;
    }

    Storage.addParticipant(competitionId, {
      name,
      initialWeight,
      targetWeight,
      investment
    });

    this.toast('添加成功');
    this.goBack();
  },

  // 记录体重页面
  renderRecord(competitionId) {
    const competition = Storage.getCompetition(competitionId);
    if (!competition) {
      this.toast('比赛不存在');
      this.navigateTo('index');
      return;
    }

    if (competition.status === 'ended') {
      this.toast('比赛已结束，无法记录体重');
      this.goBack();
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">记录体重</div>
          <span></span>
        </div>

        <div class="card">
          <div class="form-group">
            <label class="form-label">选择参与者</label>
            <select class="form-input" id="participantSelect" onchange="App.onParticipantChange('${competitionId}')">
              <option value="">请选择</option>
              ${competition.participants.map(p => `
                <option value="${p.id}" data-initial="${p.initialWeight}" data-target="${p.targetWeight}" data-current="${p.currentWeight}">
                  ${escapeHtml(p.name)} (当前: ${p.currentWeight}kg)
                </option>
              `).join('')}
            </select>
          </div>

          <div id="participantInfo" class="card card-flat" style="display: none;">
            <div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--color-text-secondary);">
              <span>初始 <strong id="infoInitial" style="color: var(--color-text);"></strong>kg</span>
              <span>目标 <strong id="infoTarget" style="color: var(--color-text);"></strong>kg</span>
              <span id="infoChange"></span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">日期</label>
            <input type="date" class="form-input" id="recordDate" value="${today}">
          </div>

          <div class="form-group">
            <label class="form-label">体重 (kg)</label>
            <div style="display: flex; align-items: center; gap: 10px;">
              <button class="btn btn-secondary btn-sm" onclick="App.adjustWeight(-0.5)">-0.5</button>
              <input type="number" class="form-input" id="weight" placeholder="0.0" step="0.1" style="flex: 1; text-align: center;">
              <button class="btn btn-secondary btn-sm" onclick="App.adjustWeight(0.5)">+0.5</button>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="App.resetWeight()">重置</button>
            </div>
          </div>

          <div id="weightChange" class="card card-flat" style="display: none; text-align: center;">
            <span id="changeText"></span>
          </div>

          <button class="btn btn-primary btn-block" onclick="App.submitRecord('${competitionId}')">保存</button>
        </div>
      </div>
    `;

    this.currentParticipant = null;
  },

  currentParticipant: null,

  onParticipantChange(competitionId) {
    const select = document.getElementById('participantSelect');
    const option = select.options[select.selectedIndex];
    if (!option.value) {
      document.getElementById('participantInfo').style.display = 'none';
      this.currentParticipant = null;
      return;
    }

    const initial = parseFloat(option.dataset.initial);
    const target = parseFloat(option.dataset.target);
    const current = parseFloat(option.dataset.current);
    const isLoss = target < initial;

    this.currentParticipant = {
      id: option.value,
      initialWeight: initial,
      targetWeight: target,
      currentWeight: current
    };

    document.getElementById('participantInfo').style.display = 'block';
    document.getElementById('infoInitial').textContent = initial;
    document.getElementById('infoTarget').textContent = target;

    const change = Math.abs(initial - current).toFixed(1);
    const changeEl = document.getElementById('infoChange');
    changeEl.innerHTML = isLoss
      ? `已减: <strong style="color: #52c41a;">${change}</strong>kg`
      : `已增: <strong style="color: #fa8c16;">${change}</strong>kg`;

    // 设置默认值
    document.getElementById('weight').value = current;
  },

  adjustWeight(delta) {
    const input = document.getElementById('weight');
    let current = parseFloat(input.value) || this.currentParticipant?.currentWeight || 0;
    current = Math.max(0, current + delta);
    input.value = current.toFixed(1);
    this.updateWeightChange();
  },

  resetWeight() {
    if (this.currentParticipant) {
      document.getElementById('weight').value = this.currentParticipant.currentWeight;
      this.updateWeightChange();
    }
  },

  updateWeightChange() {
    if (!this.currentParticipant) return;

    const newWeight = parseFloat(document.getElementById('weight').value);
    if (!newWeight) {
      document.getElementById('weightChange').style.display = 'none';
      return;
    }

    const change = newWeight - this.currentParticipant.currentWeight;
    const changeEl = document.getElementById('weightChange');
    const textEl = document.getElementById('changeText');

    changeEl.style.display = 'block';
    if (change > 0) {
      textEl.innerHTML = `<span style="color: #ff4d4f;">↑ 增加 ${change.toFixed(1)} kg</span>`;
    } else if (change < 0) {
      textEl.innerHTML = `<span style="color: #52c41a;">↓ 减少 ${Math.abs(change).toFixed(1)} kg</span>`;
    } else {
      textEl.innerHTML = '<span style="color: #999;">无变化</span>';
    }
  },

  submitRecord(competitionId) {
    const select = document.getElementById('participantSelect');
    const participantId = select.value;
    const weight = parseFloat(document.getElementById('weight').value);
    const date = document.getElementById('recordDate').value;

    if (!participantId) {
      this.toast('请选择参与者');
      return;
    }
    if (!weight || weight < 20 || weight > 300) {
      this.toast('体重应在 20-300kg 之间');
      return;
    }

    Storage.recordWeight(competitionId, participantId, weight, date);

    // 检查是否达标
    const participant = this.currentParticipant;
    const isWeightLoss = participant.targetWeight < participant.initialWeight;
    const isCompleted = isWeightLoss
      ? weight <= participant.targetWeight
      : weight >= participant.targetWeight;

    if (isCompleted) {
      this.toast('🎉 恭喜达标！', 3000);
    } else {
      this.toast('记录成功');
    }

    setTimeout(() => this.goBack(), 1000);
  },

  // 图表页面（简化版）
  renderChart(competitionId) {
    const competition = Storage.getCompetition(competitionId);
    if (!competition) {
      this.toast('比赛不存在');
      this.navigateTo('index');
      return;
    }

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">趋势图</div>
          <span></span>
        </div>

        <div class="card">
          ${competition.participants.map(p => {
            const records = competition.weightRecords?.[p.id] || [];
            if (records.length === 0) {
              return `
                <div class="chart-container" style="border-bottom: 1px solid var(--color-border); margin-bottom: 20px; padding-bottom: 20px;">
                  <div class="rank-name" style="margin-bottom: 8px;">${escapeHtml(p.name)}</div>
                  <div class="list-item-meta">暂无记录</div>
                </div>
              `;
            }

            const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
            const minWeight = Math.min(...sorted.map(r => r.weight), p.initialWeight) - 1;
            const maxWeight = Math.max(...sorted.map(r => r.weight), p.initialWeight) + 1;
            const range = maxWeight - minWeight || 1;

            return `
              <div class="chart-container" style="border-bottom: 1px solid var(--color-border); margin-bottom: 20px; padding-bottom: 20px;">
                <div class="rank-name" style="margin-bottom: 8px;">${escapeHtml(p.name)} · ${p.initialWeight}kg → ${p.currentWeight}kg</div>
                <div class="chart-bar">
                  ${sorted.map((r, i) => {
                    const height = ((r.weight - minWeight) / range) * 80 + 10;
                    const isTarget = Math.abs(r.weight - p.targetWeight) < 0.1;
                    return `
                      <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div class="chart-bar-item" style="height: ${height}px; background: ${isTarget ? 'var(--color-success)' : 'var(--color-accent)'};"></div>
                        <div class="chart-label">${r.date.slice(5)}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // 导出/分享页面
  renderExport(competitionId) {
    const competition = Storage.getCompetition(competitionId);
    if (!competition) {
      this.toast('比赛不存在');
      this.navigateTo('index');
      return;
    }

    const jsonData = Storage.exportCompetition(competitionId);

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">导出/分享</div>
          <span></span>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom: 12px;">↑ 导出</div>
          <p style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px; line-height: 1.5;">
            复制下方数据，发送给朋友即可导入。
          </p>
          <textarea class="textarea-export" id="exportData" readonly>${jsonData}</textarea>
          <button class="btn btn-primary btn-block" style="margin-top: 16px;" onclick="App.copyExportData()">
            复制到剪贴板
          </button>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom: 12px;">↓ 导入</div>
          <p style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px; line-height: 1.5;">
            粘贴朋友分享的数据，导入此比赛。
          </p>
          <textarea class="textarea-export" id="importData" placeholder="粘贴比赛数据..."></textarea>
          <button class="btn btn-primary btn-block" style="margin-top: 16px;" onclick="App.submitImport()">
            导入数据
          </button>
        </div>

        <div class="card card-flat">
          <div style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.6;">
            提示：导入会覆盖本地同名比赛数据，所有数据仅存储在浏览器本地。
          </div>
        </div>
      </div>
    `;
  },

  copyExportData() {
    const textarea = document.getElementById('exportData');
    const text = textarea.value;

    // 使用现代 Clipboard API，支持移动端
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.toast('已复制到剪贴板');
      }).catch(() => {
        // 降级方案
        this.fallbackCopy(textarea);
      });
    } else {
      // 旧浏览器降级
      this.fallbackCopy(textarea);
    }
  },

  // 降级复制方案
  fallbackCopy(textarea) {
    textarea.select();
    textarea.setSelectionRange(0, 99999); // 移动端兼容
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.toast('已复制到剪贴板');
      } else {
        this.toast('复制失败，请手动复制');
      }
    } catch (err) {
      this.toast('复制失败，请手动复制');
    }
  },

  // 全局导入页面（首页入口）
  showGlobalImport() {
    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">导入比赛</div>
          <span></span>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom: 12px;">↓ 导入</div>
          <p style="font-size: 14px; color: var(--color-text-secondary); margin-bottom: 12px; line-height: 1.5;">
            粘贴朋友分享的比赛数据，即可在本地查看。
          </p>
          <textarea class="textarea-export" id="globalImportData" placeholder="粘贴比赛数据..."></textarea>
          <button class="btn btn-primary btn-block" style="margin-top: 16px;" onclick="App.submitGlobalImport()">
            导入比赛
          </button>
        </div>

        <div class="card card-flat">
          <div style="font-size: 13px; color: var(--color-text-secondary); line-height: 1.6;">
            导入后会添加到你的比赛列表。导入同一比赛会覆盖本地数据。
          </div>
        </div>
      </div>
    `;
  },

  // 全局导入提交
  submitGlobalImport() {
    const data = document.getElementById('globalImportData').value.trim();
    if (!data) {
      this.toast('请粘贴数据');
      return;
    }

    const result = Storage.importCompetition(data);
    if (result.success) {
      this.toast('导入成功');
      setTimeout(() => this.navigateTo('competition/' + result.data._id), 500);
    } else {
      this.toast(result.msg);
    }
  },

  submitImport() {
    const data = document.getElementById('importData').value.trim();
    if (!data) {
      this.toast('请粘贴数据');
      return;
    }

    const result = Storage.importCompetition(data);
    if (result.success) {
      this.toast('导入成功');
      setTimeout(() => this.navigateTo('competition/' + result.data._id), 500);
    } else {
      this.toast(result.msg);
    }
  }
};

// 启动应用
try {
  window.addEventListener('hashchange', () => App.router());
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    App.init();
  });
} catch (e) {
  console.error('App initialization failed:', e);
  document.getElementById('page-container').innerHTML = `
    <div style="padding: 50px; text-align: center; color: #ff4d4f;">
      <div style="font-size: 18px; margin-bottom: 10px;">⚠️ 加载失败</div>
      <div style="font-size: 14px; color: #666;">${escapeHtml(e.message)}</div>
    </div>
  `;
}
