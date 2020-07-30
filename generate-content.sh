#!/bin/sh

WAL_COLORS=~/.cache/wal/colors

generate_theme_css() {
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
body { \
--wallpaper: url('../assets/img/$1'); \
--color-border: $secondary; \
--color-background: ${background}EE; \
--color-background-light: $background_light; \
--color-primary: $primary; \
--color-secondary: $secondary; \
--color-default-text: $default_text; \
--color-accent-text: $accent_text; \
--color-secondary-text: $secondary_text; \
--color-content-text: $content_text; \
--color-line-number: $line_number; \
} \
  "
}

cd markdown/

for f in *.md
do
  FILENAME="${f%%.md}"
  WALLPAPER=$(grep "@wallpaper" $f | cut -d\  -f2)

  cp $f /tmp/current.md
  cp ../templates/index.template ../$FILENAME.html

  # markdown filters
  sed -ri 's/^(\@ascii) (.*)/echo "<pre data-type=\\"\1\\">"; echo "<pre>"; toilet -f mono12 \2; echo "<\/pre>"; echo "<h1>\2<\/h1>"; echo "<\/pre>"/e' /tmp/current.md
  sed -ri 's/^(\@icon) (.*)/cat ..\/assets\/font-awesome\/svgs\/\2.svg/e' /tmp/current.md

  if [[ -n "$WALLPAPER" ]]; then
    sed -ri "s/^(\@wallpaper) (.*)//" /tmp/current.md # remove keyword
    if [ -f "../assets/img/$WALLPAPER" ]; then
      wal -c # remove all cached colors
      wal -n -s -t -e --saturate 0.4 -i ../assets/img/$WALLPAPER > /dev/null
    else
      echo "$WALLPAPER not found in image folder ($f)"
    fi
  else
    echo "No wallpaper set for $FILENAME, using default"
  fi

  pandoc -i /tmp/current.md -f gfm -t html -o /tmp/current.html

  # html filters
  sed -i "s/\@title/$FILENAME.html/g" ../$FILENAME.html
  sed -i '/\@content/{
    s/\@content//
    r /tmp/current.html
  }' ../$FILENAME.html

  if [ ! -z "$WALLPAPER" ]; then
    echo "Generating theme for $FILENAME"
    RULES=$(generate_theme_css $WALLPAPER $WAL_COLORS)
    sed -i "s|\@theme|$RULES|" ../$FILENAME.html
  fi
done

rm /tmp/current.md
rm /tmp/current.html
