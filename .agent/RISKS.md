# 当前风险

- 2.13.10 源码接线、静态测试、GitHub Actions lint、JavaScript bundle 和 Debug APK 构建已通过；五种 Release APK、签名和真实设备验收仍需后续发布门禁。
- 腾讯 QRC 歌词解码新增纯 JS 实现，运行时依赖现有 pako 与全局 Buffer；CI 已通过，实体设备仍需确认解码、内存占用、歌词显示及播放流程。
- GitHub v2.13.10 Release 已发布；COS 对象、服务器 releases.json 和生产下载清单尚未同步，后续生产切换需单独确认并验证 APK 哈希、签名和更新接口。

- 2.13.9 已完成 CI、包元数据、签名、哈希、公开下载和更新接口验证；尚未在真实 Android 设备上完成未知来源授权、覆盖安装、播放和跨设备账号同步闭环。
- universal APK 使用既有正式证书；JKS、恢复口令和生产密钥不得写入源码、日志或 Artifact。
- 旧客户端和旧下载域名暂时保留兼容，移除前必须确认活跃版本分布。
