#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Post-deploy security smoke test for CinePurr.
    Run after every production deployment to confirm security patches hold.

.PARAMETER BaseUrl
    Root URL of the deployment to test. Defaults to https://cinepurr.me

.EXAMPLE
    .\scripts\verify-security.ps1
    .\scripts\verify-security.ps1 -BaseUrl https://staging.cinepurr.me
#>

param(
    [string]$BaseUrl = "https://cinepurr.me"
)

$BaseUrl = $BaseUrl.TrimEnd("/")
$PASS  = "`e[32mPASS`e[0m"
$FAIL  = "`e[31mFAIL`e[0m"
$WARN  = "`e[33mWARN`e[0m"
$failures = 0

function Test-Endpoint {
    param(
        [string]$Label,
        [string]$Url,
        [int[]]$ExpectStatus,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [string]$ShouldNotContain = $null,
        [string]$ShouldContain = $null
    )

    try {
        $params = @{
            Uri                = $Url
            Method             = $Method
            UseBasicParsing    = $true
            TimeoutSec         = 20
            ErrorAction        = "Stop"
            MaximumRedirection = 0
        }

        if ($Body) {
            $params["Body"]        = ($Body | ConvertTo-Json)
            $params["ContentType"] = "application/json"
        }

        $resp = Invoke-WebRequest @params
        $status = [int]$resp.StatusCode
        $content = $resp.Content
    } catch {
        if ($_.Exception.Response) {
            $status  = [int]$_.Exception.Response.StatusCode
            try {
                $reader  = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                $content = $reader.ReadToEnd()
            } catch {
                $content = ""
            }
        } else {
            Write-Host "[$FAIL] $Label - network error: $($_.Exception.Message)"
            $script:failures++
            return
        }
    }

    $statusOk = $ExpectStatus -contains $status
    $containsOk = -not $ShouldNotContain -or ($content -notlike "*$ShouldNotContain*")
    $mustContainOk = -not $ShouldContain -or ($content -like "*$ShouldContain*")

    if ($statusOk -and $containsOk -and $mustContainOk) {
        Write-Host "[$PASS] $Label (HTTP $status)"
    } else {
        $reason = @()
        if (-not $statusOk)       { $reason += "expected HTTP $($ExpectStatus -join '/'), got $status" }
        if (-not $containsOk)     { $reason += "response body contains blocked string '$ShouldNotContain'" }
        if (-not $mustContainOk)  { $reason += "response body missing expected string '$ShouldContain'" }
        Write-Host "[$FAIL] $Label - $($reason -join '; ')"
        $script:failures++
    }
}

Write-Host ""
Write-Host "CinePurr Security Smoke Test"
Write-Host "Target: $BaseUrl"
Write-Host ("=" * 50)
Write-Host ""

# -----------------------------------------------------------------------
# 1. SSRF Guards - iptv-proxy must return 400 for all blocked targets
# -----------------------------------------------------------------------
Write-Host "[ SSRF / Proxy Hardening ]"

Test-Endpoint -Label "SSRF: block localhost"       `
    -Url "$BaseUrl/api/iptv-proxy?url=http://127.0.0.1/"          `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block 127.x alias"    `
    -Url "$BaseUrl/api/iptv-proxy?url=http://127.0.0.2/"          `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block AWS metadata"   `
    -Url "$BaseUrl/api/iptv-proxy?url=http://169.254.169.254/"     `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block 10.x private"   `
    -Url "$BaseUrl/api/iptv-proxy?url=http://10.0.0.1/"            `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block 192.168.x"      `
    -Url "$BaseUrl/api/iptv-proxy?url=http://192.168.1.1/"         `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block [::1] IPv6"     `
    -Url "$BaseUrl/api/iptv-proxy?url=http://[::1]/"               `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block own domain /admin" `
    -Url "$BaseUrl/api/iptv-proxy?url=$BaseUrl/api/admin/stats"    `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: block own domain /api/user" `
    -Url "$BaseUrl/api/iptv-proxy?url=$BaseUrl/api/user"           `
    -ExpectStatus @(400)

Test-Endpoint -Label "SSRF: missing url param"    `
    -Url "$BaseUrl/api/iptv-proxy"                                 `
    -ExpectStatus @(400)

Write-Host ""

# -----------------------------------------------------------------------
# 2. Account Enumeration - verify-user must return uniform response
# -----------------------------------------------------------------------
Write-Host "[ Account Enumeration ]"

$fakeUser = Test-Endpoint -Label "verify-user: nonexistent user (no 404)" `
    -Url "$BaseUrl/api/auth/verify-user" `
    -Method "POST" `
    -Body @{ username = "definitely_not_real_xyz"; email = "fake@nowhere.invalid" } `
    -ExpectStatus @(200) `
    -ShouldNotContain "No account found"

Write-Host ""

# -----------------------------------------------------------------------
# 3. Auth Gates - protected routes must require a session
# -----------------------------------------------------------------------
Write-Host "[ Auth Gates ]"

Test-Endpoint -Label "GET /api/user requires auth"          -Url "$BaseUrl/api/user"            -ExpectStatus @(401)
Test-Endpoint -Label "GET /api/notifications requires auth" -Url "$BaseUrl/api/notifications"   -ExpectStatus @(401)
Test-Endpoint -Label "GET /api/friends requires auth"       -Url "$BaseUrl/api/friends"         -ExpectStatus @(401)
Test-Endpoint -Label "GET /api/history requires auth"       -Url "$BaseUrl/api/history"         -ExpectStatus @(401)
Test-Endpoint -Label "GET /api/achievements requires auth"  -Url "$BaseUrl/api/achievements"    -ExpectStatus @(401)
Test-Endpoint -Label "PATCH room without auth (401)"        `
    -Url "$BaseUrl/api/rooms/does-not-exist" `
    -Method "PATCH" `
    -Body @{ name = "<script>xss</script>" } `
    -ExpectStatus @(401)

Write-Host ""

# -----------------------------------------------------------------------
# 4. Health Endpoint - must not leak NEXTAUTH_URL value
# -----------------------------------------------------------------------
Write-Host "[ Info Disclosure ]"

Test-Endpoint -Label "Health: no NEXTAUTH_URL value leaked" `
    -Url "$BaseUrl/api/health" `
    -ExpectStatus @(200, 500) `
    -ShouldNotContain "nextAuthUrl"

Write-Host ""

# -----------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------
Write-Host ("=" * 50)
if ($failures -eq 0) {
    Write-Host "[$PASS] All checks passed - deployment looks clean."
} else {
    Write-Host "[$FAIL] $failures check(s) failed - review output above before marking deploy complete."
    exit 1
}
