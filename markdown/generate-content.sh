#!/bin/sh

for f in *.md
do
  FILENAME="${f%%.md}"
  sed -ri 's/^(\@ascii) (.*)/echo "<pre data-type=\"\1\">"; toilet -f mono12 \2; echo "<\/pre>"/e' $f
  pandoc -i $f -f gfm -o ../content/$FILENAME.html
done

