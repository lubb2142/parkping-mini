const {
  getHistoryRecords,
  removeHistoryRecord,
  saveActiveRecord,
  replaceCachedRecords
} = require('../../utils/storage');
const { openMapNavigation } = require('../../utils/location');
const { fetchRecords, isCloudReady, removeRecord: removeCloudRecord } = require('../../utils/cloud');

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function normalizeRecord(record) {
  return Object.assign({
    mallName: '',
    garageName: '',
    entranceNote: '',
    pillarCode: '',
    licensePlate: '',
    photos: []
  }, record);
}

Page({
  data: {
    records: []
  },

  onShow() {
    this.refreshRecords();
    this.syncFromCloud();
  },

  refreshRecords() {
    const records = getHistoryRecords().map((item) => {
      const normalized = normalizeRecord(item);
      return Object.assign({}, normalized, {
        timeText: formatTimestamp(normalized.timestamp),
        summaryTitle: normalized.mallName || normalized.garageName || '未命名停车点',
        photoCountText: `${normalized.photos.length} 张`
      });
    });

    this.setData({ records });
  },

  async syncFromCloud() {
    if (!isCloudReady()) {
      return;
    }

    try {
      const records = await fetchRecords();
      replaceCachedRecords(records);
      this.refreshRecords();
    } catch (error) {
      wx.showToast({
        title: '云端刷新失败',
        icon: 'none'
      });
    }
  },

  getRecordById(id) {
    return this.data.records.find((item) => item.id === id);
  },

  reuseRecord(event) {
    const { id } = event.currentTarget.dataset;
    const record = this.getRecordById(id);
    if (!record) {
      return;
    }

    saveActiveRecord(record);
    wx.showToast({
      title: '已设为当前车位',
      icon: 'success'
    });
  },

  goParking(event) {
    const { id } = event.currentTarget.dataset;
    const record = this.getRecordById(id);
    if (!record) {
      return;
    }

    openMapNavigation({
      latitude: record.parking.latitude,
      longitude: record.parking.longitude,
      name: '停车位置',
      address: `${record.floor} ${record.parkingCode || ''}`.trim()
    }).catch(() => {
      wx.showToast({ title: '打开导航失败', icon: 'none' });
    });
  },

  goFindCar(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/find-car/find-car?id=${id}`
    });
  },

  removeRecord(event) {
    const { id } = event.currentTarget.dataset;
    wx.showModal({
      title: '删除记录',
      content: '删除后不可恢复。',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        const record = this.getRecordById(id);
        if (record && isCloudReady()) {
          try {
            await removeCloudRecord(record);
          } catch (error) {
            wx.showToast({
              title: '云端删除失败',
              icon: 'none'
            });
            return;
          }
        }

        removeHistoryRecord(id);
        const records = this.data.records.filter((item) => item.id !== id);
        this.setData({ records });
      }
    });
  }
});
