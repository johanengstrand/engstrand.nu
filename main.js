const lineHeight = 20;
const tabs = ['index.html', 'johan.html', 'fredrik.html', 'contact.html'];
const modes = {
  normal: 'NORMAL',
  command: 'COMMAND',
};

var main = document.getElementById('content-wrapper');
// var content = document.getElementById('content');
var gutter = document.getElementById('gutter');
var scrollBlock = document.getElementById('scroll');
var modeBlock = document.getElementById('mode');
var commandInput = document.getElementById('command-input');
var keyBlock = document.getElementById('keybinding-display');
var fileBlock = document.getElementById('file');

var currentMode = modes.command;
var currentTab = null;
var previousTab = null;
var keypresses = '';

function generateLineNumbers() {
  var amount = Math.ceil(main.scrollHeight / lineHeight);

  for (var i = 1; i <= amount; i++) {
    var element = document.createElement('div');
    element.innerText = i;
    element.classList.add('line-number');
    gutter.appendChild(element);
  }
}

function updateContentScrollHeight() {
  var remainder = main.scrollHeight % lineHeight;

  if (remainder !== 0) {
    var element = document.createElement('div');
    element.style.height = remainder + 'px';
    main.appendChild(element);
  }
}

function updateFilenameBlock() {
  const path = window.location.pathname;
  var filename = path.substring(path.lastIndexOf('/') + 1);

  if (filename === '')  {
    filename = 'index.html';
  }

  currentTab = tabs.indexOf(filename) + 1; // Tabs start at 1
  fileBlock.innerText = filename;
}

function initialize() {
  generateLineNumbers();
  updateFilenameBlock();
  updateMode(modes.normal);
  updateContentScrollHeight();
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
    console.log('Go to tab: ', tab);
  } else {
    console.error('Invalid tab id: ', tab);
  }

  previousTab = currentTab;
  currentTab = tab;
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
