// 计算工具函数（复制自小程序版本）
const Calculator = {
  // 计算奖金池
  calculateFund(competition) {
    const participants = competition.participants || [];
    const totalFund = participants.reduce((sum, p) => sum + (p.investment || 0), 0);

    return {
      totalFund,
      totalFundText: '¥' + totalFund.toFixed(2),
      participantCount: participants.length,
      averageFund: participants.length > 0 ? totalFund / participants.length : 0
    };
  },

  // 计算排名
  calculateRanking(competition) {
    const participants = competition.participants || [];
    if (participants.length === 0) return [];

    return participants.map(p => {
      const initial = p.initialWeight;
      const current = p.currentWeight;
      const target = p.targetWeight;

      const isWeightLoss = target < initial;
      const totalChange = Math.abs(initial - target);
      const currentChange = Math.abs(initial - current);
      const progress = totalChange > 0 ? (currentChange / totalChange) * 100 : 0;

      // 是否达标
      const isCompleted = isWeightLoss
        ? current <= target
        : current >= target;

      return {
        ...p,
        isWeightLoss,
        progress: Math.min(100, progress),
        isCompleted,
        weightChange: (initial - current).toFixed(1)
      };
    }).sort((a, b) => {
      // 先按达标状态排，再按进度排
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? -1 : 1;
      }
      return b.progress - a.progress;
    });
  },

  // 计算收益分配
  calculateRewards(competition) {
    const fund = this.calculateFund(competition);
    const ranking = this.calculateRanking(competition);

    if (ranking.length === 0) return [];

    const totalFund = fund.totalFund;
    const completed = ranking.filter(r => r.isCompleted);
    const uncompleted = ranking.filter(r => !r.isCompleted);

    let rewards = [];

    if (completed.length === 0) {
      // 无人达标，本金退回
      rewards = ranking.map(r => ({
        ...r,
        reward: r.investment,
        profit: 0
      }));
    } else if (uncompleted.length === 0) {
      // 全部达标，本金退回
      rewards = ranking.map(r => ({
        ...r,
        reward: r.investment,
        profit: 0
      }));
    } else {
      // 有达标的也有未达标的
      const failFund = uncompleted.reduce((sum, r) => sum + r.investment, 0);
      const successCount = completed.length;
      const rewardPerPerson = failFund / successCount;

      rewards = ranking.map(r => {
        if (r.isCompleted) {
          return {
            ...r,
            reward: r.investment + rewardPerPerson,
            profit: rewardPerPerson
          };
        } else {
          return {
            ...r,
            reward: 0,
            profit: -r.investment
          };
        }
      });
    }

    return rewards;
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 计算剩余天数
  getRemainingDays(endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  },

  // 计算比赛进度百分比
  getProgressPercent(startDate, endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (now <= start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  }
};
