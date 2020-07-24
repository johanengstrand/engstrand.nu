#!/bin/sh

for f in *.md
do
  FILENAME="${f%%.md}"
  pandoc -i $f --filter pandoc-run-filter -o ../content/$FILENAME.html
done

