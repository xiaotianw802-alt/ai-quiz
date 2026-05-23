# AI刷题系统 - 启动脚本
# 使用方法: 右键 start.ps1 -> 使用PowerShell运行
# 或者在PowerShell中: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI刷题系统 - 后端启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 读取.env文件
$envFile = Join-Path $PSScriptRoot "server\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*?)\s*$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $val, "Process")
            Write-Host "[ENV] $key = ***" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "[WARN] 未找到 .env 文件" -ForegroundColor Yellow
    Write-Host "[WARN] 请先设置 DEEPSEEK_API_KEY" -ForegroundColor Yellow
    Write-Host "[WARN] PowerShell: `$env:DEEPSEEK_API_KEY='sk-xxxx'; node server.js" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[启动] 正在启动服务器..." -ForegroundColor Green
Set-Location (Join-Path $PSScriptRoot "server")
node server.js

Read-Host "按回车键退出"