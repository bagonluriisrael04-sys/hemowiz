#!/usr/bin/env python3
"""
HemoWiz Local Development & Deployment Server
Launches a lightweight HTTP server on http://localhost:8000
Required for Web Bluetooth API (navigator.bluetooth) which requires a secure origin.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class HemoWizHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", PORT), HemoWizHTTPHandler) as httpd:
        url = f"http://localhost:{PORT}/index.html"
        print("=" * 65)
        print("   [+] HemoWiz Non-Invasive Hemoglobin Monitor Web Server")
        print("=" * 65)
        print(f" Serving directory : {DIRECTORY}")
        print(f" Web App URL       : {url}")
        print(f" Web Bluetooth     : ENABLED (localhost secure context)")
        print("=" * 65)
        print(" Press Ctrl+C in this terminal window to stop the server.\n")
        
        # Open default browser
        webbrowser.open(url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down HemoWiz server. Goodbye!")
            httpd.server_close()
            sys.exit(0)

if __name__ == "__main__":
    main()
