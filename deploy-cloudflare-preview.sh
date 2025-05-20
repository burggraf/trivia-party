#!/bin/bash
npm run build && \
wrangler pages deploy build --project-name trivia-party
