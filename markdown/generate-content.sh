#!/bin/sh

script_path=$(cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P)

WAL_COLORS=~/.cache/wal/colors

template_tag() {
  # TODO: Add support for '-l' flag in pywal and darken/lighten colors accordingly
  primary=$(sed '4q;d' $2)
  secondary=$(sed '3q;d' $2)
  background=$(sed '1q;d' $2)

  accent_text=$(pastel textcolor "$primary" | pastel format hex)
  default_text=$(pastel textcolor "$background" | pastel format hex)
  secondary_text=$(pastel lighten 0.2 "$secondary" | pastel format hex)
  content_text=$(pastel darken 0.1 "$default_text" | pastel format hex)
  line_number=$(pastel darken 0.35 "$default_text" | pastel format hex)
  background_light=$(pastel lighten 0.1 "$background" | pastel format hex)

  echo "\
<template \
data-wallpaper=\"url('../img/$1')\" \
data-color-border=\"$secondary\" \
data-color-background=\"${background}EE\" \
data-color-background-light=\"$background_light\" \
data-color-primary=\"$primary\" \
data-color-secondary=\"$secondary\" \
data-color-default-text=\"$default_text\" \
data-color-accent-text=\"$accent_text\" \
data-color-secondary-text=\"$secondary_text\" \
data-color-content-text=\"$content_text\" \
data-color-line-number=\"$line_number\" \
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
  sed -ri 's/^(\@icon) (.*)/cat ..\/assets\/font-awesome\/svgs\/\2.svg/e' /tmp/current.md
  WALLPAPER=$(grep "@wallpaper" $f | cut -d\  -f2)

  if [[ -n "$WALLPAPER" ]]; then
    if [ -f "../assets/img/$WALLPAPER" ]; then
      wal -c # remove all cached colors
      wal -n -s -t -e --saturate 0.4 -i ../assets/img/$WALLPAPER > /dev/null
      BLOCK=$(template_tag $WALLPAPER $WAL_COLORS)
      sed -ri "s|^(\@wallpaper) (.*)|$BLOCK|" /tmp/current.md
    else
      echo "$WALLPAPER not found in image folder ($f)"
      sed -ri "s/^(\@wallpaper) (.*)//" /tmp/current.md
    fi
  else
    echo "No wallpaper set for $FILENAME, using default"
  fi

  pandoc -i /tmp/current.md -f gfm -o ../$FILENAME.html
done

rm /tmp/current.md
