const lineHeight = 20;
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
  const path = window.location.pathname
  const filename = path.substring(path.lastIndexOf('/') + 1);
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

function scrollContent(amount, repeats) {
  if (amount > 0) {
    var treshold = main.scrollTop + (main.clientHeight - (main.clientHeight % lineHeight) + lineHeight);
    if (treshold > main.scrollHeight) {
      // We only want to sroll even steps
      return;
    }
  }

  if (keypresses.length > 0) {
    const repeatAmount = parseInt(keypresses);
    if (!Object.is(repeatAmount, NaN)) {
      amount *= repeatAmount;
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

function commandModeKeybindings(key) {
  switch (key) {
    case 'Enter':
      commandInput.value !== '' && commandInput.value !== ':' && executeCommand();
      break;
  }
}

function normalModeKeybindings(key) {
  // Check if the key is a number and add it to the repeat count.
  // This is used when we want to repeat a binding multiple times, e.g '10k'.
  if (
    !Object.is(parseInt(key), NaN) &&
    (keypresses.length === 0 || !Object.is(parseInt(keypresses), NaN))
  ) {
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
    case 'Shift':
      reset = false;
      break;
    default:
      foundBinding = false;
      break;
  }

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
