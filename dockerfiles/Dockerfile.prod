FROM node:lts-alpine as base

# Install dependencies only
FROM base as deps
RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm
WORKDIR /usr/src/app
COPY ../. .
RUN pnpm i --frozen-lockfile
RUN pnpm build

# Production image
FROM base as prod
RUN npm i -g serve
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/dist ./dist
COPY --from=deps /usr/src/app/package.json ./package.json
EXPOSE 3000
ENTRYPOINT [ "npm", "run" ]
CMD [ "serve" ]