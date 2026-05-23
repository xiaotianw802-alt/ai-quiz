App({
  globalData: {
    quizBankId: '',
  },

  onLaunch() {
    // 从本地存储读服务器地址，没有就用默认
    const saved = wx.getStorageSync('server_url');
    if (saved) {
      this.globalData.baseURL = saved;
    } else {
      this.globalData.baseURL = 'http://10.238.172.181:3000';
    }

    // 注册一个全局切换方法
    const app = this;
    this.setServerURL = function(url) {
      app.globalData.baseURL = url;
      wx.setStorageSync('server_url', url);
    };

    console.log('AI刷题启动, baseURL:', this.globalData.baseURL);
  },
});