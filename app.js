App({
  globalData: {
    appName: '停车找车助手',
    cloudAvailable: false,
    plateSearchEnabled: false
  },

  onLaunch() {
    if (!wx.cloud) {
      return;
    }

    try {
      wx.cloud.init({
        traceUser: true
      });
      this.globalData.cloudAvailable = true;
    } catch (error) {
      this.globalData.cloudAvailable = false;
    }
  }
});
