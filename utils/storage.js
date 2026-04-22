const ACTIVE_KEY = 'parking-active-record';
const HISTORY_KEY = 'parking-history-records';

function getPhotoPaths(record) {
  return (record && record.photos ? record.photos : [])
    .map((item) => item && item.filePath)
    .filter(Boolean);
}

function removeSavedPhoto(filePath) {
  return new Promise((resolve) => {
    wx.removeSavedFile({
      filePath,
      complete: resolve
    });
  });
}

function cleanupRecordAssets(record) {
  const photoPaths = getPhotoPaths(record);
  return Promise.all(photoPaths.map(removeSavedPhoto));
}

function getActiveRecord() {
  return wx.getStorageSync(ACTIVE_KEY) || null;
}

function setActiveRecord(record) {
  wx.setStorageSync(ACTIVE_KEY, record);
}

function saveActiveRecord(record) {
  setActiveRecord(record);
  const history = getHistoryRecords();
  const nextHistory = [record].concat(history.filter((item) => item.id !== record.id)).slice(0, 20);
  wx.setStorageSync(HISTORY_KEY, nextHistory);
}

function clearActiveRecord() {
  wx.removeStorageSync(ACTIVE_KEY);
}

function getHistoryRecords() {
  return wx.getStorageSync(HISTORY_KEY) || [];
}

function setHistoryRecords(records) {
  wx.setStorageSync(HISTORY_KEY, records);
}

function replaceCachedRecords(records) {
  setHistoryRecords(records);

  const active = getActiveRecord();
  if (!active) {
    return;
  }

  const nextActive = records.find((item) => item.id === active.id);
  if (nextActive) {
    setActiveRecord(nextActive);
    return;
  }

  clearActiveRecord();
}

function removeHistoryRecord(id) {
  const target = getHistoryRecords().find((item) => item.id === id);
  const history = getHistoryRecords().filter((item) => item.id !== id);
  setHistoryRecords(history);

  const active = getActiveRecord();
  if (active && active.id === id) {
    clearActiveRecord();
  }

  if (target) {
    cleanupRecordAssets(target);
  }
}

module.exports = {
  getActiveRecord,
  setActiveRecord,
  saveActiveRecord,
  clearActiveRecord,
  getHistoryRecords,
  setHistoryRecords,
  replaceCachedRecords,
  removeHistoryRecord
};
