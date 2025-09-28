#!/bin/bash

git pull

pnpm install

pnpm build

pm2 restart discord-bot