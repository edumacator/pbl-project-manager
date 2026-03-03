$ErrorActionPreference = "Stop"

$ProjectRoot = "c:\Antigravity_Projects\project-management"
$DeployDir = "$ProjectRoot\deploy_ready"

Write-Host "Cleaning up deploy_ready directory..."
if (Test-Path $DeployDir) {
    Remove-Item -Recurse -Force $DeployDir\* -ErrorAction SilentlyContinue
}
else {
    New-Item -ItemType Directory -Path $DeployDir | Out-Null
}

Write-Host "Copying /server into /deploy_ready..."
Copy-Item -Recurse -Path "$ProjectRoot\server\*" -Destination $DeployDir

Write-Host "Configuring .env file..."
if (Test-Path "$DeployDir\.env") {
    Remove-Item -Force "$DeployDir\.env"
}
if (Test-Path "$DeployDir\.env.production") {
    Rename-Item -Path "$DeployDir\.env.production" -NewName ".env"
}

Write-Host "Building React Client..."
Set-Location -Path "$ProjectRoot\client"
npm run build

Write-Host "Copying Client build to /deploy_ready/public..."
Set-Location -Path $ProjectRoot
if (-not (Test-Path "$DeployDir\public")) {
    New-Item -ItemType Directory -Path "$DeployDir\public" | Out-Null
}
Copy-Item -Recurse -Path "$ProjectRoot\client\dist\*" -Destination "$DeployDir\public"

Write-Host "Writing custom .htaccess for IONOS..."
$HtaccessContent = @"
RewriteEngine On
RewriteBase /
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=`$1

# Route /api/ to PHP backend
RewriteCond %{REQUEST_URI} ^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.php [QSA,L]

# Route all other non-file traffic to React's index.html
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
"@
Set-Content -Path "$DeployDir\public\.htaccess" -Value $HtaccessContent 

Write-Host "Ensuring lowercase src directories..."
# PHP autoload handles lowercase resolution, but we can verify folder names are literally lowercase.
Get-ChildItem -Path "$DeployDir\src" -Directory -Recurse | Where-Object { $_.Name -cne $_.Name.ToLower() } | Rename-Item -NewName { $_.Name.ToLower() }

Write-Host "Deploy package is ready in $DeployDir!"
