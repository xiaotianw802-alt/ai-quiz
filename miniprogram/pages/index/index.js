const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    banks: [],
    stats: { total_q: 0, wrong_q: 0 },
    correctRate: 0,
    loading: true,
    connected: true,
    serverUrl: '',
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.baseURL });
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const [banks, stats] = await Promise.all([api.getBanks(), api.getStats()]);
      const total = stats.total_q || 0;
      const wrong = stats.wrong_q || 0;
      const correctRate = total > 0 ? Math.round((total - wrong) / total * 100) : 0;
      this.setData({ banks, stats, correctRate, loading: false, connected: true });
    } catch (e) {
      this.setData({ loading: false, connected: false });
    }
  },

  // 长按标题切换服务器地址
  onChangeServer() {
    const that = this;
    wx.showActionSheet({
      itemList: ['手动输入地址', '恢复默认(10.238.172.181:3000)', '取消'],
      success(res) {
        if (res.tapIndex === 0) {
          // 手动输入
          wx.showModal({
            title: '服务器地址',
            editable: true,
            placeholderText: 'http://10.238.172.181:3000',
            content: app.globalData.baseURL,
            success(mr) {
              if (mr.confirm && mr.content) {
                app.setServerURL(mr.content.trim());
                that.setData({ serverUrl: mr.content.trim() });
                wx.showToast({ title: '已切换，重新加载中...', icon: 'none' });
                setTimeout(() => that.loadData(), 500);
              }
            },
          });
        } else if (res.tapIndex === 1) {
          app.setServerURL('http://10.238.172.181:3000');
          that.setData({ serverUrl: 'http://10.238.172.181:3000' });
          wx.showToast({ title: '已恢复默认', icon: 'none' });
          setTimeout(() => that.loadData(), 500);
        }
      },
    });
  },

  goQuiz(e) {
    const bankId = e.currentTarget.dataset.bankId || '';
    app.globalData.quizBankId = bankId;
    wx.switchTab({ url: '/pages/quiz/quiz' });
  },

  goWrong(e) {
    const bankId = e.currentTarget.dataset.bankId || '';
    wx.navigateTo({ url: '/pages/review/review?bank_id=' + bankId });
  },

  goUpload() {
    wx.switchTab({ url: '/pages/upload/upload' });
  },
});