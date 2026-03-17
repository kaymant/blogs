import { charges, regenerateField } from './main.js';

window.addCharge = function () {
  const q = parseFloat(document.getElementById('q').value);
  const x = parseFloat(document.getElementById('x').value);
  const y = parseFloat(document.getElementById('y').value);
  const z = parseFloat(document.getElementById('z').value);
  charges.push({ q, pos: [x, y, z] });
  regenerateField();
};

window.removeCharge = function () {
  charges.pop();
  regenerateField();
};

window.regenerate = function () {
  regenerateField();
};

