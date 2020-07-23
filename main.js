const lineHeight = 20;
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
var scrollPosition;
var ticking = false;

function generateTabs() {
  tabs.forEach((tab, index) => {
    const tabId = index + 1;
    const element = document.createElement('button');

    element.classList.add('tab');
    element.innerText = tabId + ' ' + tab;
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
      generateLineNumbers(); // Generate temporary line numbers
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

function updateContentScrollHeight() {
  // Images and other content may not be an exact multiple of lineHeight
  // and will cause the scroll block to not go to exactly 100%.
  adjustLineOverflow(main.scrollHeight, (remainder) => {
    const element = document.createElement('div');
    element.style.height = (lineHeight - remainder) + 'px';
    gutter.appendChild(element);
  });
}

function updateMediaHeight(element) {
  adjustLineOverflow(element.clientHeight, (remainder) => {
    const originalWidth = element.clientWidth + 'px';
    const newHeight = (element.clientHeight - remainder) + 'px';
    const parentElement = element.parentElement;

    if (parentElement.tagName === 'P') {
      parentElement.style.height = newHeight;
    }

    element.style.height = newHeight;
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

function generateLineNumbers() {
  // Reset the gutter
  gutter.innerHTML = '';

  const contentHeight = calculateRealContentHeight();
  const amount = Math.ceil(contentHeight / lineHeight);

  for (var i = 1; i <= amount; i++) {
    const element = document.createElement('div');
    element.innerText = i;
    element.classList.add('line-number');
    gutter.appendChild(element);
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
      generateLineNumbers();
      updateContentScrollHeight();
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
}

function updateScrollBlock() {
  if (main.scrollTop === 0) {
    resetScrollBlock();
  } else {
    scrollBlock.innerText = parseInt(main.scrollTop / (main.scrollHeight - main.clientHeight) * 100)+ '%';
  }
}

function scrollContent(amount) {
  if (amount > 0) {
    var treshold = main.scrollTop + (main.clientHeight - (main.clientHeight % lineHeight) + lineHeight);
    if (treshold > main.scrollHeight) {
      // We only want to sroll even steps
      return;
    }
  }

  if (keypresses.length > 0) {
    // TODO: I think parseInt() simply ignores letters, which is not ideal
    if (isNumber(keypresses)) {
      amount *= parseInt(keypresses);
      resetKeyBlock();
    } else {
      // If we have previous keypresses that are not numbers, it is an invalid command.
      return;
    }
  }

  main.scrollBy(0, amount);
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

window.addEventListener('keydown', (e) => {
  const key = e.key;

  if (key === 'Escape' || key === 'CapsLock') {
    updateMode(modes.normal);
  } else if (key === ':') {
    updateMode(modes.command);
  } else {
    currentMode === modes.normal ? normalModeKeybindings(key) : commandModeKeybindings(key);
  }
});

main.addEventListener('scroll', () => {
  // Updates the scroll block when scrolling using both mouse and j/k
  scrollPosition = window.scrollY;

  if (!ticking) {
    window.requestAnimationFrame(() => {
      updateScrollBlock();
      ticking = false;
    });

    ticking = true;
  }
});

window.addEventListener('popstate', (e) => {
  var tabId = e.state.tabId;

  // Try to fetch the target tabId from history state first.
  // If it does not exists, try getting an index from the pathname.
  // If no tab id can be found, display the index page
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

initialize();
