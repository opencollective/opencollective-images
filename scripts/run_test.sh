#!/bin/bash

echo "> Starting api server"
if [ -z "$API_FOLDER" ]; then
  cd ~/api
else
  cd $API_FOLDER
fi
npm start &
API_PID=$!
cd -

echo "> Starting images server"
if [ -z "$IMAGES_FOLDER" ]; then
  cd ~/images
else
  cd $IMAGES_FOLDER
fi
npm start &
IMAGES_PID=$!
cd -

# Wait for a service to be up
function wait_for_service() {
  echo "> Waiting for $1 to be ready... "
  while true; do
    nc -z "$2" "$3"
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      echo "> Application $1 is up!"
      break
    fi
    sleep 1
  done
}

echo ""
wait_for_service API 127.0.0.1 3060
echo ""
wait_for_service IMAGES 127.0.0.1 3001

echo ""
echo "> Starting server jest tests"
TZ=UTC npx jest test/server/*
RETURN_CODE=$?
if [ $RETURN_CODE -ne 0 ]; then
  echo "Error with jest tests, exiting"
  exit 1;
fi
echo ""

echo "Killing all node processes"
kill $API_PID;
kill $IMAGES_PID;
echo "Exiting with code $RETURN_CODE"
exit $RETURN_CODE
