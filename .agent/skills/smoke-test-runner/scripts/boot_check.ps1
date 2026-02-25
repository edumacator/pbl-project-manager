# Boot Check Script (PowerShell)

Write-Host "--- Starting Boot Check ---" -ForegroundColor Cyan

# 1. Check PHP Server
Write-Host "[1/2] Checking PHP Server..."
try {
    $phpResponse = Invoke-WebRequest -Uri "http://localhost:8001" -Method Head -ErrorAction SilentlyContinue
    if ($phpResponse.StatusCode -eq 200) {
        Write-Host "  [OK] PHP Server is responsive." -ForegroundColor Green
    } else {
        Write-Host "  [!] PHP Server returned status $($phpResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] PHP Server appears to be down (localhost:8001)." -ForegroundColor Red
}

# 2. Check Vite Client
Write-Host "[2/2] Checking Vite Client..."
try {
    $viteResponse = Invoke-WebRequest -Uri "http://localhost:5174" -Method Head -ErrorAction SilentlyContinue
    if ($viteResponse.StatusCode -eq 200) {
        Write-Host "  [OK] Vite Client is responsive." -ForegroundColor Green
    } else {
        Write-Host "  [!] Vite Client returned status $($viteResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Vite Client appears to be down (localhost:5174)." -ForegroundColor Red
}

Write-Host "--- Boot Check Complete ---"
