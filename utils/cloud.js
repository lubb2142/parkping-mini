const COLLECTION_NAME = 'parkingRecords';

function isCloudReady() {
  return Boolean(wx.cloud && typeof wx.cloud.database === 'function');
}

function getCollection() {
  return wx.cloud.database().collection(COLLECTION_NAME);
}

function getFileExtension(filePath) {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(filePath || '');
  return match ? `.${match[1]}` : '.jpg';
}

async function attachTempUrls(photos) {
  const cloudIds = photos
    .map((photo) => photo.cloudFileID)
    .filter(Boolean);

  if (!cloudIds.length) {
    return photos;
  }

  const result = await wx.cloud.getTempFileURL({
    fileList: cloudIds
  });

  const tempUrlMap = {};
  (result.fileList || []).forEach((item) => {
    tempUrlMap[item.fileID] = item.tempFileURL;
  });

  return photos.map((photo) => Object.assign({}, photo, {
    filePath: tempUrlMap[photo.cloudFileID] || photo.filePath || ''
  }));
}

async function uploadPhotos(record) {
  const photos = await Promise.all((record.photos || []).map(async (photo) => {
    if (photo.cloudFileID) {
      return photo;
    }

    const extension = getFileExtension(photo.filePath);
    const cloudPath = `parking-helper/${record.id}/${photo.id}${extension}`;
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath,
      filePath: photo.filePath
    });

    return Object.assign({}, photo, {
      cloudFileID: uploadResult.fileID
    });
  }));

  return attachTempUrls(photos);
}

function toCloudRecord(record) {
  return {
    timestamp: record.timestamp,
    mallName: record.mallName || '',
    garageName: record.garageName || '',
    floor: record.floor || '',
    entranceNote: record.entranceNote || '',
    pillarCode: record.pillarCode || '',
    licensePlate: record.licensePlate || '',
    parkingCode: record.parkingCode || '',
    elevatorNote: record.elevatorNote || '',
    remark: record.remark || '',
    parking: record.parking || null,
    elevator: record.elevator || null,
    photos: (record.photos || []).map((photo) => ({
      id: photo.id,
      type: photo.type,
      label: photo.label,
      cloudFileID: photo.cloudFileID || ''
    }))
  };
}

function fromCloudRecord(doc) {
  return {
    id: doc._id,
    timestamp: doc.timestamp,
    mallName: doc.mallName || '',
    garageName: doc.garageName || '',
    floor: doc.floor || '',
    entranceNote: doc.entranceNote || '',
    pillarCode: doc.pillarCode || '',
    licensePlate: doc.licensePlate || '',
    parkingCode: doc.parkingCode || '',
    elevatorNote: doc.elevatorNote || '',
    remark: doc.remark || '',
    parking: doc.parking || null,
    elevator: doc.elevator || null,
    photos: doc.photos || []
  };
}

async function upsertRecord(record) {
  if (!isCloudReady()) {
    throw new Error('cloud-not-ready');
  }

  const photos = await uploadPhotos(record);
  const nextRecord = Object.assign({}, record, { photos });

  await getCollection().doc(record.id).set({
    data: toCloudRecord(nextRecord)
  });

  return nextRecord;
}

async function fetchRecords(limit = 20) {
  if (!isCloudReady()) {
    throw new Error('cloud-not-ready');
  }

  const result = await getCollection()
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return Promise.all((result.data || []).map(async (item) => {
    const record = fromCloudRecord(item);
    return Object.assign({}, record, {
      photos: await attachTempUrls(record.photos || [])
    });
  }));
}

async function removeRecord(record) {
  if (!isCloudReady()) {
    throw new Error('cloud-not-ready');
  }

  const fileList = (record.photos || [])
    .map((photo) => photo.cloudFileID)
    .filter(Boolean);

  if (fileList.length) {
    await wx.cloud.deleteFile({ fileList });
  }

  await getCollection().doc(record.id).remove();
}

module.exports = {
  isCloudReady,
  upsertRecord,
  fetchRecords,
  removeRecord
};
