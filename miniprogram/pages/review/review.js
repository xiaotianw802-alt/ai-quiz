const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    // 模式: 'select' 选择题库 | 'review' 浏览错题
    mode: 'select',
    banks: [],
    // 错题浏览
    bankId: '',
    questions: [],
    currentIndex: 0,
    currentQuestion: null,
    currentOptions: [],
    showAnswer: false,
    loading: true,
  },

  onLoad(opts) {
    // 如果有bank_id → 直接进错题
    if (opts.bank_id) {
      this.setData({ bankId: opts.bank_id, mode: 'review' });
      this.loadWrongQuestions();
    } else {
      this.setData({ mode: 'select' });
      this.loadBanks();
    }
  },

  onShow() {
    // 从tab切过来时，刷新题库列表
    if (this.data.mode === 'select') {
      this.loadBanks();
    }
  },

  async loadBanks() {
    this.setData({ loading: true });
    try {
      const banks = await api.getBanks();
      // 只显示有错题的题库
      const banksWithWrong = banks.filter(b => b.wrong_count > 0);
      this.setData({ banks: banksWithWrong, loading: false });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  selectBank(e) {
    const bankId = e.currentTarget.dataset.bankId;
    this.setData({ bankId: bankId, mode: 'review' });
    this.loadWrongQuestions();
  },

  async loadWrongQuestions() {
    this.setData({ loading: true });
    try {
      const questions = await api.getWrongQuestions(this.data.bankId, 30);
      if (!questions || questions.length === 0) {
        this.setData({ mode: 'select', loading: false });
        this.loadBanks();
        return;
      }
      this.setData({ questions, currentIndex: 0, showAnswer: false, loading: false });
      this._updateCurrent();
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  backToBanks() {
    this.setData({ mode: 'select' });
    this.loadBanks();
  },

  _updateCurrent() {
    const q = this.data.questions[this.data.currentIndex];
    if (!q) { this.setData({ currentQuestion: null, currentOptions: [] }); return; }
    const options = q.options ? q.options.split(/\r?\n/).filter(o => o.trim()).map(o => ({ text: o })) : [];
    this.setData({ currentQuestion: q, currentOptions: options });
  },

  showAnswer() { this.setData({ showAnswer: !this.data.showAnswer }); },

  prev() {
    if (this.data.currentIndex > 0) {
      this.setData({ currentIndex: this.data.currentIndex - 1, showAnswer: false });
      this._updateCurrent();
    }
  },

  next() {
    if (this.data.currentIndex < this.data.questions.length - 1) {
      this.setData({ currentIndex: this.data.currentIndex + 1, showAnswer: false });
      this._updateCurrent();
    }
  },
});