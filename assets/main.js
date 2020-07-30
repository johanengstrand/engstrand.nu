const lineHeight = 20;
const mobileBreakpoint = 780;
const modes = { normal: 'NORMAL', command: 'COMMAND' };

const main = document.getElementById('content-wrapper');
const content = document.getElementById('content');
const gutter = document.getElementById('gutter');
const scrollBlock = document.getElementById('scroll');
const modeBlock = document.getElementById('mode');
const commandInput = document.getElementById('command-input');
const keyBlock = document.getElementById('keybinding-display');

var currentMode = modes.command;
var keypresses = '';
var ticking = false;

// https://remysharp.com/2010/07/21/throttling-function-calls
function debounce(fn, delay) {
  var timer = null;
  return function () {
    var context = this, args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(context, args);
    }, delay);
  };
}

function outerHeight(element) {
  // https://stackoverflow.com/questions/10787782/full-height-of-a-html-element-div-including-border-padding-and-margin
  const height = element.offsetHeight;
  const style = window.getComputedStyle(element);

  return ['top', 'bottom']
    .map(side => parseInt(style[`margin-${side}`]))
    .reduce((total, side) => total + side, height);
}

function isNumber(keys) {
  return !Object.is(parseInt(keys), NaN);
}

function adjustLineOverflow(elementHeight, callback) {
  // If adjustment is needed to align with the lines,
  // send the amount in pixels to callback for adjustment
  const remainder = elementHeight % lineHeight;

  if (remainder !== 0) {
    callback(remainder);
  }
}

function applyLineHeightFix(parentElement, className='line-height-fix') {
  if (parentElement.tagName === 'P') {
    // Fixes an issue where the p-tag would be a few pixels taller than the actual content
    parentElement.classList.add(className);
  }
}

function updateMediaHeight(element) {
  adjustLineOverflow(element.clientHeight, (remainder) => {
    const parentElement = element.parentElement;
    const adjustedHeight = Math.max(lineHeight, element.clientHeight - remainder);

    applyLineHeightFix(parentElement, parentElement.innerText.length > 0 ? 'temporary-line-height-fix' : null);
    element.style.height = `${adjustedHeight}px`;
  });
}

function calculateRealContentHeight() {
  // If the content overflows, we can simply return the scrollHeight, since that is real content height
  if (content.scrollHeight > content.clientHeight) {
    return content.scrollHeight;
  }

  // Otherwise, calculate the height of the children and generate lines based on that
  return Array.from(content.children).reduce((total, child) => total + outerHeight(child), 0);
}

function createLineNumberElement(number) {
  const element = document.createElement('div');

  element.innerText = number;
  element.classList.add('line-number');

  return element;
}

function updateLineNumbers() {
  // TODO: Optimze this function
  gutter.innerHTML = '';

  const contentHeight = calculateRealContentHeight();
  const amount = Math.ceil(contentHeight / lineHeight);

  for (var i = 1; i <= amount; i++) {
    gutter.appendChild(createLineNumberElement(i));
  }
}

function waitForMediaToLoad() {
  // Attaches an event-listener to each image in the loaded html file and
  // generates the line numbers when they have all loaded.
  const media = content.querySelectorAll('img, video');
  var listeners = [];

  // Create a list of promises
  media.forEach((element) => {
    const promise = new Promise((resolve, _) => {
      const listenEvent = element.tagName === 'VIDEO' ? 'loadedmetadata' : 'load';
      element.addEventListener('error', resolve); // we do not actually care about the error
      element.addEventListener(listenEvent, () => {
        updateMediaHeight(element);
        resolve();
      });
    });

    listeners.push(promise);
  });

  Promise.all(listeners).then(updateLineNumbers);
}

function updateMode(mode) {
  modeBlock.innerText = mode;
  currentMode = mode;

  if (mode === modes.normal) {
    commandInput.disabled = true;
    commandInput.value = '';
    commandInput.blur();
  } else {
    commandInput.disabled = false;
    commandInput.focus();
  }
}

function goToTab(tabId) {
  const tab = document.querySelector(`.tab[data-id=${tabId}]`);

  if (!tab) {
    console.error(`Could not find tab with id: ${tabId}`);
    return;
  }

  /* use 'window.location.href' to simulate clicking a link */
  window.location.href = tab.href;
}

function executeCommand() {
  // TODO: Add commands for command mode
  var command = commandInput.value.substr(1);
  console.log(command);
  updateMode(modes.normal);
}

function resetKeyBlock() {
  keyBlock.innerText = '';
  keypresses = '';
}

function scrollContentToTop() {
  getScrollableContentElement().scrollTo(0, 0);
}

function scrollContentToBottom() {
  /* We can use 'main.scrollHeight' since that element contains all the content
   * on both mobile and desktop.
   */
  getScrollableContentElement().scrollTo(0, main.scrollHeight);
}

function resetScrollBlock() {
  scrollBlock.innerText = '0%';
}

function getScrollableContentElement() {
  // TODO: Add condition for 'window.innerWidth' when 'devicePixelRatio' is 2
  if (window.innerWidth <= mobileBreakpoint || window.devicePixelRatio === 2) {
    return window;
  }

  return main;
}

function updateScrollBlock() {
  /* Different elements are scrolled based on device and window size.
   * 'window' does not have the 'scrollTop' and 'scrollHeight' properties, so
   * we must use 'scrollY' and 'innerHeight' instead.
   */
  const element = getScrollableContentElement();
  const scrollAmount = element.scrollTop !== undefined ? element.scrollTop : element.scrollY;
  const scrollHeight = element.scrollHeight !== undefined ? element.scrollHeight : element.innerHeight;

  if (scrollAmount === 0) {
    resetScrollBlock();
    return;
  }

  const scrollPercent = Math.abs(parseInt(scrollAmount / (scrollHeight - main.clientHeight) * 100));
  scrollBlock.innerText = `${scrollPercent}%`;
}

function scrollContent(amount) {
  if (keypresses.length > 0) {
    if (!isNumber(keypresses)) {
      return;
    }

    // TODO: I think parseInt() simply ignores letters, which is not ideal
    amount *= parseInt(keypresses);
    resetKeyBlock();
  }

  window.scrollBy(0, amount);
  getScrollableContentElement().scrollBy(0, amount);
}

function updateKeyBlock(key) {
  keypresses += key;
  keyBlock.innerText = keypresses;
}

function commandModeKeybindings(key) {
  switch (key) {
    case 'Enter':
      if (commandInput.value === '' || commandInput.value === ':') {
        updateMode(modes.normal);
      } else {
        executeCommand();
      }
      break;
  }
}

function normalModeKeybindings(key) {
  // Check if the key is a number and add it to the repeat count.
  // This is used when we want to repeat a binding multiple times, e.g '10k'.
  if (isNumber(key) && (keypresses.length === 0 || isNumber(keypresses))) {
    updateKeyBlock(key);
    return;
  }

  var foundBinding = true;
  var reset = true;
  switch (key) {
    case 'j':
      scrollContent(lineHeight);
      break;
    case 'k':
      scrollContent(-lineHeight);
      break;
    case 'g':
      if (keypresses === 'g') {
        scrollContentToTop();
      } else {
        updateKeyBlock(key);
        reset = false;
      }
      break;
    case 'G':
      if (keypresses.length === 0) {
        scrollContentToBottom();
      }
      break;
    case 't':
      const tabNumber = keypresses.substr(0, keypresses.length - 1);
      if (keypresses.length > 1 && keypresses.slice(-1) === 'g' && isNumber(tabNumber)) {
        goToTab(tabNumber);
      }
      break;
    case 'Shift':
      reset = false;
      break;
    default:
      foundBinding = false;
      break;
  }

  // Reset the key-sequence if no binding was found for the pressed key and we did not prevent it.
  if (reset || !foundBinding) {
    resetKeyBlock();
  }
}

function handleScrollEvent() {
  // Updates the scroll block when scrolling using both mouse and j/k
  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateScrollBlock();
      ticking = false;
    });

    ticking = true;
  }
}

function initialize() {
  updateMode(modes.normal);
}

// Different elements are being scrolled based on the current device and window size
window.addEventListener('scroll', handleScrollEvent);
main.addEventListener('scroll', handleScrollEvent);

window.addEventListener('resize', debounce(() => {
  /* Media height is calculated on load and if you resize the window,
   * the media will shrink (because of the object-fit: contain property)
   * but the reserved space will not, causing huge amounts of whitespace.
   *
   * Therefore, we must recalculate the height to match the line height
   * when the user resizes the window.
   */
  const media = document.querySelectorAll('img, video');
  media.forEach((element) => {
    updateMediaHeight(element)
  });

  // TODO: When resizing and switching between mobile/desktop layouts, the scroll position is reset
  updateLineNumbers();
}, 250));

document.addEventListener('keydown', (e) => {
  const key = e.key;

  switch (key) {
    case 'Escape': /* fallthrough */
    case 'CapsLock':
      updateMode(modes.normal);
      break;
    case ':':
      updateMode(modes.command);
      break;
    default:
      currentMode === modes.normal ? normalModeKeybindings(key) : commandModeKeybindings(key);
      break;
  }
});

initialize();
