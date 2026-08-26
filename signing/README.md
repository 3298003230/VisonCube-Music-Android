# VisonCube Music Android signing

`visoncube-music-release-cert.pem` is the public certificate for official VisonCube Music Android releases. It has no private key material.

- Certificate-file SHA-256: `C424C1C80B46F1505E3BFA5BA82406D1C0A67EB03DD83E5120A78E1F20EB0F2F`
- Certificate SHA-256 fingerprint: `9C951C4BBA399D21751F4B194E839DA3A49EFD60534CF9B3B9D35859A6D6BC95`
- Certificate owner: `CN=VisonCube Music, OU=Development, O=VisonCube, L=Shanghai, ST=Shanghai, C=CN`

The local private JKS and `keystore.properties` are intentionally excluded from Git. The protected local directory is `D:\Compilationenvironment\VisonCube-Music-Signing` and is restricted to the current Windows account and `SYSTEM`.

The private repository stores `visoncube-music-signing-backup.vcb`, an AES-256-GCM encrypted recovery archive. Its recovery passphrase is not stored in GitHub. To restore on a new machine, run:

```powershell
.\signing\Restore-SigningBackup.ps1
```

Enter the recovery passphrase when prompted. The script validates the AES-GCM authentication tag before extracting `visoncube-music-release.jks`, `keystore.properties`, and the backup metadata.

Only APKs built with the local release signing configuration and passing `apksigner verify` are official releases. The old `com.visoncube.music.mobile` application uses a different package identity and remains independently installed during the migration to `com.visoncube.music`.
