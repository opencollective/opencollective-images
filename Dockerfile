FROM node:24@sha256:64af3819f9275802414d7cdc38c27e9d82bd564dec4d4da87d008255d36c63b4

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
