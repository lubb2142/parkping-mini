# ParkPing

WeChat Mini Program prototype for helping drivers remember where they parked, especially in underground parking lots and large malls in mainland China.

[中文说明](./README.zh-CN.md)

## Features

- Save the current parking location with one tap
- Record floor, parking slot, entrance note, pillar marker, elevator note, and free-text memo
- Save on-site photos for the parking slot, entrance, and pillar marker
- Adjust parking and elevator positions directly on the map
- Sync parking records and photos with WeChat Cloud Development
- Save a license plate number for future parking-lot integration
- Use a dedicated "find car" flow with step-by-step cues instead of a single navigation button
- Review recent parking history and reuse an old record
- Open WeChat map navigation to either the car or the elevator

## Why WeChat Mini Program First

- Lowest usage friction for users in mainland China
- Core APIs like `wx.getLocation`, `map`, and `wx.openLocation` already cover the MVP
- No dependency on the car's hardware or OEM app support

## Project Structure

- `pages/index`: record parking, edit notes, save photos, sync records
- `pages/find-car`: step-by-step car finding flow
- `pages/history`: recent parking history
- `utils/cloud.js`: cloud sync and photo upload helpers
- `utils/storage.js`: local cache helpers

## Run Locally

1. Open WeChat DevTools
2. Import the project root directory
3. Use a test AppID or your own Mini Program AppID
4. Grant location permission
5. Tap "停车并记录位置" after parking

## Cloud Sync Setup

1. Enable Cloud Development in WeChat DevTools
2. Create a collection named `parkingRecords`
3. Bind the Mini Program to your cloud environment
4. Photos are uploaded through `wx.cloud.uploadFile`
5. Records are stored in the cloud database and can be restored on another device

## Current Limits

- Underground GPS drift is real, so manual map correction is part of the product by design
- Elevator and indoor cues still depend on manual recording in most malls
- License-plate based reverse car finding is not a generic map capability
- Automatic plate-to-slot lookup requires a parking lot's own license plate recognition and reverse-find API

## Future Roadmap

1. Add Tencent location search and nearby POI enrichment
2. Integrate with specific parking-lot reverse-find providers when APIs are available
3. Add mall / parking-lot autocomplete
4. Improve the guided "find car" flow with indoor-first navigation hints
5. Explore indoor map / elevator POI enhancement for large venues

## References

- WeChat Mini Program `wx.getLocation`: https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html
- WeChat Mini Program `map` component: https://developers.weixin.qq.com/miniprogram/dev/component/map.html
- Tencent Location Service Mini Program JS SDK: https://lbs.qq.com/miniProgram/jsSdk/jsSdkGuide/jsSdkOverview
