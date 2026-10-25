# 当前进度

## 2026-10-25 双端稳定上游修复与 2.13.10（源码阶段）

- 按已核对的稳定上游版本同步酷狗分享链歌单回退、QQ 音乐推荐歌单和容量单位修复；保留账号、同步、托管音源、退出登录保留音源、品牌资源和缓存清理。
- Android 增加腾讯 QRC 歌词解码、QQ 搜索、MG 图片/歌曲 ID/歌词兼容修复；版本更新为 2.13.10、versionCode=92，新增对应静态回归测试和变更记录。
- 已创建前置备份 backups/music-upstream-sync-20261024；本轮已完成源码测试、GitHub CI、普通推送和正式 Release；COS 与服务器更新清单仍未修改。
- 最终提交为 07f810a（同步修复）和 8895a2c（lint 修复），已普通推送 Android main；CI run 40112613099 成功，包含同步测试、零警告项目 lint、JavaScript bundle 和 Debug APK 构建。日志仅保留第三方 Java 弃用注解和 Runner Node 20 迁移提示。

- 正式发布 workflow run 40155495508 成功，已创建 GitHub Release v2.13.10，包含 universal、arm64-v8a、armeabi-v7a、x86_64、x86 五个签名 APK 和 SHA256SUMS.txt。

## 2026-09-29 Android 2.13.9 正式发布

- 源码提交 `accf122` 已推送，候选 Actions run `36533961054` 成功。
- universal 与四种 ABI APK 均完成校验；universal 包大小 `29120140` 字节，SHA-256 `E88D3B27D16EA761954C3BEC98F959DF80D766C9C73A9A73BD1A1A0FF8C47277`。
- `aapt` 确认包名、版本名和 versionCode；`apksigner` 确认 v1/v2 签名及既有证书指纹。
- universal 包已上传到 `https://download.visoncube.cn/VisonCube/Music/Android/visoncube-music-mobile-v2.13.9-universal.apk`，生产更新接口、文件长度和 Range 206 已验证，更新为非强制发布。
