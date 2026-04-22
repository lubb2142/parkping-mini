function chooseImages(count) {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => resolve(res.tempFilePaths || []),
      fail: reject
    });
  });
}

function saveFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    wx.saveFile({
      tempFilePath,
      success: (res) => resolve(res.savedFilePath),
      fail: reject
    });
  });
}

function previewImages(urls, current) {
  wx.previewImage({
    urls,
    current
  });
}

module.exports = {
  chooseImages,
  saveFile,
  previewImages
};
