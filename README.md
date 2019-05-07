# Open Collective Images

[![Circle CI](https://circleci.com/gh/opencollective/opencollective-images/tree/master.svg?style=shield)](https://circleci.com/gh/opencollective/opencollective-images/tree/master)
[![Slack Status](https://slack.opencollective.org/badge.svg)](https://slack.opencollective.org)
[![Dependency Status](https://david-dm.org/opencollective/opencollective-images/status.svg)](https://david-dm.org/opencollective/opencollective-images)
[![Greenkeeper badge](https://badges.greenkeeper.io/opencollective/opencollective-images.svg)](https://greenkeeper.io/)

## Foreword

If you see a step below that could be improved (or is outdated), please update the instructions. We rarely go through this process ourselves, so your fresh pair of eyes and your recent experience with it, makes you the best candidate to improve them for other users. Thank you!

## Development

### Prerequisite

1. Make sure you have Node.js version >= 10. We recommend using version 10, the one used in CI and production.

- We recommend using [nvm](https://github.com/creationix/nvm): `nvm install && nvm use`.

2. Make sure you have [GraphicsMagick](http://www.graphicsmagick.org) installed.

- On Debian/Ubuntu: `sudo apt-get install graphicsmagick`
- On MacOS (with [Homebrew](https://brew.sh/)): `brew install graphicsmagick`

### Install

We recommend cloning the repository in a folder dedicated to `opencollective` projects.

```
git clone git@github.com:opencollective/opencollective-images.git opencollective/images
cd opencollective/images
npm install
```

### Environment variables

This project requires an access to the Open Collective API.

By default, it will try to connect to the Open Colllective staging API, **you don't have to change anything**.

If case you want to connect to the Open Collective API running locally:

- clone, install and start [opencollective-api](https://github.com/opencollective/opencollective-api)
- in this project, copy [`.env.local`](.env.local) to `.env`.

### Start

```
npm run dev
```

## Contributing

Code style? Commit convention? Please check our [Contributing guidelines](CONTRIBUTING.md).

TL;DR: we use [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/), we do like great commit messages and clean Git history.

## Tests

You can run the tests using `npm test`.

## Deployment

To deploy to staging or production, you need to be a core member of the Open Collective team.

### Staging (heroku)

```
npm run deploy:staging
```

- URL: https://images-staging.opencollective.com/

### Production (heroku)

```
npm run deploy:production
```

- URL: https://images.opencollective.com/
