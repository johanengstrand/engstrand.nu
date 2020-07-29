const lineHeight = 20;
const mobileBreakpoint = 780;
const modes = { normal: 'NORMAL', command: 'COMMAND' };
const tabs = [ 'index.html', 'johan.html', 'fredrik.html', 'pywalfox.html', 'contact.html' ];
const themeData = [
  { variable: '--wallpaper', attribute: 'data-wallpaper' },
  { variable: '--color-border', attribute: 'data-color-border' },
  { variable: '--color-background', attribute: 'data-color-background' },
  { variable: '--color-background-light', attribute: 'data-color-background-light' },
  { variable: '--color-primary', attribute: 'data-color-primary' },
  { variable: '--color-secondary', attribute: 'data-color-secondary' },
  { variable: '--color-default-text', attribute: 'data-color-default-text' },
  { variable: '--color-accent-text', attribute: 'data-color-accent-text' },
  { variable: '--color-secondary-text', attribute: 'data-color-secondary-text' },
  { variable: '--color-content-text', attribute: 'data-color-content-text' },
  { variable: '--color-line-number', attribute: 'data-color-line-number' },
];

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
var tabElements = {};
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

    [tabId, tabName, tabExtension].forEach((data) => {
      const span = document.createElement('span');
      span.innerText = data;
      element.appendChild(span);
    });

    element.classList.add('tab');
    element.addEventListener('click', () => goToTab(tabId));

    tabbar.appendChild(element);

    // Add to list for faster access when switching tabs
    tabElements[tabId] = element;
  });
}

function updateSelectedTab() {
  const selectedTab = tabElements[currentTab];

  if (!selectedTab) {
    return;
  }

  if (selectedTabElement !== null) {
    selectedTabElement.classList.remove('tab-active');
  }

  selectedTab.classList.add('tab-active');
  selectedTabElement = selectedTab;
}

function updateColorVariables() {
  const template = content.querySelector('template');

  if (template) {
    document.body.classList.remove('default-theme');
    themeData.forEach((obj) => {
      document.body.style.setProperty(obj.variable, template.getAttribute(obj.attribute));
    });
  } else {
    document.body.classList.add('default-theme');
    document.body.style = null;
  }
}

function openContentPage(path) {
  // Fetches an html file and inserts the content into the page
  fetch('content/' + path)
    .then((response) => {
      return response.text();
    })
    .then((html) => {
      content.innerHTML = html;
      updateColorVariables();
      waitForMediaToLoad();
      updateSelectedTab();
      updateLineNumbers(); // Generate temporary line numbers
      updateFilenameBlock();
      applyLineHeightFixes();
      scrollContentToTop();
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

function applyLineHeightFixes() {
  // Applies the line height fix to all other required elements except 'img' and 'video'
  document.querySelectorAll('svg').forEach((element) => applyLineHeightFix(element.parentElement));
}

function applyLineHeightFix(parentElement) {
  if (parentElement.tagName === 'P') {
    // Fixes an issue where the p-tag would be a few pixels taller than the actual content
    parentElement.style.lineHeight = '0px';
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
    var newHeight = element.clientHeight - remainder;

    if (newHeight < lineHeight) {
      newHeight = lineHeight;
    }

    if (parentElement.innerText.length > 0) {
      applyLineHeightFix(parentElement, 'temporary-line-height-fix');
    } else {
      applyLineHeightFix(parentElement);
    }

    element.style.height = newHeight + 'px';
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
  media.forEach((element) => {
    const promise = new Promise((resolve, reject) => {
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

function getCurrentTabIdFromPathname() {
  const path = window.location.pathname;
  const tabIndex = tabs.indexOf(path.substring(path.lastIndexOf('/') + 1));

  return tabIndex >= 0 ? (tabIndex + 1) : -1;
}

function initialize() {
  const tabId = getCurrentTabIdFromPathname();

  tabId !== -1 ? goToTab(tabId) : goToTab(1);
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
      if (commandInput.value === '' || commandInput.value === ':') {
        updateMode(modes.normal);
      } else {
        executeCommand();
      }
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

  // TODO: When resizing and switching between mobile/desktop layouts, the scroll position is reset
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
    tabId = getCurrentTabIdFromPathname();
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
