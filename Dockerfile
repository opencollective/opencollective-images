FROM node:24@sha256:3d27e5c11e5786e309ec3e03f93ae536eb36e6e5eb3714d5eb3300a36157add0

WORKDIR /usr/src/images

COPY package*.json .npmrc ./

RUN npm ci

COPY . .

RUN npm run build

ARG PORT=3001
ENV PORT=$PORT

ENV NODE_ENV=production

EXPOSE $PORT

CMD [ "npm", "run", "start" ]
