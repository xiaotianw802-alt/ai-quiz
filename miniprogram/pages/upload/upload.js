const app = getApp();

Page({
  data: { banks: [], bankName: '', uploading: false, uploadResult: null, uploadError: '' },

  onShow() { this.loadBanks(); },

  async loadBanks() {
    try { const api = require('../../utils/api'); const banks = await api.getBanks(); this.setData({ banks }); } catch (e) {}
  },

  onBankNameInput(e) { this.setData({ bankName: e.detail.value }); },

  chooseFile(e) {
    const type = e.currentTarget.dataset.type;
    const that = this;
    var extensions = [];
    if (type === 'pdf') extensions = ['pdf'];
    else if (type === 'html') extensions = ['html', 'htm'];
    else if (type === 'word') extensions = ['docx', 'doc'];

    wx.chooseMessageFile({
      count: 1, type: 'file', extension: extensions,
      success(res) { that._doUpload(res.tempFiles[0].path, type); },
      fail() { wx.showToast({ title: '请使用真机选择文件', icon: 'none' }); },
    });
  },

  _doUpload(filePath, fileType) {
    const that = this;
    this.setData({ uploading: true, uploadResult: null, uploadError: '' });
    const bankName = this.data.bankName.trim() || '题库';
    const endpoints = { pdf: '/api/upload/pdf', html: '/api/upload/html', word: '/api/upload/word' };

    wx.uploadFile({
      url: app.globalData.baseURL + (endpoints[fileType] || '/api/upload/pdf'),
      filePath: filePath, name: 'file', formData: { bank_name: bankName },
      success(res) {
        try {
          const data = JSON.parse(res.data);
          if (data.ok) { that.setData({ uploading: false, uploadResult: data.data, bankName: '' }); that.loadBanks(); }
          else { that.setData({ uploading: false, uploadError: data.error || '失败' }); }
        } catch (e) { that.setData({ uploading: false, uploadError: '响应异常' }); }
      },
      fail(err) { that.setData({ uploading: false, uploadError: err.errMsg || '网络错误' }); },
    });
  },
});