@echo off
set NODE_HOME=C:\Users\nhiennguyen\Node
set PATH=%NODE_HOME%;%PATH%

echo.
echo Starting server...
"%NODE_HOME%\node.exe" server.js
