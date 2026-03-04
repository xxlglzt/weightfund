// 本地存储管理（替代云开发）
const Storage = {
  DB_KEY: 'weight_challenge_data',

  // 初始化数据库
  init() {
    if (!localStorage.getItem(this.DB_KEY)) {
      localStorage.setItem(this.DB_KEY, JSON.stringify({
        competitions: [],
        version: '1.0'
      }));
    }
  },

  // 获取所有数据
  getAll() {
    this.init();
    return JSON.parse(localStorage.getItem(this.DB_KEY));
  },

  // 保存所有数据
  saveAll(data) {
    localStorage.setItem(this.DB_KEY, JSON.stringify(data));
  },

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ========== 比赛相关 ==========

  // 创建比赛
  createCompetition(data) {
    const db = this.getAll();
    const competition = {
      _id: this.generateId(),
      ...data,
      creatorId: 'local_user',
      participants: [],
      weightRecords: {},
      createTime: new Date().toISOString(),
      status: 'registering'
    };
    db.competitions.push(competition);
    this.saveAll(db);
    return competition;
  },

  // 获取比赛列表
  getCompetitions() {
    return this.getAll().competitions;
  },

  // 获取单个比赛
  getCompetition(id) {
    return this.getCompetitions().find(c => c._id === id);
  },

  // 更新比赛
  updateCompetition(id, updates) {
    const db = this.getAll();
    const index = db.competitions.findIndex(c => c._id === id);
    if (index === -1) return null;
    db.competitions[index] = { ...db.competitions[index], ...updates };
    this.saveAll(db);
    return db.competitions[index];
  },

  // 删除比赛
  deleteCompetition(id) {
    const db = this.getAll();
    db.competitions = db.competitions.filter(c => c._id !== id);
    this.saveAll(db);
    return true;
  },

  // ========== 参与者相关 ==========

  // 添加参与者
  addParticipant(competitionId, participant) {
    const db = this.getAll();
    const comp = db.competitions.find(c => c._id === competitionId);
    if (!comp) return null;

    const newParticipant = {
      id: 'p_' + Date.now(),
      ...participant,
      currentWeight: participant.initialWeight,
      joinTime: new Date().toISOString()
    };

    comp.participants.push(newParticipant);
    this.saveAll(db);
    return newParticipant;
  },

  // 删除参与者
  deleteParticipant(competitionId, participantId) {
    const db = this.getAll();
    const comp = db.competitions.find(c => c._id === competitionId);
    if (!comp) return null;

    comp.participants = comp.participants.filter(p => p.id !== participantId);
    // 同时删除相关记录
    if (comp.weightRecords) {
      delete comp.weightRecords[participantId];
    }
    this.saveAll(db);
    return true;
  },

  // ========== 体重记录相关 ==========

  // 记录体重
  recordWeight(competitionId, participantId, weight, date) {
    const db = this.getAll();
    const comp = db.competitions.find(c => c._id === competitionId);
    if (!comp) return null;

    const participant = comp.participants.find(p => p.id === participantId);
    if (!participant) return null;

    // 初始化记录数组
    if (!comp.weightRecords) comp.weightRecords = {};
    if (!comp.weightRecords[participantId]) {
      comp.weightRecords[participantId] = [];
    }

    // 检查是否已有同日期记录，有则更新
    const existingIndex = comp.weightRecords[participantId].findIndex(
      r => r.date === date
    );

    const record = {
      weight: parseFloat(weight),
      date: date,
      recordTime: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      comp.weightRecords[participantId][existingIndex] = record;
    } else {
      comp.weightRecords[participantId].push(record);
    }

    // 更新当前体重
    participant.currentWeight = parseFloat(weight);

    this.saveAll(db);
    return record;
  },

  // ========== 数据导入导出 ==========

  // 导出比赛数据为 JSON
  exportCompetition(competitionId) {
    const comp = this.getCompetition(competitionId);
    if (!comp) return null;
    return JSON.stringify(comp, null, 2);
  },

  // 导出所有数据
  exportAll() {
    return JSON.stringify(this.getAll(), null, 2);
  },

  // 导入比赛数据
  importCompetition(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data._id || !data.name) {
        return { success: false, msg: '无效的比赛数据' };
      }

      const db = this.getAll();
      // 检查是否已存在
      const existing = db.competitions.find(c => c._id === data._id);
      if (existing) {
        // 更新现有比赛
        const index = db.competitions.findIndex(c => c._id === data._id);
        db.competitions[index] = { ...data, _id: data._id };
      } else {
        // 添加为新比赛
        db.competitions.push(data);
      }
      this.saveAll(db);
      return { success: true, data };
    } catch (e) {
      return { success: false, msg: '解析失败：' + e.message };
    }
  },

  // 清空所有数据
  clearAll() {
    localStorage.removeItem(this.DB_KEY);
    this.init();
  }
};

// 浏览器环境才初始化
if (typeof window !== 'undefined' && window.localStorage) {
  Storage.init();
}
