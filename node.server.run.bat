start "My Node Server" cmd /k "npx serve"
powershell -Command "do { Start-Sleep -Milliseconds 500 } until (Test-NetConnection -ComputerName localhost -Port 3000).TcpTestSucceeded"
start http://localhost:3000
