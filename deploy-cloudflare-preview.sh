#!/bin/bash
npm run build && \
wrangler pages deploy build
