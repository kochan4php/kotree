<h1 align="center">🌟 Kotree 🌟</h1>

## Setup local project

```bash
# cloning this project
git clone https://github.com/kochan4php/kotree.git

# go to the project folder
cd kotree

# install pnpm if you don't have it
npm install -g pnpm

# install dependencies
pnpm install

# run server app
pnpm dev
```

## Setup production project with docker compose

```bash
# cloning this project
git clone https://github.com/kochan4php/kotree.git

# go to the project folder
cd kotree

# run docker compose using pnpm
pnpm docker:up

# after run docker:up command, now open the url in :
http://localhost:3000
```
