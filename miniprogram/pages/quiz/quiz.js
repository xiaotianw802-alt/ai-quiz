const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    bankId: '', questions: [], currentIndex: 0, currentQuestion: null, currentOptions: [],
    userAnswer: '', questionState: 'answering', feedback: null,
    correctCount: 0, totalCount: 0, showResult: false, quizResult: null,
    loading: true, typeTag: '', quizCount: 30, quizCountText: '30 题',
  },

  onShow() {
    const bankId = app.globalData.quizBankId || '';
    if (bankId !== this.data.bankId || this.data.questions.length === 0) {
      this.setData({ bankId: bankId });
      this.loadQuestions();
    }
  },

  onPickCount() {
    const that = this;
    wx.showActionSheet({
      itemList: ['10 题', '30 题', '50 题', '100 题', '全部'],
      success(res) {
        const counts = [10, 30, 50, 100, 999];
        const texts = ['10 题', '30 题', '50 题', '100 题', '全部'];
        that.setData({ quizCount: counts[res.tapIndex], quizCountText: texts[res.tapIndex] });
        that.loadQuestions();
      },
    });
  },

  async loadQuestions() {
    this.setData({ loading: true });
    try {
      const questions = await api.startQuiz(this.data.bankId, this.data.quizCount);
      if (!questions || questions.length === 0) {
        wx.showToast({ title: '题库为空', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      this.setData({ questions, currentIndex: 0, questionState: 'answering', userAnswer: '', feedback: null, correctCount: 0, totalCount: 0, showResult: false, loading: false });
      this._updateCurrent();
    } catch (e) { wx.showToast({ title: '加载失败', icon: 'none' }); this.setData({ loading: false }); }
  },

  _updateCurrent() {
    const q = this.data.questions[this.data.currentIndex];
    if (!q) { this.setData({ currentQuestion: null, currentOptions: [] }); return; }
    const options = q.options ? q.options.split(/\r?\n/).filter(function(o) { return o.trim(); }) : [];
    const that = this;
    const optsWithState = options.map(function(opt) {
      const val = opt.slice(0, 1);
      var sel = q.type === 'multi' ? (that.data.userAnswer || '').includes(val) : that.data.userAnswer === val;
      return { text: opt, val: val, selected: sel };
    });
    const typeNames = { single: '单选', multi: '多选', judge: '判断', fill: '填空', essay: '简答' };
    this.setData({ currentQuestion: q, currentOptions: optsWithState, typeTag: typeNames[q.type] || q.type });
  },

  selectAnswer(e) {
    if (this.data.questionState !== 'answering') return;
    const q = this.data.currentQuestion;
    if (!q) return;
    const val = e.currentTarget.dataset.val;
    if (q.type === 'multi') {
      var cur = this.data.userAnswer || '';
      if (cur.includes(val)) cur = cur.replace(val, ''); else cur += val;
      this.setData({ userAnswer: cur.split('').sort().join('') });
    } else {
      this.setData({ userAnswer: val });
    }
    this._updateCurrent();
  },

  onTextInput(e) {
    if (this.data.questionState !== 'answering') return;
    this.setData({ userAnswer: e.detail.value });
  },

  async confirmAnswer() {
    const q = this.data.currentQuestion;
    if (!q) return;
    const ans = this.data.userAnswer;
    // 有选项时必须选 → 没选项时（填空/简答）允许空
    if (!ans && this.data.currentOptions.length > 0) {
      wx.showToast({ title: '请先选择答案', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '判断中...' });
    try {
      const r = await api.checkAnswer(q.id, ans || '');
      this.setData({
        questionState: 'confirmed',
        feedback: { isCorrect: r.is_correct, myAnswer: ans, correctAnswer: r.answer, analysis: r.analysis },
        correctCount: this.data.correctCount + (r.is_correct ? 1 : 0),
        totalCount: this.data.totalCount + 1,
      });
    } catch (e) { wx.showToast({ title: '判断失败', icon: 'none' }); }
    wx.hideLoading();
  },

  goPrev() {
    if (this.data.currentIndex <= 0) return;
    this.setData({ currentIndex: this.data.currentIndex - 1, questionState: 'answering', userAnswer: '', feedback: null });
    this._updateCurrent();
  },

  goNext() {
    if (this.data.currentIndex >= this.data.questions.length - 1) {
      this.setData({
        showResult: true,
        quizResult: { correct: this.data.correctCount, total: this.data.totalCount, score: this.data.totalCount > 0 ? Math.round(this.data.correctCount / this.data.totalCount * 100) : 0 },
      });
      return;
    }
    this.setData({ currentIndex: this.data.currentIndex + 1, questionState: 'answering', userAnswer: '', feedback: null });
    this._updateCurrent();
  },

  retry() { this.setData({ showResult: false }); this.loadQuestions(); },
});