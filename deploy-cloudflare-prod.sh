#!/bin/bash
npm run build && \
wrangler pages deployment create build --project-name trivia-party
