#!/bin/sh

for f in *.md
do
  FILENAME="${f%%.md}"
  cp $f /tmp/current.md
  sed -ri 's/^(\@ascii) (.*)/echo "<pre data-type=\\"\1\\">"; echo "<pre>"; toilet -f mono12 \2; echo "<\/pre>"; echo "<h1>\2<\/h1>"; echo "<\/pre>"/e' /tmp/current.md
  sed -ri 's/^(\@icon) (.*)/cat ..\/font-awesome\/svgs\/\2.svg/e' /tmp/current.md
  pandoc -i /tmp/current.md -f gfm -o ../content/$FILENAME.html
done

rm /tmp/current.md
