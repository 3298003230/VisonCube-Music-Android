param(
    [string]$SourceDirectory = "D:\Compilationenvironment\VisonCube-Music-Signing",
    [string]$PublicCertificate = (Join-Path $PSScriptRoot "visoncube-music-release-cert.pem"),
    [string]$Archive = (Join-Path $PSScriptRoot "visoncube-music-signing-backup.vcb"),
    [Security.SecureString]$RecoveryPassphrase
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -lt 7) { throw "PowerShell 7 or newer is required." }

$magic = [Text.Encoding]::ASCII.GetBytes("VCMSIG01")
$iterations = 600000
$tagLength = 16
$keystore = Join-Path $SourceDirectory "visoncube-music-release.jks"
$properties = Join-Path $SourceDirectory "keystore.properties"
$certificateHash = "C424C1C80B46F1505E3BFA5BA82406D1C0A67EB03DD83E5120A78E1F20EB0F2F"

function Get-PlainText([Security.SecureString]$SecureValue) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

foreach ($path in @($keystore, $properties, $PublicCertificate)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required signing file not found: $path" }
}
if ((Get-FileHash -LiteralPath $PublicCertificate -Algorithm SHA256).Hash -ne $certificateHash) {
    throw "The public certificate does not match the recorded SHA-256."
}

if ($null -eq $RecoveryPassphrase) { $RecoveryPassphrase = Read-Host "Recovery passphrase" -AsSecureString }
$passphrase = Get-PlainText $RecoveryPassphrase
if ($passphrase.Length -lt 10) { throw "Recovery passphrase must contain at least 10 characters." }

$tempRoot = Join-Path $env:TEMP ("VCMusicSignBackup-" + [Guid]::NewGuid().ToString("N"))
$payloadDirectory = Join-Path $tempRoot "payload"
$zipPath = Join-Path $tempRoot "payload.zip"
$verifyZip = Join-Path $tempRoot "verify.zip"
$verifyDirectory = Join-Path $tempRoot "verify"

try {
    New-Item -ItemType Directory -Path $payloadDirectory -Force | Out-Null
    Copy-Item -LiteralPath $keystore -Destination $payloadDirectory
    Copy-Item -LiteralPath $properties -Destination $payloadDirectory
    Copy-Item -LiteralPath $PublicCertificate -Destination $payloadDirectory

    $metadata = [ordered]@{
        format = "VCMSIG01"
        created_utc = [DateTime]::UtcNow.ToString("o")
        certificate_sha256 = $certificateHash
        keystore_sha256 = (Get-FileHash -LiteralPath $keystore -Algorithm SHA256).Hash
        properties_sha256 = (Get-FileHash -LiteralPath $properties -Algorithm SHA256).Hash
        encryption = "AES-256-GCM"
        kdf = "PBKDF2-HMAC-SHA256"
        iterations = $iterations
    }
    $metadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $payloadDirectory "backup-metadata.json") -Encoding UTF8
    Compress-Archive -Path (Join-Path $payloadDirectory "*") -DestinationPath $zipPath -CompressionLevel Optimal

    $salt = New-Object byte[] 16
    $nonce = New-Object byte[] 12
    [Security.Cryptography.RandomNumberGenerator]::Fill($salt)
    [Security.Cryptography.RandomNumberGenerator]::Fill($nonce)
    $plaintext = [IO.File]::ReadAllBytes($zipPath)
    $ciphertext = New-Object byte[] $plaintext.Length
    $tag = New-Object byte[] $tagLength
    $derive = [Security.Cryptography.Rfc2898DeriveBytes]::new($passphrase, $salt, $iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
    $key = $derive.GetBytes(32)
    try {
        $aes = [Security.Cryptography.AesGcm]::new($key, $tagLength)
        try {
            $aes.Encrypt($nonce, $plaintext, $ciphertext, $tag, $magic)
        }
        finally {
            $aes.Dispose()
        }
    }
    finally {
        $derive.Dispose()
        [Array]::Clear($key, 0, $key.Length)
        [Array]::Clear($plaintext, 0, $plaintext.Length)
    }

    $output = New-Object byte[] ($magic.Length + $salt.Length + $nonce.Length + $tag.Length + $ciphertext.Length)
    $offset = 0
    foreach ($part in @($magic, $salt, $nonce, $tag, $ciphertext)) {
        [Array]::Copy($part, 0, $output, $offset, $part.Length)
        $offset += $part.Length
    }
    [IO.File]::WriteAllBytes($Archive, $output)

    $testPlaintext = New-Object byte[] $ciphertext.Length
    $testDerive = [Security.Cryptography.Rfc2898DeriveBytes]::new($passphrase, $salt, $iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
    $testKey = $testDerive.GetBytes(32)
    try {
        $testAes = [Security.Cryptography.AesGcm]::new($testKey, $tagLength)
        try {
            $testAes.Decrypt($nonce, $ciphertext, $tag, $testPlaintext, $magic)
        }
        finally {
            $testAes.Dispose()
        }
    }
    finally {
        $testDerive.Dispose()
        [Array]::Clear($testKey, 0, $testKey.Length)
    }

    [IO.File]::WriteAllBytes($verifyZip, $testPlaintext)
    [Array]::Clear($testPlaintext, 0, $testPlaintext.Length)
    Expand-Archive -LiteralPath $verifyZip -DestinationPath $verifyDirectory
    $storeMatches = (Get-FileHash -LiteralPath (Join-Path $verifyDirectory "visoncube-music-release.jks") -Algorithm SHA256).Hash -eq $metadata.keystore_sha256
    $propertiesMatch = (Get-FileHash -LiteralPath (Join-Path $verifyDirectory "keystore.properties") -Algorithm SHA256).Hash -eq $metadata.properties_sha256
    if (-not $storeMatches -or -not $propertiesMatch) { throw "Encrypted signing backup verification failed." }

    Write-Host "Encrypted archive: $Archive"
    Write-Host "Archive SHA-256: $((Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash)"
    Write-Host "Decryption verification: passed"
}
finally {
    $passphrase = $null
    if (Test-Path -LiteralPath $tempRoot) {
        $resolvedTemp = (Resolve-Path -LiteralPath $tempRoot).Path
        $allowedRoot = [IO.Path]::GetFullPath($env:TEMP)
        if (-not $resolvedTemp.StartsWith($allowedRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove unexpected temporary path: $resolvedTemp"
        }
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
    }
}
