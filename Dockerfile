FROM node:24@sha256:40ad9f3064e67d6860b4bc3fe1880b2953934fd6320ada990e45fe0efa6badd7

RUN apt-get update -y && apt-get install -y graphicsmagick

WORKDIR /usr/src/frontend

COPY package*.json ./

RUN npm install --unsafe-perm

COPY . .

ARG PORT=3000
ENV PORT $PORT

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG API_URL=https://api-staging.opencollective.com
ENV API_URL $API_URL

ARG IMAGES_URL=https://images-staging.opencollective.com
ENV IMAGES_URL $IMAGES_URL

ARG API_KEY=09u624Pc9F47zoGLlkg1TBSbOl2ydSAq
ENV API_KEY $API_KEY

RUN npm run build

EXPOSE $PORT

CMD [ "npm", "run", "start" ]
