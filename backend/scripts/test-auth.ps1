$ErrorActionPreference = 'Stop'

# Register
$body = @{ nama='Test User'; email='testuser@example.com'; password='password'; role='PEMINJAM' } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri 'http://localhost:3002/auth/register' -Method Post -Body $body -ContentType 'application/json'
  Write-Output "REGISTER_OK"
  $r | ConvertTo-Json -Depth 5 | Write-Output
} catch {
  Write-Output "REGISTER_ERROR"
  Write-Output $_.Exception.Message
}

# Login with session to capture cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email='testuser@example.com'; password='password' } | ConvertTo-Json
try {
  $r = Invoke-RestMethod -Uri 'http://localhost:3002/auth/login' -Method Post -Body $body -ContentType 'application/json' -WebSession $session
  Write-Output "LOGIN_OK"
  $r | ConvertTo-Json -Depth 5 | Write-Output
  Write-Output "COOKIES:"
  $session.Cookies.GetCookies('http://localhost:3002') | ForEach-Object { $_.ToString() }
} catch {
  Write-Output "LOGIN_ERROR"
  Write-Output $_.Exception.Message
}
