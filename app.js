// 主应用逻辑
const App = {
  currentPage: '',

  // 初始化
  init() {
    this.initStorage();
    this.router();
  },

  // 确保存储初始化
  initStorage() {
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
        <div class="modal-title">${title}</div>
        <div class="modal-text">${content}</div>
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

        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-value">${competitions.length}</div>
            <div class="stat-label">我的比赛</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${totalParticipants}</div>
            <div class="stat-label">参与人数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">¥${totalFund.toFixed(0)}</div>
            <div class="stat-label">总奖金</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">我的比赛</span>
            <span style="color: #999; font-size: 14px;">${competitions.length} 个</span>
          </div>

          ${competitions.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <p>还没有创建比赛</p>
              <p style="font-size: 12px; margin-top: 8px;">点击右下角创建</p>
            </div>
          ` : `
            <div class="list" style="margin: 0;">
              ${competitions.map(c => {
                const fund = Calculator.calculateFund(c);
                const progress = Calculator.getProgressPercent(c.startDate, c.endDate);
                const statusText = {
                  'registering': '报名中',
                  'ongoing': '进行中',
                  'ended': '已结束'
                }[c.status] || c.status;

                return `
                  <div class="list-item" onclick="App.navigateTo('competition/${c._id}')">
                    <div>
                      <div style="font-weight: 600;">${c.name}</div>
                      <div style="font-size: 12px; color: #999; margin-top: 4px;">
                        ${Calculator.formatDate(c.startDate)} - ${Calculator.formatDate(c.endDate)}
                      </div>
                      <div style="margin-top: 8px;">
                        <span class="tag tag-${c.status === 'registering' ? 'primary' : c.status === 'ongoing' ? 'success' : 'warning'}">${statusText}</span>
                        <span style="font-size: 12px; color: #666; margin-left: 8px;">${c.participants?.length || 0}人参与</span>
                      </div>
                      ${c.status === 'ongoing' ? `
                        <div class="progress-bar" style="margin-top: 8px;">
                          <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                      ` : ''}
                    </div>
                    <div style="text-align: right;">
                      <div style="color: #07c160; font-weight: 600;">¥${fund.totalFund.toFixed(0)}</div>
                      <div style="font-size: 12px; color: #999;">奖池</div>
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
            <input type="text" class="form-input" id="name" placeholder="例如：春节减重挑战">
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
    const name = document.getElementById('name').value.trim();
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

    const statusText = {
      'registering': '报名中',
      'ongoing': '进行中',
      'ended': '已结束'
    }[competition.status] || competition.status;

    document.getElementById('page-container').innerHTML = `
      <div class="page">
        <div class="navbar">
          <div class="navbar-back" onclick="App.goBack()">‹</div>
          <div class="navbar-title">${competition.name}</div>
          <span></span>
        </div>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="tag tag-${competition.status === 'registering' ? 'primary' : competition.status === 'ongoing' ? 'success' : 'warning'}">${statusText}</span>
            </div>
            <div style="font-size: 12px; color: #999;">
              ${Calculator.formatDate(competition.startDate)} - ${Calculator.formatDate(competition.endDate)}
            </div>
          </div>

          <div class="stats-row" style="margin: 15px 0 0; padding: 15px 0; background: #f9f9f9; border-radius: 8px;">
            <div class="stat-item">
              <div class="stat-value">${fund.totalFundText}</div>
              <div class="stat-label">总奖金</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${fund.participantCount}</div>
              <div class="stat-label">参与人数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${Calculator.getRemainingDays(competition.endDate)}</div>
              <div class="stat-label">剩余天数</div>
            </div>
          </div>

          <div class="data-actions" style="padding: 15px 0 0; margin: 0;">
            ${competition.status === 'registering' && competition.participants.length >= 2 ? `
              <button class="btn btn-primary btn-sm" onclick="App.startCompetition('${id}')">开始比赛</button>
            ` : ''}
            ${competition.status === 'ongoing' ? `
              <button class="btn btn-danger btn-sm" onclick="App.endCompetition('${id}')">结束比赛</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="App.navigateTo('export/${id}')">导出/分享</button>
            <button class="btn btn-secondary btn-sm" onclick="App.deleteCompetition('${id}')">删除</button>
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
            <div class="empty-state" style="padding: 30px;">
              <p>还没有参与者</p>
              <p style="font-size: 12px; color: #999; margin-top: 8px;">点击右上角添加</p>
            </div>
          ` : `
            <div class="list" style="margin: 0;">
              ${ranking.map((p, index) => {
                const isWeightLoss = p.targetWeight < p.initialWeight;
                return `
                  <div class="list-item" onclick="App.navigateTo('record/${id}')">
                    <div style="display: flex; align-items: center; flex: 1;">
                      <div class="rank-number ${index < 3 ? 'top3' : ''}">${index + 1}</div>
                      <div class="rank-info">
                        <div class="rank-name">${p.name} ${p.gender === 'male' ? '♂' : p.gender === 'female' ? '♀' : ''}</div>
                        <div class="rank-progress">
                          ${isWeightLoss ? '↓' : '↑'} ${Math.abs(p.initialWeight - p.currentWeight).toFixed(1)}kg / 目标${Math.abs(p.initialWeight - p.targetWeight).toFixed(1)}kg
                          (${p.progress.toFixed(0)}%)
                        </div>
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-weight: 600;">${p.currentWeight}kg</div>
                      <div style="font-size: 12px; color: ${p.isCompleted ? '#52c41a' : '#999'};">
                        ${p.isCompleted ? '✓ 已达标' : '○ 未达标'}
                      </div>
                      ${competition.status === 'ended' && rewards.length > 0 ? `
                        <div style="font-size: 12px; color: ${rewards.find(r => r.id === p.id)?.profit >= 0 ? '#52c41a' : '#ff4d4f'};">
                          ${rewards.find(r => r.id === p.id)?.rewardText || ''}
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
            <input type="text" class="form-input" id="name" placeholder="请输入姓名">
          </div>

          <div class="form-group">
            <label class="form-label">性别</label>
            <div class="gender-select">
              <div class="gender-option" data-gender="male" onclick="App.selectGender('male')">♂ 男</div>
              <div class="gender-option" data-gender="female" onclick="App.selectGender('female')">♀ 女</div>
            </div>
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

          <div id="preview" style="display: none; background: #f0f8f0; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-size: 14px; color: #666;">
              计划<span id="preview-action"></span>: <span id="preview-amount" style="font-weight: 600; color: #07c160;"></span>kg
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

  selectedGender: '',

  selectGender(gender) {
    this.selectedGender = gender;
    document.querySelectorAll('.gender-option').forEach(el => {
      el.classList.toggle('active', el.dataset.gender === gender);
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
    if (!this.selectedGender) {
      this.toast('请选择性别');
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
      gender: this.selectedGender,
      initialWeight,
      targetWeight,
      investment
    });

    this.selectedGender = '';
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
                  ${p.name} (当前: ${p.currentWeight}kg)
                </option>
              `).join('')}
            </select>
          </div>

          <div id="participantInfo" style="display: none; background: #f9f9f9; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
              <span>初始: <strong id="infoInitial"></strong>kg</span>
              <span>目标: <strong id="infoTarget"></strong>kg</span>
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

          <div id="weightChange" style="display: none; text-align: center; padding: 10px; background: #f0f8f0; border-radius: 8px; margin-bottom: 16px;">
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
                <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
                  <div style="font-weight: 600; margin-bottom: 8px;">${p.name}</div>
                  <div style="color: #999; font-size: 14px;">暂无记录</div>
                </div>
              `;
            }

            const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
            const minWeight = Math.min(...sorted.map(r => r.weight), p.initialWeight) - 1;
            const maxWeight = Math.max(...sorted.map(r => r.weight), p.initialWeight) + 1;
            const range = maxWeight - minWeight || 1;

            return `
              <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
                <div style="font-weight: 600; margin-bottom: 8px;">${p.name}: ${p.initialWeight}kg → ${p.currentWeight}kg</div>
                <div style="display: flex; align-items: flex-end; height: 100px; gap: 4px; padding: 10px 0;">
                  ${sorted.map((r, i) => {
                    const height = ((r.weight - minWeight) / range) * 80 + 10;
                    const isTarget = Math.abs(r.weight - p.targetWeight) < 0.1;
                    return `
                      <div style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 100%; height: ${height}px; background: ${isTarget ? '#52c41a' : '#07c160'}; border-radius: 2px; min-width: 8px;"></div>
                        <div style="font-size: 10px; color: #999; margin-top: 4px;">${r.date.slice(5)}</div>
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
          <div class="card-title" style="margin-bottom: 12px;">导出比赛数据</div>
          <p style="font-size: 14px; color: #666; margin-bottom: 12px;">
            复制以下文本，发送给朋友即可导入此比赛。
          </p>
          <textarea class="textarea-export" id="exportData" readonly>${jsonData}</textarea>
          <button class="btn btn-primary btn-block" style="margin-top: 12px;" onclick="App.copyExportData()">
            复制数据
          </button>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom: 12px;">导入比赛数据</div>
          <p style="font-size: 14px; color: #666; margin-bottom: 12px;">
            粘贴朋友发来的比赛数据，点击导入。
          </p>
          <textarea class="textarea-export" id="importData" placeholder="粘贴比赛数据JSON在这里..."></textarea>
          <button class="btn btn-primary btn-block" style="margin-top: 12px;" onclick="App.submitImport()">
            导入数据
          </button>
        </div>

        <div class="card" style="background: #fff7e6;">
          <div style="font-size: 14px; color: #666;">
            <strong>提示：</strong><br>
            • 导出的数据可以通过微信、邮件等方式分享<br>
            • 导入同一比赛会覆盖本地数据<br>
            • 所有数据存储在本地浏览器中
          </div>
        </div>
      </div>
    `;
  },

  copyExportData() {
    const textarea = document.getElementById('exportData');
    textarea.select();
    document.execCommand('copy');
    this.toast('已复制到剪贴板');
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
      <div style="font-size: 14px; color: #666;">${e.message}</div>
    </div>
  `;
}
