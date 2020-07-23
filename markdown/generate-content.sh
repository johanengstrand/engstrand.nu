#!/bin/sh

for f in *.md
do
  FILENAME="${f%%.md}"
  pandoc -f gfm $f -o ../content/$FILENAME.html
done

