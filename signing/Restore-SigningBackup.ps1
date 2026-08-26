param(
    [string]$Archive = (Join-Path $PSScriptRoot "visoncube-music-signing-backup.vcb"),
    [string]$Destination = "D:\Compilationenvironment\VisonCube-Music-Signing",
    [Security.SecureString]$RecoveryPassphrase
)

$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -lt 7) { throw "PowerShell 7 or newer is required." }
$magic = [Text.Encoding]::ASCII.GetBytes("VCMSIG01")
$saltLength = 16
$nonceLength = 12
$tagLength = 16
$iterations = 600000

function Get-PlainText([Security.SecureString]$SecureValue) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

$data = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Archive))
$minimumLength = $magic.Length + $saltLength + $nonceLength + $tagLength + 1
if ($data.Length -lt $minimumLength) { throw "Invalid signing backup: file is too short." }

$offset = 0
$storedMagic = $data[$offset..($offset + $magic.Length - 1)]
$offset += $magic.Length
if ([Text.Encoding]::ASCII.GetString($storedMagic) -ne "VCMSIG01") { throw "Invalid signing backup header." }

$salt = $data[$offset..($offset + $saltLength - 1)]
$offset += $saltLength
$nonce = $data[$offset..($offset + $nonceLength - 1)]
$offset += $nonceLength
$tag = $data[$offset..($offset + $tagLength - 1)]
$offset += $tagLength
$ciphertext = $data[$offset..($data.Length - 1)]
$plaintext = New-Object byte[] $ciphertext.Length

if ($null -eq $RecoveryPassphrase) { $RecoveryPassphrase = Read-Host "Recovery passphrase" -AsSecureString }
$passphrase = Get-PlainText $RecoveryPassphrase
try {
    $derive = [Security.Cryptography.Rfc2898DeriveBytes]::new($passphrase, $salt, $iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
    $key = $derive.GetBytes(32)
    try {
        $aes = [Security.Cryptography.AesGcm]::new($key, $tagLength)
        try {
            $aes.Decrypt($nonce, $ciphertext, $tag, $plaintext, $storedMagic)
        }
        finally {
            $aes.Dispose()
        }
    }
    finally {
        [Array]::Clear($key, 0, $key.Length)
        $derive.Dispose()
    }
}
finally {
    $passphrase = $null
}

New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$zipPath = Join-Path $Destination "visoncube-music-signing-backup.zip"
try {
    [IO.File]::WriteAllBytes($zipPath, $plaintext)
    Expand-Archive -LiteralPath $zipPath -DestinationPath $Destination -Force
}
finally {
    [Array]::Clear($plaintext, 0, $plaintext.Length)
    Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
}

$account = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $Destination /inheritance:r /grant:r "$account`:(OI)(CI)F" /grant:r 'SYSTEM:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Unable to restrict restored signing-directory permissions." }

Write-Host "Signing backup restored to: $Destination"
