# 単体試験を Edge のヘッドレスモードで実行する（基本設計書 06 の 9.5）
# 使い方: powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1 [-Filter APR]
param(
  [string]$Filter = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 1) Edge の実行ファイルを探す
$edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'
if (-not (Test-Path $edge)) {
  $edge = Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'
}
if (-not (Test-Path $edge)) {
  Write-Output 'Microsoft Edge (msedge.exe) が見つかりません。tests\test.html を Edge で開いて結果を確認してください。'
  exit 2
}

# 2) test.html の絶対パスを file:/// の URL にする
$htmlPath = Join-Path $PSScriptRoot 'test.html'
$url = ([Uri](Resolve-Path $htmlPath).Path).AbsoluteUri
if ($Filter -ne '') {
  $url = $url + '?filter=' + [Uri]::EscapeDataString($Filter)
}

# 3) ヘッドレスで開き、読み込み後の DOM を一時ファイルに書き出す
$outFile = [System.IO.Path]::GetTempFileName()
$errFile = [System.IO.Path]::GetTempFileName()
$profileDir = Join-Path $env:TEMP 'info-expense-test'
$arguments = @('--headless', '--disable-gpu', '--no-first-run', "--user-data-dir=`"$profileDir`"", '--dump-dom', $url)
Start-Process -FilePath $edge -ArgumentList $arguments -Wait -NoNewWindow `
  -RedirectStandardOutput $outFile -RedirectStandardError $errFile | Out-Null

# 4) <pre id="result-text"> の中身を取り出して表示する（標準エラーは判定に使わない）
$dom = (Get-Content -Path $outFile -Encoding UTF8) -join "`n"
Remove-Item $outFile, $errFile -ErrorAction SilentlyContinue

if ($dom -notmatch '(?s)<pre id="result-text">(.*?)</pre>') {
  Write-Output 'テスト結果を取得できませんでした。tests\test.html を Edge で開いて確認してください。'
  exit 2
}
$text = [System.Net.WebUtility]::HtmlDecode($Matches[1])
$lines = $text -split "`n"
$summary = ''
foreach ($line in $lines) {
  if ($line.StartsWith('FAIL ')) {
    Write-Output $line
  }
  if ($line.StartsWith('SUMMARY ')) {
    $summary = $line
  }
}
Write-Output $summary

# 5) 全件合格なら終了コード 0
if ($summary -match 'fail=0$' -and $summary -notmatch 'total=0 ') {
  exit 0
}
exit 1
