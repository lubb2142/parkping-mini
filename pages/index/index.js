const {
  getActiveRecord,
  saveActiveRecord,
  replaceCachedRecords,
  clearActiveRecord: clearStoredActiveRecord
} = require('../../utils/storage');
const {
  getCurrentLocation,
  openMapNavigation,
  calculateDistance,
  formatDistance
} = require('../../utils/location');
const { chooseImages, saveFile, previewImages } = require('../../utils/media');
const { isCloudReady, upsertRecord, fetchRecords } = require('../../utils/cloud');

const floorOptions = ['地面', 'B1', 'B2', 'B3', 'B4', 'B5', '其他'];
const photoTypeOptions = [
  { value: 'car', label: '车位照片' },
  { value: 'entrance', label: '入口照片' },
  { value: 'pillar', label: '柱号/标识' }
];

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
    photos: []
  }, record);
}

function buildRecordView(record, currentLocation) {
  const normalized = normalizeRecord(record);
  if (!normalized) {
    return null;
  }

  const distance = calculateDistance(currentLocation, normalized.parking);
  return Object.assign({}, normalized, {
    timeText: formatTimestamp(normalized.timestamp),
    distanceText: distance !== null ? formatDistance(distance) : '',
    photoCountText: `${normalized.photos.length} 张`,
    summaryTitle: normalized.mallName || normalized.garageName || '未命名停车点'
  });
}

Page({
  data: {
    floorOptions,
    photoTypeOptions,
    floorIndex: 0,
    mallName: '',
    garageName: '',
    entranceNote: '',
    pillarCode: '',
    licensePlate: '',
    parkingCode: '',
    elevatorNote: '',
    remark: '',
    draftPhotos: [],
    draftMode: 'parking',
    mapLatitude: 31.2304,
    mapLongitude: 121.4737,
    currentLocation: null,
    draftParking: null,
    draftElevator: null,
    markers: [],
    activeRecord: null,
    distanceText: '',
    locationStatusText: '未定位',
    draftModeText: '点地图设置车位',
    cloudStatusText: '仅本机保存',
    cloudSyncing: false
  },

  onLoad() {
    this.loadActiveRecord();
    this.refreshLocation();
    this.syncFromCloud();
  },

  onShow() {
    this.loadActiveRecord();
  },

  loadActiveRecord() {
    const record = getActiveRecord();
    if (!record) {
      this.setData({
        activeRecord: null,
        distanceText: ''
      });
      this.updateMarkers();
      return;
    }

    const activeRecord = buildRecordView(record, this.data.currentLocation);
    this.setData({
      activeRecord,
      distanceText: activeRecord.distanceText
    });
    this.updateMarkers();
  },

  async syncFromCloud() {
    if (!isCloudReady()) {
      this.setData({
        cloudStatusText: '仅本机保存'
      });
      return;
    }

    this.setData({
      cloudSyncing: true,
      cloudStatusText: '云端同步中'
    });

    try {
      const records = await fetchRecords();
      replaceCachedRecords(records);
      this.loadActiveRecord();
      this.setData({
        cloudStatusText: records.length ? '已与云端同步' : '云端已启用'
      });
    } catch (error) {
      this.setData({
        cloudStatusText: '云同步失败，已回退本机'
      });
    } finally {
      this.setData({
        cloudSyncing: false
      });
    }
  },

  refreshLocation() {
    wx.showLoading({ title: '定位中' });

    getCurrentLocation()
      .then((res) => {
        const currentLocation = {
          latitude: Number(res.latitude.toFixed(6)),
          longitude: Number(res.longitude.toFixed(6))
        };

        const activeRecord = this.data.activeRecord;
        const distance = activeRecord ? calculateDistance(currentLocation, activeRecord.parking) : null;

        this.setData({
          currentLocation,
          mapLatitude: currentLocation.latitude,
          mapLongitude: currentLocation.longitude,
          locationStatusText: '定位成功',
          distanceText: activeRecord ? formatDistance(distance) : ''
        });

        this.updateMarkers();
      })
      .catch(() => {
        this.setData({
          locationStatusText: '定位失败'
        });
        wx.showToast({
          title: '请允许定位权限',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  },

  setDraftMode(event) {
    const draftMode = event.currentTarget.dataset.mode;
    this.setData({
      draftMode,
      draftModeText: draftMode === 'parking' ? '点地图设置车位' : '点地图设置电梯'
    });
  },

  handleMapTap(event) {
    const { latitude, longitude } = event.detail || {};
    if (latitude === undefined || longitude === undefined) {
      return;
    }

    const point = {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6))
    };

    if (this.data.draftMode === 'parking') {
      this.setData({
        draftParking: point
      });
      wx.showToast({ title: '车位已更新', icon: 'success' });
    } else {
      this.setData({
        draftElevator: point
      });
      wx.showToast({ title: '电梯位置已更新', icon: 'success' });
    }

    this.updateMarkers();
  },

  updateMarkers() {
    const markers = [];
    const { draftParking, draftElevator, activeRecord } = this.data;

    const parkingPoint = draftParking || (activeRecord && activeRecord.parking);
    const elevatorPoint = draftElevator || (activeRecord && activeRecord.elevator);

    if (parkingPoint) {
      markers.push({
        id: 1,
        latitude: parkingPoint.latitude,
        longitude: parkingPoint.longitude,
        width: 28,
        height: 36,
        callout: {
          content: '我的车',
          display: 'ALWAYS',
          padding: 8,
          borderRadius: 12
        }
      });
    }

    if (elevatorPoint) {
      markers.push({
        id: 2,
        latitude: elevatorPoint.latitude,
        longitude: elevatorPoint.longitude,
        width: 28,
        height: 36,
        callout: {
          content: '电梯',
          display: 'ALWAYS',
          padding: 8,
          borderRadius: 12,
          bgColor: '#dbeafe',
          color: '#1d4ed8'
        }
      });
    }

    this.setData({ markers });
  },

  useCurrentForParking() {
    if (!this.data.currentLocation) {
      this.refreshLocation();
      return;
    }

    this.setData({
      draftParking: Object.assign({}, this.data.currentLocation)
    });
    this.updateMarkers();
    wx.showToast({ title: '已设为车位', icon: 'success' });
  },

  useCurrentForElevator() {
    if (!this.data.currentLocation) {
      this.refreshLocation();
      return;
    }

    this.setData({
      draftElevator: Object.assign({}, this.data.currentLocation)
    });
    this.updateMarkers();
    wx.showToast({ title: '已设为电梯', icon: 'success' });
  },

  handleFloorChange(event) {
    this.setData({
      floorIndex: Number(event.detail.value)
    });
  },

  handleParkingCodeInput(event) {
    this.setData({
      parkingCode: event.detail.value
    });
  },

  handleMallNameInput(event) {
    this.setData({
      mallName: event.detail.value
    });
  },

  handleGarageNameInput(event) {
    this.setData({
      garageName: event.detail.value
    });
  },

  handleEntranceNoteInput(event) {
    this.setData({
      entranceNote: event.detail.value
    });
  },

  handlePillarCodeInput(event) {
    this.setData({
      pillarCode: event.detail.value
    });
  },

  handleLicensePlateInput(event) {
    this.setData({
      licensePlate: event.detail.value.toUpperCase()
    });
  },

  handleElevatorNoteInput(event) {
    this.setData({
      elevatorNote: event.detail.value
    });
  },

  handleRemarkInput(event) {
    this.setData({
      remark: event.detail.value
    });
  },

  async addPhoto(event) {
    try {
      const photoType = event.currentTarget.dataset.type;
      const selected = this.data.draftPhotos;
      if (selected.length >= 6) {
        wx.showToast({ title: '最多保存 6 张', icon: 'none' });
        return;
      }

      const tempPaths = await chooseImages(1);
      if (!tempPaths.length) {
        return;
      }

      wx.showLoading({ title: '保存照片中' });
      const filePath = await saveFile(tempPaths[0]);
      const nextPhotos = selected.concat({
        id: `photo-${Date.now()}`,
        type: photoType,
        label: photoTypeOptions.find((item) => item.value === photoType).label,
        filePath
      });

      this.setData({
        draftPhotos: nextPhotos
      });
    } catch (error) {
      if (error && error.errMsg && error.errMsg.includes('cancel')) {
        return;
      }
      wx.showToast({ title: '保存照片失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  previewDraftPhoto(event) {
    const current = event.currentTarget.dataset.path;
    previewImages(this.data.draftPhotos.map((item) => item.filePath), current);
  },

  removeDraftPhoto(event) {
    const id = event.currentTarget.dataset.id;
    const target = this.data.draftPhotos.find((item) => item.id === id);
    this.setData({
      draftPhotos: this.data.draftPhotos.filter((item) => item.id !== id)
    });

    if (target && target.filePath) {
      wx.removeSavedFile({
        filePath: target.filePath
      });
    }
  },

  previewSavedPhoto(event) {
    const current = event.currentTarget.dataset.path;
    const activeRecord = this.data.activeRecord;
    if (!activeRecord) {
      return;
    }

    previewImages(activeRecord.photos.map((item) => item.filePath), current);
  },

  async saveParkingRecord() {
    const parkingPoint = this.data.draftParking || this.data.currentLocation;
    if (!parkingPoint) {
      wx.showToast({
        title: '请先定位或点选地图',
        icon: 'none'
      });
      return;
    }

    const record = {
      id: `parking-${Date.now()}`,
      timestamp: Date.now(),
      mallName: this.data.mallName.trim(),
      garageName: this.data.garageName.trim(),
      floor: floorOptions[this.data.floorIndex],
      entranceNote: this.data.entranceNote.trim(),
      pillarCode: this.data.pillarCode.trim(),
      licensePlate: this.data.licensePlate.trim().toUpperCase(),
      parkingCode: this.data.parkingCode.trim(),
      elevatorNote: this.data.elevatorNote.trim(),
      remark: this.data.remark.trim(),
      parking: parkingPoint,
      elevator: this.data.draftElevator,
      photos: this.data.draftPhotos
    };

    wx.showLoading({ title: '保存中' });

    try {
      let nextRecord = record;
      if (isCloudReady()) {
        nextRecord = await upsertRecord(record);
        this.setData({
          cloudStatusText: '已同步到云端'
        });
      } else {
        this.setData({
          cloudStatusText: '仅本机保存'
        });
      }

      saveActiveRecord(nextRecord);
      const activeRecord = buildRecordView(nextRecord, this.data.currentLocation);
      this.setData({
        activeRecord,
        distanceText: activeRecord.distanceText,
        draftParking: null,
        draftElevator: null,
        draftPhotos: []
      });
      this.updateMarkers();

      wx.showToast({
        title: '已记录停车位置',
        icon: 'success'
      });
    } catch (error) {
      saveActiveRecord(record);
      this.setData({
        activeRecord: buildRecordView(record, this.data.currentLocation),
        cloudStatusText: '云同步失败，已存本机',
        draftParking: null,
        draftElevator: null,
        draftPhotos: []
      });
      this.updateMarkers();
      wx.showToast({
        title: '已存本机，云同步失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  tryPlateSearch() {
    const plateNumber = this.data.licensePlate.trim().toUpperCase();
    if (!plateNumber) {
      wx.showToast({
        title: '请先填写车牌号',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '车牌找车能力说明',
      content: '自动按车牌找到车位，必须依赖停车场自身的车牌识别和反向寻车系统开放接口。当前版本已支持保存车牌号，但还没有对接具体停车场接口。',
      showCancel: false
    });
  },

  navigateToParking() {
    const record = this.data.activeRecord;
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
    const record = this.data.activeRecord;
    if (!record || !record.elevator) {
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

  goFindCar() {
    const record = this.data.activeRecord;
    if (!record) {
      wx.showToast({
        title: '还没有保存车位',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/find-car/find-car?id=${record.id}`
    });
  },

  clearActiveRecord() {
    wx.showModal({
      title: '清除当前车位',
      content: '清除后仍可在历史记录中查看最近保存的数据。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        clearStoredActiveRecord();
        this.setData({
          activeRecord: null,
          distanceText: ''
        });
        this.updateMarkers();
      }
    });
  },

  goHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});
