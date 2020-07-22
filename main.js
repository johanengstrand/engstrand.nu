var lineHeight = 20;

var content = document.getElementById('content');
var gutter = document.getElementById('gutter');
var scrollBlock = document.getElementById('scroll');

function generateLineNumbers() {
  var amount = Math.ceil(content.scrollHeight / lineHeight);

  for (var i = 1; i <= amount; i++) {
    var element = document.createElement('div');
    element.innerText = i;
    element.classList.add('line-number');
    gutter.appendChild(element);
  }
}

generateLineNumbers();

function scrollContent(amount) {
  if (
    ((content.scrollTop + content.clientHeight + lineHeight + 3) >= content.scrollHeight ||
    (gutter.scrollTop + content.clientHeight + lineHeight) >= content.scrollHeight) &&
    amount > 0
  ) {
    // We only want to sroll even steps
    return;
  }

  content.scrollBy(0, amount);
  gutter.scrollBy(0, amount);

  if (content.scrollTop === 0) {
    scrollBlock.innerText = '0%';
  } else {
    scrollBlock.innerText = parseInt(content.scrollTop / (content.scrollHeight - content.clientHeight) * 100)+ '%';
  }
}

window.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'j':
      scrollContent(lineHeight);
      break;
    case 'k':
      scrollContent(-lineHeight);
      break;
  }
});
