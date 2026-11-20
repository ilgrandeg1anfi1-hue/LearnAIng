# Fails unless every exe in dist/ has a valid Authenticode signature chained to a trusted root.
$ErrorActionPreference = 'Stop'
$exes = Get-ChildItem -Path "$PSScriptRoot/../dist" -Filter *.exe -File
if (-not $exes) { Write-Error 'No exe in dist/' }
$bad = 0
foreach ($exe in $exes) {
  $sig = Get-AuthenticodeSignature -LiteralPath $exe.FullName
  $signer = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { '-' }
  $stamped = if ($sig.TimeStamperCertificate) { 'yes' } else { 'NO' }
  Write-Output ('{0}: {1} | signer: {2} | timestamp: {3}' -f $exe.Name, $sig.Status, $signer, $stamped)
  if ($sig.Status -ne 'Valid' -or -not $sig.TimeStamperCertificate) { $bad++ }
}
if ($bad) { Write-Error "$bad exe without a valid, timestamped signature" }
