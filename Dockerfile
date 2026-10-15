FROM node:24

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
