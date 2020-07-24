const lineHeight = 20;
const mobileBreakpoint = 780;
const tabs = ['index.html', 'johan.html', 'fredrik.html', 'pywalfox.html', 'contact.html'];
const modes = {
  normal: 'NORMAL',
  command: 'COMMAND',
};

const tabbar = document.getElementById('tabbar');
const main = document.getElementById('content-wrapper');
const content = document.getElementById('content');
const gutter = document.getElementById('gutter');
const scrollBlock = document.getElementById('scroll');
const modeBlock = document.getElementById('mode');
const commandInput = document.getElementById('command-input');
const keyBlock = document.getElementById('keybinding-display');
const fileBlock = document.getElementById('file');

var currentMode = modes.command;
var keypresses = '';
var currentTab = null;
var previousTab = null;
var selectedTabElement = null;
var tabElements = [];
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

function generateTabs() {
  tabs.forEach((tab, index) => {
    const tabId = index + 1;
    const extensionStartIndex = tab.indexOf('.');
    const tabName = tab.substr(0, extensionStartIndex);
    const tabExtension = tab.substr(extensionStartIndex);

    const element = document.createElement('button');
    const tabData = [tabId, tabName, tabExtension];

    tabData.forEach((data) => {
      const span = document.createElement('span');
      span.innerText = data;
      element.appendChild(span);
    });

    element.classList.add('tab');
    element.addEventListener('click', () => goToTab(tabId));

    tabbar.appendChild(element);
    tabElements.push(element);
  });
}

function updateSelectedTab() {
  const selectedTab = tabElements[currentTab-1];

  if (!selectedTab) {
    return;
  }

  if (selectedTabElement !== null) {
    selectedTabElement.classList.remove('tab-active');
  }

  selectedTab.classList.add('tab-active');
  selectedTabElement = selectedTab;
}

function openContentPage(path) {
  // Fetches an html file and inserts the content into the page
  fetch('content/' + path)
    .then((response) => {
      return response.text();
    })
    .then((html) => {
      content.innerHTML = html;
      updateSelectedTab();
      updateFilenameBlock();
      updateLineNumbers(); // Generate temporary line numbers
      resetScrollBlock();
      waitForMediaToLoad();
    })
    .catch((error) => {
      console.error(error);
    });
}

function adjustLineOverflow(elementHeight, callback) {
  // If adjustment is needed to align with the lines,
  // send the amount in pixels to callback for adjustment
  const remainder = elementHeight % lineHeight;
  if (remainder !== 0) {
    callback(remainder);
  }
}

function updateMediaHeight(element) {
  adjustLineOverflow(element.clientHeight, (remainder) => {
    const parentElement = element.parentElement;
    var newHeight = (element.clientHeight - remainder);
    var newHeightPx = newHeight + 'px';

    if (newHeight < lineHeight) {
      newHeightPx = lineHeight + 'px';
    }

    if (parentElement.tagName === 'P') {
      parentElement.style.lineHeight = '0px';
    }

    element.style.height = newHeightPx;
  });
}

function outerHeight(element) {
  // https://stackoverflow.com/questions/10787782/full-height-of-a-html-element-div-including-border-padding-and-margin
  const height = element.offsetHeight;
  const style = window.getComputedStyle(element);

  return ['top', 'bottom']
    .map(side => parseInt(style[`margin-${side}`]))
    .reduce((total, side) => total + side, height);
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
  for (const element of media) {
    listeners.push(new Promise((resolve, _) => {
      const listenEvent = element.tagName === 'VIDEO' ? 'loadedmetadata' : 'load';
      element.addEventListener(listenEvent, () => {
        updateMediaHeight(element);
        resolve();
      });
    }));
  }

  Promise.all(listeners)
    .then(() => {
      updateLineNumbers();
    });
}

function getCurrentTabId() {
  const path = window.location.pathname
  const filename = path.substring(path.lastIndexOf('/') + 1);
  const tabIndex = tabs.indexOf(filename);

  if (tabIndex >= 0) {
    return tabIndex + 1;
  }

  return -1;
}

function initialize() {
  const tabId = getCurrentTabId();
  if (tabId !== -1) {
    goToTab(tabId);
  } else {
    goToTab(1);
  }

  generateTabs();
  updateMode(modes.normal);
}

function updateFilenameBlock() {
  fileBlock.innerText = tabs[currentTab-1];
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
    commandInput.value = ':';
  }
}

function executeCommand() {
  var command = commandInput.value.substr(1);
  console.log(command);
  updateMode(modes.normal);
}

function resetKeyBlock() {
  keyBlock.innerText = '';
  keypresses = '';
}

function scrollContentToTop() {
  main.scrollTo(0, 0);
}

function scrollContentToBottom() {
  main.scrollTo(0, main.scrollHeight);
}

function resetScrollBlock() {
  scrollBlock.innerText = '0%';
  getScrollableContentElement().scrollTo(0, 0);
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
  } else {
    scrollBlock.innerText = Math.abs(parseInt(scrollAmount / (scrollHeight - main.clientHeight) * 100)) + '%';
  }
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

function goToTab(tab, saveHistory=true) {
  if (tab <= 0 || tab > tabs.length) {
    console.error('Invalid tab id: ', tab);
    return;
  }

  const filename = tabs[tab-1];
  if (tab !== currentTab && saveHistory) {
    window.history.pushState({ tabId: tab }, '', filename);
  }

  // Update the global variables before opening the content page
  // so that they can be used when the html has loaded.
  previousTab = currentTab === null ? tab : currentTab;
  currentTab = tab;

  openContentPage(filename);
}

function commandModeKeybindings(key) {
  switch (key) {
    case 'Enter':
      commandInput.value !== '' && commandInput.value !== ':' && executeCommand();
      break;
  }
}

function isNumber(keys) {
  return !Object.is(parseInt(keys), NaN);
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
      if (keypresses.slice(-1) === 'g') {
        if (keypresses.length > 1 && isNumber(tabNumber)) {
          goToTab(tabNumber);
        } else {
          previousTab !== null && goToTab(previousTab);
        }
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

document.addEventListener('keydown', (e) => {
  const key = e.key;

  if (key === 'Escape' || key === 'CapsLock') {
    updateMode(modes.normal);
  } else if (key === ':') {
    updateMode(modes.command);
  } else {
    currentMode === modes.normal ? normalModeKeybindings(key) : commandModeKeybindings(key);
  }
});

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
    element.parentElement.style.height = null;
    element.style.height = null;
    updateMediaHeight(element)
  });

  updateLineNumbers();
}, 250));

window.addEventListener('popstate', (e) => {
  var tabId = e.state.tabId;

  /* Try to fetch the target tabId from history state first.
   * If it does not exists, try getting an index from the pathname.
   * If no tab id can be found, display the index page
   */
  if (tabId) {
    goToTab(tabId, false);
  } else {
    tabId = getCurrentTabId();
    if (tabId !== -1) {
      goToTab(tabId, false);
    } else {
      goToTab(1, false);
    }
  }
});

// Different elements are being scrolled based on the current device and window size
window.addEventListener('scroll', handleScrollEvent);
main.addEventListener('scroll', handleScrollEvent);

initialize();
