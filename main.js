var lineHeight = 20;

var main = document.getElementById('content-wrapper');
// var content = document.getElementById('content');
var gutter = document.getElementById('gutter');
var scrollBlock = document.getElementById('scroll');

function generateLineNumbers() {
  var amount = Math.ceil(main.scrollHeight / lineHeight);

  for (var i = 1; i <= amount; i++) {
    var element = document.createElement('div');
    element.innerText = i;
    element.classList.add('line-number');
    gutter.appendChild(element);
  }
}

function adjustContentScrollHeight() {
  var remainder = main.scrollHeight % lineHeight;

  if (remainder !== 0) {
    var element = document.createElement('div');
    element.style.height = remainder + 'px';
    main.appendChild(element);
  }
}

generateLineNumbers();
adjustContentScrollHeight();

function scrollContent(amount) {
  if (amount > 0) {
    var treshold = main.scrollTop + (main.clientHeight - (main.clientHeight % lineHeight) + lineHeight);
    if (treshold > main.scrollHeight) {
      console.log(treshold);
      console.log(main.scrollHeight);
      // We only want to sroll even steps
      return;
    }
  }

  main.scrollBy(0, amount);

  if (main.scrollTop === 0) {
    scrollBlock.innerText = '0%';
  } else {
    scrollBlock.innerText = parseInt(main.scrollTop / (main.scrollHeight - main.clientHeight) * 100)+ '%';
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
