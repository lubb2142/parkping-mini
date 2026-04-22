function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 5000,
      success: resolve,
      fail: reject
    });
  });
}

function openMapNavigation(target) {
  return new Promise((resolve, reject) => {
    wx.openLocation({
      latitude: target.latitude,
      longitude: target.longitude,
      scale: 18,
      name: target.name || '停车位置',
      address: target.address || '',
      success: resolve,
      fail: reject
    });
  });
}

function calculateDistance(from, to) {
  if (!from || !to) {
    return null;
  }

  const earthRadius = 6378137;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

function formatDistance(distance) {
  if (distance === null || distance === undefined) {
    return '未知';
  }

  if (distance < 1000) {
    return `${distance} 米`;
  }

  return `${(distance / 1000).toFixed(1)} 公里`;
}

module.exports = {
  getCurrentLocation,
  openMapNavigation,
  calculateDistance,
  formatDistance
};
