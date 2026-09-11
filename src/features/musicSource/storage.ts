import { setUserApiList } from '@/core/userApi'
import { getUserApiList, removeManagedUserApi } from '@/utils/data'
import { existsFile, privateStorageDirectoryPath, unlink } from '@/utils/fs'

const sourceDir = `${privateStorageDirectoryPath}/visoncube-music-source`

export const managedSourcePaths = {
  sourceDir,
  manifestPath: `${sourceDir}/manifest.json`,
  sourcePath: `${sourceDir}/source.js`,
  sourceTempPath: `${sourceDir}/source.tmp`,
}

const removeCacheFile = async(path: string) => {
  if (await existsFile(path)) await unlink(path)
}

export const clearManagedSourceCache = async() => {
  await Promise.all([
    removeCacheFile(managedSourcePaths.manifestPath),
    removeCacheFile(managedSourcePaths.sourcePath),
    removeCacheFile(managedSourcePaths.sourceTempPath),
  ])
}

export const removeManagedSource = async() => {
  await clearManagedSourceCache()
  await removeManagedUserApi()
  setUserApiList(await getUserApiList())
}
