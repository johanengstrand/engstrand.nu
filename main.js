const lineHeight = 20;
const tabs = ['index.html', 'johan.html', 'fredrik.html', 'contact.html'];
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

function generateTabs() {
  for (var i = 0; i < tabs.length; i++) {
    const filename = tabs[i];
    const element = document.createElement('a');
    element.classList.add('tab');
    element.href = filename;
    element.innerText = (i+1) + ' ' + filename;
    tabbar.appendChild(element);
    tabElements.push(element);
  }
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
      waitForImagesToLoad();
    })
    .catch((error) => {
      console.error(error);
    });
}

function updateContentScrollHeight() {
  // Images and other content may not be an exact multiple of lineHeight
  // and will cause the scroll block to not go to exactly 100%.
  var remainder = main.scrollHeight % lineHeight;

  if (remainder !== 0) {
    const element = document.createElement('div');
    element.style.height = (lineHeight - remainder) + 'px';
    gutter.appendChild(element);
  }
}

function generateLineNumbers() {
  // Reset the gutter
  gutter.innerHTML = '';

  // TODO: Only generate numbers for the actual content inside main
  var amount = Math.ceil(main.scrollHeight / lineHeight);

  for (var i = 1; i <= amount; i++) {
    const element = document.createElement('div');
    element.innerText = i;
    element.classList.add('line-number');
    gutter.appendChild(element);
  }
}

function waitForImagesToLoad() {
  // Attaches an event-listener to each image in the loaded html file and
  // generates the line numbers when they have all loaded.
  const images = content.querySelectorAll('img');
  var listeners = [];

  // Create a list of promises
  for (const image of images) {
    listeners.push(new Promise((resolve, _) => {
      image.addEventListener('load', () => {
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

function initialize() {
  generateTabs();
  updateMode(modes.normal);
  goToTab(1);
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

  if (main.scrollTop === 0) {
    scrollBlock.innerText = '0%';
  } else {
    scrollBlock.innerText = parseInt(main.scrollTop / (main.scrollHeight - main.clientHeight) * 100)+ '%';
  }
}

function updateKeyBlock(key) {
  keypresses += key;
  keyBlock.innerText = keypresses;
}

function goToTab(tab) {
  if (tab > 0 && tab <= tabs.length) {
    // Update the global variables before opening the content page
    // so that they can be used when the html has loaded.
    previousTab = currentTab === null ? tab : currentTab;
    currentTab = tab;
    openContentPage(tabs[tab-1]);
  } else {
    console.error('Invalid tab id: ', tab);
  }
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

initialize();
