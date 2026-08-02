$ErrorActionPreference = "Stop"

# Read files and convert to Base64
$basePath = "D:\code\todo-app"
$files = @("index.html", "style.css", "app.js", "README.md")

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DevTask - GitHub Upload Tool" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To upload your files, you need a GitHub Personal Access Token." -ForegroundColor Yellow
Write-Host ""
Write-Host "I will open the page to create one. Do this:" -ForegroundColor White
Write-Host "  1. Click 'Generate new token (classic)'" -ForegroundColor Green
Write-Host "  2. Note: type 'devtask upload'" -ForegroundColor Green
Write-Host "  3. Check the box next to 'repo'" -ForegroundColor Green
Write-Host "  4. Scroll down and click 'Generate token'" -ForegroundColor Green
Write-Host "  5. COPY the token (starts with ghp_)" -ForegroundColor Green
Write-Host "  6. Come back here and paste it" -ForegroundColor Green
Write-Host ""

Start-Process "https://github.com/settings/tokens/new"
Start-Sleep -Seconds 2

$token = Read-Host "Paste your GitHub token here"

if (-not $token) {
    Write-Host "No token provided. Exiting." -ForegroundColor Red
    exit 1
}

$owner = "samasayed5654-cyber"
$repo = "devtask"
$branch = "main"
$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

# First, create an initial commit with all files using the Git Data API
Write-Host ""
Write-Host "Uploading files..." -ForegroundColor Cyan

# Step 1: Create blobs for each file
$blobShas = @{}
foreach ($file in $files) {
    $filePath = Join-Path $basePath $file
    $content = [System.IO.File]::ReadAllText($filePath)
    $body = @{ content = $content; encoding = "utf-8" } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/blobs" -Method POST -Headers $headers -Body $body -ContentType "application/json"
        $blobShas[$file] = $response.sha
        Write-Host "  [OK] $file uploaded" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $file - $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Create tree
$treeItems = @()
foreach ($file in $files) {
    $treeItems += @{
        path = $file
        mode = "100644"
        type = "blob"
        sha = $blobShas[$file]
    }
}
$treeBody = @{ tree = $treeItems } | ConvertTo-Json -Depth 10
$treeResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/trees" -Method POST -Headers $headers -Body $treeBody -ContentType "application/json"
Write-Host "  [OK] File tree created" -ForegroundColor Green

# Step 3: Create commit
$commitBody = @{
    message = "Initial commit: DevTask programmer to-do app"
    tree = $treeResponse.sha
} | ConvertTo-Json -Depth 10
$commitResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits" -Method POST -Headers $headers -Body $commitBody -ContentType "application/json"
Write-Host "  [OK] Commit created" -ForegroundColor Green

# Step 4: Create main branch ref
$refBody = @{
    ref = "refs/heads/main"
    sha = $commitResponse.sha
} | ConvertTo-Json -Depth 10
$refResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs" -Method POST -Headers $headers -Body $refBody -ContentType "application/json"
Write-Host "  [OK] Branch 'main' created" -ForegroundColor Green

# Step 5: Enable GitHub Pages
Write-Host ""
Write-Host "Enabling GitHub Pages..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

$pagesBody = @{
    source = @{
        branch = "main"
        path = "/"
    }
} | ConvertTo-Json -Depth 10

try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/pages" -Method POST -Headers $headers -Body $pagesBody -ContentType "application/json"
    Write-Host "  [OK] GitHub Pages enabled!" -ForegroundColor Green
} catch {
    Write-Host "  [NOTE] Pages may need manual setup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ALL DONE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your website will be live in ~1 minute at:" -ForegroundColor White
Write-Host ""
Write-Host "  https://samasayed5654-cyber.github.io/devtask/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening it now..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "https://samasayed5654-cyber.github.io/devtask/"
