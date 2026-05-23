const app = getApp();

function request(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.baseURL + path,
      method: method || "GET",
      data: data || {},
      header: { "Content-Type": "application/json" },
      success: (res) => {
        if (res.data && res.data.ok) { resolve(res.data.data); }
        else { reject(new Error(res.data.error || "请求失败")); }
      },
      fail: reject,
    });
  });
}

module.exports = {
  getBanks: () => request("/api/questions/banks"),
  getQuestions: (bankId, limit) => request("/api/questions/list?bank_id=" + (bankId||"") + "&limit=" + (limit||30)),
  getWrongQuestions: (bankId, limit) => request("/api/questions/wrong?bank_id=" + (bankId||"") + "&limit=" + (limit||30)),
  checkAnswer: (questionId, userAnswer) => request("/api/questions/check", "POST", { question_id: questionId, user_answer: userAnswer }),
  getStats: () => request("/api/questions/stats"),
  startQuiz: (bankId, count) => request("/api/quiz/start?bank_id=" + (bankId||"") + "&count=" + (count||10)),
  submitQuiz: (answers) => request("/api/quiz/submit", "POST", { answers }),
  explainQuestion: (questionId) => request("/api/quiz/explain", "POST", { question_id: questionId }),
};