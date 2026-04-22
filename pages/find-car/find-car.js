const { getActiveRecord, getHistoryRecords, saveActiveRecord } = require('../../utils/storage');
const {
  getCurrentLocation,
  openMapNavigation,
  calculateDistance,
  formatDistance
} = require('../../utils/location');
const { previewImages } = require('../../utils/media');

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
  if (!record) {
    return null;
  }

  return Object.assign({
    mallName: '',
    garageName: '',
    entranceNote: '',
    pillarCode: '',
    licensePlate: '',
    parkingCode: '',
    elevatorNote: '',
    remark: '',
    photos: []
  }, record);
}

function buildPhotoSections(photos) {
  const groups = {
    car: { title: '车位照片', photos: [] },
    entrance: { title: '入口照片', photos: [] },
    pillar: { title: '柱号照片', photos: [] }
  };

  photos.forEach((photo) => {
    if (groups[photo.type]) {
      groups[photo.type].photos.push(photo);
    }
  });

  return Object.values(groups).filter((group) => group.photos.length);
}

function buildGuideSteps(record) {
  const steps = [];

  if (record.entranceNote) {
    steps.push({
      title: '先回忆入口',
      desc: `从 ${record.entranceNote} 附近进入更容易找回原路线`
    });
  }

  if (record.elevator || record.elevatorNote) {
    steps.push({
      title: '优先找电梯',
      desc: record.elevatorNote || '先到你停车时记下的电梯位置'
    });
  }

  if (record.pillarCode || record.parkingCode) {
    steps.push({
      title: '对照柱号和车位',
      desc: [record.pillarCode, record.parkingCode].filter(Boolean).join(' / ')
    });
  }

  if (record.remark) {
    steps.push({
      title: '最后核对备注',
      desc: record.remark
    });
  }

  if (!steps.length) {
    steps.push({
      title: '直接导航去车位',
      desc: '当前记录里没有更多室内锚点，建议直接打开地图导航。'
    });
  }

  return steps;
}

Page({
  data: {
    record: null,
    distanceText: '',
    photoSections: [],
    guideSteps: [],
    loading: true
  },

  onLoad(options) {
    this.recordId = options.id || '';
  },

  onShow() {
    this.loadRecord();
  },

  async loadRecord() {
    const sourceRecord = this.recordId
      ? getHistoryRecords().find((item) => item.id === this.recordId)
      : getActiveRecord();

    const record = normalizeRecord(sourceRecord);
    if (!record) {
      this.setData({
        record: null,
        loading: false
      });
      return;
    }

    const nextRecord = Object.assign({}, record, {
      timeText: formatTimestamp(record.timestamp)
    });

    this.setData({
      record: nextRecord,
      photoSections: buildPhotoSections(nextRecord.photos || []),
      guideSteps: buildGuideSteps(nextRecord),
      loading: false
    });

    try {
      const currentLocation = await getCurrentLocation();
      const distance = calculateDistance(currentLocation, nextRecord.parking);
      this.setData({
        distanceText: distance !== null ? formatDistance(distance) : ''
      });
    } catch (error) {
      this.setData({
        distanceText: ''
      });
    }
  },

  previewSectionPhoto(event) {
    const current = event.currentTarget.dataset.path;
    const record = this.data.record;
    if (!record) {
      return;
    }

    previewImages((record.photos || []).map((item) => item.filePath).filter(Boolean), current);
  },

  navigateToParking() {
    const { record } = this.data;
    if (!record) {
      return;
    }

    openMapNavigation({
      latitude: record.parking.latitude,
      longitude: record.parking.longitude,
      name: '停车位置',
      address: `${record.floor} ${record.parkingCode || ''} ${record.remark || ''}`.trim()
    }).catch(() => {
      wx.showToast({ title: '打开导航失败', icon: 'none' });
    });
  },

  navigateToElevator() {
    const { record } = this.data;
    if (!record || !record.elevator) {
      wx.showToast({
        title: '没有保存电梯位置',
        icon: 'none'
      });
      return;
    }

    openMapNavigation({
      latitude: record.elevator.latitude,
      longitude: record.elevator.longitude,
      name: '电梯位置',
      address: record.elevatorNote || '已保存的电梯位置'
    }).catch(() => {
      wx.showToast({ title: '打开导航失败', icon: 'none' });
    });
  },

  useAsCurrent() {
    const { record } = this.data;
    if (!record) {
      return;
    }

    saveActiveRecord(record);
    wx.showToast({
      title: '已设为当前车位',
      icon: 'success'
    });
  }
});
