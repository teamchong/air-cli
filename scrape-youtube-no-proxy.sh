#!/bin/bash

# Temporarily unset proxy variables for this process only
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy
# Keep NO_PROXY as is

# Run the Node.js script
node scrape-youtube.js
