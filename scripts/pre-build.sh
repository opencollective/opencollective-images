TMP_DIR=$(pwd)

for file in $(grep -rl /usr/local ${TMP_DIR}/vendor/vips/lib/pkgconfig)
do
  sed -i "s+/usr/local+${TMP_DIR}/vendor+g" $file
done
