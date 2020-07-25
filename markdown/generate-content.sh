#!/bin/sh

script_path=$(cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P)

WAL_COLORS=~/.cache/wal/colors

template_tag() {
  echo "\
<template \
data-wallpaper=\"url('../img/$1')\" \
data-color-window=\"$(sed '1q;d' $2)EE\" \
data-color-primary=\"$(sed '2q;d' $2)\" \
data-color-secondary=\"$(sed '3q;d' $2)\" \
data-color-default-text=\"$(sed '4q;d' $2)\" \
data-color-accent-text=\"$(sed '5q;d' $2)\" \
data-color-light-text=\"$(sed '6q;d' $2)\" \
data-color-secondary-text=\"$(sed '7q;d' $2)\" \
data-color-border=\"$(sed '8q;d' $2)\" \
> \
</template>
"
  }

cd "$script_path"

for f in *.md
do
  FILENAME="${f%%.md}"
  cp $f /tmp/current.md

  sed -ri 's/^(\@ascii) (.*)/echo "<pre data-type=\\"\1\\">"; echo "<pre>"; toilet -f mono12 \2; echo "<\/pre>"; echo "<h1>\2<\/h1>"; echo "<\/pre>"/e' /tmp/current.md
  sed -ri 's/^(\@icon) (.*)/cat ..\/font-awesome\/svgs\/\2.svg/e' /tmp/current.md
  WALLPAPER=$(grep "@wallpaper" $f | cut -d\  -f2)

  if [[ -n "$WALLPAPER" ]]; then
    if [ -f "../img/$WALLPAPER" ]; then
      wal -n -s -t -e -i ../img/$WALLPAPER > /dev/null
      BLOCK=$(template_tag $WALLPAPER $WAL_COLORS)
      sed -ri "s|^(\@wallpaper) (.*)|$BLOCK|" /tmp/current.md
    else
      echo "$WALLPAPER not found in image folder ($f)"
    fi
  else
    echo "No wallpaper set for $FILENAME, using default"
  fi

  pandoc -i /tmp/current.md -f gfm -o ../content/$FILENAME.html
done

rm /tmp/current.md
