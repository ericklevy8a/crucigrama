
var TILEBOARD_ROWS = 9;
var TILEBOARD_COLS = 9;

var TILEBOARD_BLACKS = Math.round(TILEBOARD_ROWS * TILEBOARD_COLS / 4);

const MAX_SELECTIONS = 32;

const VALID_CHARS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';

const DIR_HORIZONTAL = 'h';
const DIR_VERTICAL = 'v';

class Tile {
    isBlack = false;
    isStart = false;
    hStart = false;
    vStart = false;
    hLen = 0;
    vLen = 0;
    num = 0;
    char = '';
}

// Virtual tile board
var tileboard = [];

// Virtual word list
var places = [];

// Words dictionary
var dictionary = '';

async function getDictionary() {
    try {
        const response = await fetch('./spanish.dic');
        dictionary = (await response.text()).split('\n');
    } catch (err) {
        throw new Error('Problemas para leer el diccionario de palabras!')
    }
}

function initTileboard() {
    tileboard = [];
    for (let r = 0; r < TILEBOARD_ROWS; r++) {
        let row = [];
        for (let c = 0; c < TILEBOARD_COLS; c++) {
            let tile = new Tile();
            row.push(tile);
        }
        tileboard.push(row);
    }
}

function blackTileboard() {
    let dado = (TILEBOARD_ROWS === TILEBOARD_COLS) ? 3 : 2;
    dado = Math.floor(Math.random() * dado);
    if (dado === 2) blackTileboardAntisymetric()
    else if (dado === 1) blackTileboardSymetric()
    else blackTileboardRandom()
}

function blackTileboardRandom() {
    let blacksRemain = TILEBOARD_BLACKS;
    while (blacksRemain > 0) {
        let r = Math.floor(Math.random() * TILEBOARD_ROWS);
        let c = Math.floor(Math.random() * TILEBOARD_COLS);
        if (!tileboard[r][c].isBlack) {
            tileboard[r][c].isBlack = true;
            blacksRemain -= 1;
        }
    }
}

function blackTileboardSymetric() {
    let blacksRemain = Math.ceil(TILEBOARD_BLACKS / 4);
    while (blacksRemain > 0) {
        let r = Math.floor(Math.random() * TILEBOARD_ROWS / 2);
        let c = Math.floor(Math.random() * TILEBOARD_COLS / 2);
        if (!tileboard[r][c].isBlack) {
            tileboard[r][c].isBlack = true;
            tileboard[r][TILEBOARD_COLS - c - 1].isBlack = true;
            tileboard[TILEBOARD_ROWS - r - 1][c].isBlack = true;
            tileboard[TILEBOARD_ROWS - r - 1][TILEBOARD_COLS - c - 1].isBlack = true;
            blacksRemain -= 1;
        }
    }
}

function blackTileboardAntisymetric() {
    let blacksRemain = Math.ceil(TILEBOARD_BLACKS / 4);
    while (blacksRemain > 0) {
        let r = Math.floor(Math.random() * TILEBOARD_ROWS / 2);
        let c = Math.floor(Math.random() * TILEBOARD_COLS / 2);
        if (!tileboard[r][c].isBlack) {
            tileboard[r][c].isBlack = true;
            tileboard[c][TILEBOARD_COLS - r - 1].isBlack = true;
            tileboard[TILEBOARD_ROWS - c - 1][r].isBlack = true;
            tileboard[TILEBOARD_ROWS - r - 1][TILEBOARD_COLS - c - 1].isBlack = true;
            blacksRemain -= 1;
        }
    }
}

function measureTileboard() {
    let num = 1;
    for (let row = 0; row < TILEBOARD_ROWS; row++) {
        for (let col = 0; col < TILEBOARD_COLS; col++) {
            let tile = tileboard[row][col];
            if (!tile.isBlack) {
                tile.hStart = tileIsHStart(row, col);
                tile.vStart = tileIsVStart(row, col);
                if (tile.hStart) {
                    tile.hLen = tileHLen(row, col);
                }
                if (tile.vStart) {
                    tile.vLen = tileVLen(row, col);
                }
                if (tile.hLen > 1 || tile.vLen > 1) {
                    tile.isStart = true;
                    tile.num = num++;
                }
            }
        }
    }
}

function tileIsHStart(row, col) {
    return (
        !tileboard[row][col].isBlack
        && (col === 0 || (col > 0 && tileboard[row][col - 1].isBlack))
        && !(col === TILEBOARD_COLS - 1 || tileboard[row][col + 1].isBlack)
    );
}

function tileIsVStart(row, col) {
    return (
        !tileboard[row][col].isBlack
        && (row === 0 || (row > 0 && tileboard[row - 1][col].isBlack))
        && !(row === TILEBOARD_ROWS - 1 || tileboard[row + 1][col].isBlack)
    );
}

function tileHLen(row, col) {
    let len = 0;
    while (col + len < TILEBOARD_COLS && !tileboard[row][col + len].isBlack) {
        len++;
    }
    return len;
}

function tileVLen(row, col) {
    let len = 0;
    while (row + len < TILEBOARD_ROWS && !tileboard[row + len][col].isBlack) {
        len++;
    }
    return len;
}

function resetTileboard() {
    for (let row = 0; row < TILEBOARD_ROWS; row++) {
        for (let col = 0; col < TILEBOARD_COLS; col++) {
            tileboard[row][col].char = '';
        }
    }
}

function initWordList() {
    places = [];
    for (let row = 0; row < TILEBOARD_ROWS; row++) {
        for (let col = 0; col < TILEBOARD_COLS; col++) {
            let tile = tileboard[row][col];
            if (tile.isStart) {
                if (tile.hStart) places.push({
                    row: row,
                    col: col,
                    num: tile.num,
                    dir: DIR_HORIZONTAL,
                    len: tile.hLen,
                    word: '',
                });
                if (tile.vStart) places.push({
                    row: row,
                    col: col,
                    num: tile.num,
                    dir: DIR_VERTICAL,
                    len: tile.vLen,
                    word: '',
                });
            }
        }
    }
    places = places.sort((a, b) => b.len - a.len);
}

function resetPlacesWord() {
    places.forEach(listPlace => {
        listPlace.word = '';
    });
}

function solver(index = 0) {
    // Condición de terminación de la recursividad: se llegó al final de la lista
    if (index === places.length) return true;
    // Toma el espacio correspondiente de la lista (para saber sus datos)
    const place = places[index];
    // Genera el patrón de restricciones para la búsqueda de palabras
    const pat = getPattern(index);
    const reg = new RegExp(('^' + pat + '$'));
    // Filtrar del diccionario las palabras que cumplen el patrón
    const prospectWords = dictionary.filter(x => reg.test(x));
    // Si no encuentra ninguna palabra, regresa FALSE
    if (prospectWords.length === 0) return false;
    // Selecciona aleatoriamente agunas de las palabras filtradas, hasta un máximo de MAX_SELECTIONS (default = 10)
    const selectedCount = Math.min(prospectWords.length, MAX_SELECTIONS);
    let selectedWords = [];
    for (let i = 0; i < selectedCount; i++) {
        selectedWords.push({
            word: extractOneRandom(prospectWords),
            value: 0,
        });
    }
    // Realiza una ponderación de cada palabra (one level lookahead)
    for (let sel of selectedWords) {
        const word = sel.word;
        const ri = (place.dir === DIR_VERTICAL) ? 1 : 0;
        const ci = (place.dir === DIR_HORIZONTAL) ? 1 : 0;
        // Por cada letra
        for (let i = 0; i < word.length; i++) {
            // Analizar la palabra que cruza
            const row = place.row + i * ri;
            const col = place.col + i * ci;
            const crossPlace = getCrossPlace(row, col, place.dir);
            if (crossPlace === undefined) continue;
            // Generar el patrón de restricciones correspondiente
            let crossPattern = getPattern(crossPlace);
            if (crossPattern === undefined) continue;
            // Tomando en cuenta la letra que cruza, completa el patrón en la posición correspondiente
            let pos = (place.dir === DIR_HORIZONTAL) ? row - crossPlace.row : col - crossPlace.col;
            crossPattern = replaceCharAt(crossPattern, word[i], pos);
            const reg = new RegExp(('^' + crossPattern + '$'));
            // Calcular el número de palabras que cumplen el patrón
            const filterCount = dictionary.filter(x => reg.test(x)).length;
            // Si no hay palabras, asignar cero a la ponderación de la palabra y seguir con la siguiente palabra
            if (filterCount === 0) {
                sel.value = 0;
                break;
            }
            // De lo contrario, sumar el cálculo a la ponderación de la palabra
            sel.value = filterCount;
        }
    }
    // Filtra solo las palabras tengan ponderación y las re-ordena de mayor a menor
    selectedWords = selectedWords.filter(x => x.value > 0).sort((a, b) => b.value - a.value);
    // Si la lista queda vacía, regresa FALSE
    if (selectedWords.length === 0) return false;
    // Por cada palabra en la lista
    const selCount = selectedWords.length;
    let selIndex = 0;
    for (let sel of selectedWords) {
        const word = sel.word;
        // Coloca la palabra en el tablero virtual
        tryWord(place, word);
        place.word = sel.word;

        // RETROALIMENTACION DEL PROCESO EN CONSOLA
        selIndex++;
        console.log(spaces(2 * index), `${lpad(index, 2)} : ${lpad(selIndex, 1)} / ${selCount}`, '->', sel.word);

        // SE LLAMA RECURSIVAMENTE A ESTA MISMA FUNCION guardando el valor a retornar
        const result = solver(index + 1);
        // Si el valor retornado es TRUE, retorna TRUE
        if (result) return true;
        // De lo contrario, descoloca la palabra del tablero virtual
        place.word = '';
        const ci = (place.dir === DIR_HORIZONTAL) ? 1 : 0;
        const ri = (place.dir === DIR_VERTICAL) ? 1 : 0;
        for (let i = 0; i < pat.length; i++) {
            if (pat[i] === '.') {
                tileboard[place.row + i * ri][place.col + i * ci].char = '';
            }
        }
    }
    // Se terminaron las palabras de la lista, retorna FALSE
    return false;
}

function tryWord(listPlace, pickWord) {
    let ci = (listPlace.dir === DIR_HORIZONTAL) ? 1 : 0;
    let ri = (listPlace.dir === DIR_VERTICAL) ? 1 : 0;
    for (let i = 0; i < listPlace.len; i++) {
        let wordChar = pickWord[i];
        let tileChar = tileboard[listPlace.row + i * ri][listPlace.col + i * ci].char;
        if (tileChar !== '' && tileChar !== wordChar) {
            return false;
        }
    }
    for (let i = 0; i < listPlace.len; i++) {
        tileboard[listPlace.row + i * ri][listPlace.col + i * ci].char = pickWord[i];
    }
    return true;
}

function getPattern(place) {
    if (typeof place === 'number') place = places[place];
    let pattern = '';
    if (place === undefined) { return undefined; }
    let ci = (place.dir === DIR_HORIZONTAL) ? 1 : 0;
    let ri = (place.dir === DIR_VERTICAL) ? 1 : 0;
    for (let i = 0; i < place.len; i++) {
        let char = tileboard[place.row + i * ri][place.col + i * ci].char;
        if (char === '') {
            pattern += '.';
        } else {
            pattern += char;
        }
    }
    return pattern;
}

function getCrossPlace(row, col, dir) {
    let crossPlace = undefined;
    if (dir === DIR_HORIZONTAL) {
        crossPlace = places.filter(x =>
            x.dir === DIR_VERTICAL
            && x.col === col
            && (x.row <= row && row < x.row + x.len))
    } else {
        crossPlace = places.filter(x =>
            x.dir === DIR_HORIZONTAL
            && x.row === row
            && (x.col <= col && col < x.col + x.len))

    }
    if (crossPlace.length === 1) return crossPlace[0];
    return undefined;
}

// SHOW THE VIRTUAL TILE BOARD IN PAGE

function drawTileboard() {
    const tileboardContainer = document.getElementById('tileboard-container');
    tileboardContainer.innerHTML = '';
    for (let row = 0; row < TILEBOARD_ROWS; row++) {
        const tileRow = document.createElement('div');
        tileRow.className = 'tile-row';
        for (let col = 0; col < TILEBOARD_COLS; col++) {
            const tile = document.createElement('div');
            const tileNum = document.createElement('div');
            const tileChar = document.createElement('div');
            tile.className = 'tile';
            tileNum.className = 'tile-num';
            tileChar.className = 'tile-char';
            // Fill the tile with virtual tileboard data
            let virtualTile = tileboard[row][col];
            if (virtualTile.isBlack) tile.classList.add('black');
            tileNum.innerText = virtualTile.num > 0 ? virtualTile.num : '';
            tileChar.innerText = virtualTile.char.toUpperCase();
            tile.dataset.hStart = virtualTile.hStart;
            tile.dataset.vStart = virtualTile.vStart;
            tile.dataset.hLen = virtualTile.hLen;
            tile.dataset.vLen = virtualTile.vLen;
            // Append tile elements to row
            tile.appendChild(tileNum);
            tile.appendChild(tileChar);
            tile.addEventListener('click', onClick)
            tileRow.appendChild(tile);
        }
        // Append row to board
        tileboardContainer.appendChild(tileRow);
    }
}

// AUXILIAR FUNCTIONS

function onClick(evt) {
    const tile = evt.target;
    console.log(tile.dataset.hLen, tile.dataset.vLen);
}

function selectOneRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extractOneRandom(arr) {
    if (arr.length > 0) {
        const pos = Math.floor(Math.random() * arr.length);
        return arr.splice(pos, 1)[0];
    } else return undefined;
}

function replaceCharAt(str, char, pos) {
    str = Array.from(str);
    str[pos] = char;
    return str.join('');
}

function spaces(num) {
    return ' '.repeat(num);
}

function lpad(str, num, char = ' ') {
    return char.repeat(num).concat(str).slice(-num);
}

// UI FUNCTIONS

function disableButton(id, flag) {
    const btnSolve = document.getElementById(id);
    btnSolve.disabled = flag;
}

function getParams() {
    const ROWS = parseInt(document.getElementById('tileboard-rows').value);
    const COLS = parseInt(document.getElementById('tileboard-cols').value);
    let BLACKS = parseInt(document.getElementById('tileboard-blacks').value);
    if (ROWS !== TILEBOARD_ROWS || COLS !== TILEBOARD_COLS) {
        BLACKS = Math.round(TILEBOARD_ROWS * TILEBOARD_COLS / 4);
    }
    TILEBOARD_ROWS = ROWS;
    TILEBOARD_COLS = COLS;
    TILEBOARD_BLACKS = BLACKS;
}

function setParams() {
    document.getElementById('tileboard-rows').value = TILEBOARD_ROWS;
    document.getElementById('tileboard-cols').value = TILEBOARD_COLS;
    document.getElementById('tileboard-blacks').value = TILEBOARD_BLACKS;
    document.getElementById('tileboard-blacks').max = TILEBOARD_ROWS * TILEBOARD_COLS;
}

function changeParams() {
    disableButton('btn-solve', true);
    disableButton('btn-change', false);
    getParams();
    // validate ranges
    TILEBOARD_ROWS = Math.max(8, Math.min(16, TILEBOARD_ROWS));
    TILEBOARD_COLS = Math.max(8, Math.min(16, TILEBOARD_COLS));
    TILEBOARD_BLACKS = Math.max(0, Math.min(Math.round(TILEBOARD_ROWS * TILEBOARD_COLS), TILEBOARD_BLACKS));
    setParams();
}

function changeBoard() {
    getParams();
    initTileboard();
    blackTileboard();
    measureTileboard();
    initWordList();
    drawTileboard();
    //disableButton('btn-change', true);
    disableButton('btn-solve', false);
}

function run() {
    console.time('solver');
    resetPlacesWord();
    resetTileboard();
    solver();
    drawTileboard();
    console.table(places);
    console.timeEnd('solver');
}

// INITIALIZE THE GAME

getDictionary();

initTileboard();
blackTileboard();
measureTileboard();

initWordList();

drawTileboard();
setParams();

// End of file