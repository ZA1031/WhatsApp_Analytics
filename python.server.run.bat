start "My Python Server" cmd /k "python -m http.server 3000"
powershell -Command "do { Start-Sleep -Milliseconds 500 } until (Test-NetConnection -ComputerName localhost -Port 3000).TcpTestSucceeded"
start http://localhost:3000
