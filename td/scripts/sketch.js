var accessibleUnits = {weak:1, strong: 12.5, stronger: 50, fast: 12.5, regen: 30, medic: 40, blend: 25, faster:50, spawner:100, tank: 100, taunt:400, hive: 1000};
var units = [];
var projectiles = [];
var systems = [];
var towers = [];
var newUnits = [];
var newProjectiles = [];
var newTowers = [];
var unitsToSpawn = [];
var spawnRate = 40;
var cols;
var rows;
var tileZoom = 2;
var ts = 24;            // tile size
var zoomDefault = ts;
var towerCenter = null;
var particleAmt = 32;   // number of particles to draw per explosion
var numSpawns = 2;
var tempSpawnCount = 40;

var custom;             // custom map JSON
var display;            // graphical display tiles
var displayDir;         // direction display tiles are facing
                        // (0 = none, 1 = left, 2 = up, 3 = right, 4 = down)
var dists;              // distance to exit
var grid;               // tile type
                        // (0 = empty, 1 = wall, 2 = path, 3 = tower,
                        //  4 = unit-only pathing)
var metadata;           // tile metadata
var paths;              // direction to reach exit
var visitMap;           // whether exit can be reached
var walkMap;            // walkability map

var exit;
var spawnpoints = [];
var tempSpawns = [];

var cash;
var health;
var maxHealth;
var wave;

var spawnCool;          // number of ticks between spawning units

var bg;                 // background color
var border;             // color to draw on tile borders
var borderAlpha;        // alpha of tile borders

var selected;
var towerType;

var sounds;             // dict of all sounds
var boomSound;          // explosion sound effect

// TODO add more functionality to god mode
var godMode = false;    // make player immortal for test purposes
var healthBar = true;   // display unit health bar
var muteSounds = false; // whether to mute sounds
var paused;             // whether to update or not
var randomWaves = true; // whether to do random or custom waves
var ticks_till_spawn;                // number of ticks until next spawn cycle
var showEffects = true; // whether or not to display particle effects
var showFPS = false;    // whether or not to display FPS
var skipToNext = false; // whether or not to immediately start next wave
var stopFiring = false; // whether or not to pause towers firing
var toCooldown;         // flag to reset spawning cooldown
var toPathfind;         // flag to update unit pathfinding
var toPlace;            // flag to place a tower
var toWait;             // flag to wait before next wave
var ticks_till_wave;                // number of ticks until next wave

var avgFPS = 0;         // current average of all FPS values
var numFPS = 0;         // number of FPS values calculated so far

var minDist = 15;       // minimum distance between spawnpoint and exit
var resistance = 0.5;   // percentage of damage blocked by resistance
var sellConst = 0.8;    // ratio of tower cost to sell price
var wallCover = 0.1;    // percentage of map covered by walls
var waveCool = 120;     // number of ticks between waves
var weakness = 0.5;     // damage increase from weakness
var passiveIncome = 1;
var sabotagedTowers = 0;
// Misc functions

var upgrades = {
    'passive' : {
        'current' : 0,
        '1' : {
            cost : 100,
            mul : 2
        },
        '2' : {
            cost : 250,
            mul : 3
        },
        '3' : {
            cost : 500,
            mul : 4
        }
    }
}

// Spawn a group of units, alternating if multiple types
function addGroup(group) {
    var count = group.pop();
    for (var i = 0; i < count; i++) {
        for (var j = 0; j < group.length; j++) {
            newUnits.push(group[j]);
        }
    }
}

// Buy and place a tower if player has enough money
function buy(t) {
    selected = t;
    if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
    showTowerInfo(t);
    newTowers.push(t);
}

// Check if all conditions for placing a tower are true
function canPlace(col, row) {
    if (!toPlace) return false;
    var g = grid[col][row];
    if (g === 3) return true;
    if (g === 1 || g === 2 || g === 4) return false;
    if (!empty(col, row) || !placeable(col, row)) return false;
    return true;
}

// Check if all conditions for showing a range are true
function doRange() {
    return mouseInMap() && toPlace && typeof towerType !== 'undefined';
}

// Check if tile is empty
function empty(col, row) {
    // Check if not walkable
    if (!walkable(col, row)) return false;

    // Check if spawnpoint
    for (var i = 0; i < spawnpoints.length; i++) {
        var s = spawnpoints[i];
        if (s.x === col && s.y === row) return false;
    }

    // Check if exit
    if (typeof exit !== 'undefined') {
        if (exit.x === col && exit.y === row) return false;
    }
    
    return true;
}

// Get an empty tile
function getEmpty() {
    while (true) {
        var t = randomTile();
        if (empty(t.x, t.y)) return t;
    }
}

// Find tower at specific tile, otherwise return null
function getTower(col, row) {
    for (var i = 0; i < towers.length; i++) {
        var t = towers[i];
        if (t.gridPos.x === col && t.gridPos.y === row) return t;
    }
    return null;
}

// Return map of visitability
function getVisitMap(walkMap) {
    var frontier = [];
    var target = vts(exit);
    frontier.push(target);
    var visited = {};
    visited[target] = true;

    // Fill visited for every tile
    while (frontier.length !== 0) {
        var current = frontier.shift();
        var t = stv(current);
        var adj = neighbors(walkMap, t.x, t.y, true);

        for (var i = 0; i < adj.length; i++) {
            var next = adj[i];
            if (!(next in visited)) {
                frontier.push(next);
                visited[next] = true;
            }
        }
    }

    return visited;
}

// Return walkability map
function getWalkMap() {
    var walkMap = [];
    for (var x = 0; x < cols; x++) {
        walkMap[x] = [];
        for (var y = 0; y < rows; y++) {
            walkMap[x][y] = walkable(x, y);
        }
    }
    return walkMap;
}

function loadMap() {
    var name = 'sparse2';

    health = 40;
    cash = 55;

    resizeMax();
    var numSpawns;
    numSpawns = 2;
    wallCover = 0.1;
    randomMap(numSpawns);
    display = replaceArray(
    grid, [0, 1, 2, 3, 4], ['empty', 'wall', 'empty', 'tower', 'empty']);
    displayDir = buildArray(cols, rows, 0);
    // Colors
    bg = [205, 92, 92];
    border = 255;
    borderAlpha = 31;
    // Misc
    metadata = buildArray(cols, rows, null);
    resizeFit();
    tempSpawns = [];
    recalculate();
}

function createTowers(roundNum) {
    if (!(roundNum > 0)) {
        roundNum = 0;
    }
    var tierSet = ['gun', 'shooter', 'laser', 'slow', 'sniper', 'rocket', 'bomb', 'tesla'];
    let maximumTier = 1;
    maximumTowers = (cols * rows)/120 + (2*(roundNum+1));
    maximumTier = floor(++roundNum/2);
    if (maximumTier > 8) {
        maximumTier = 8;
    } else if (maximumTier < 1) {
        maximumTier = 1;
    }

    let i = 0;
    let numUpgraded = 0;
    while (i < maximumTowers) {
        var randomTier = floor(random() * (maximumTier - 1 + 1)) + 1;
        toPlace = true;
        godMode = true;
        const x = randint(cols);
        const y = randint(rows);
        if (canPlace(x, y)) {
            let t = createTower(x, y, tower[tierSet[randomTier-1]]);
            buy(t);
            if (numUpgraded < maximumTowers/3) {
                if (canUpgrade(roundNum, maximumTier, randomTier) && t.upgrades.length > 0) {
                    upgrade(t.upgrades[0]);
                    numUpgraded++;
                }
            }
            i++;
        } else if (i > maximumTowers * 10) {
            console.log("Algorithm took too long to execute. Quitting gracefully.");
            break;
        }
    } 
    godMode = false;
    toPlace = false;  
}

function canUpgrade(roundNum, maximumTier, randomTier) {
    let canUpgrade = false;
    if (randomTier < maximumTier || roundNum % 3 === 0) {
        canUpgrade = true;
    } 

    return canUpgrade;
}

// Load all sounds
function loadSounds() {
    sounds = {};
    
    //Missile explosion
    sounds.boom = loadSound('sounds/boom.wav');
    sounds.boom.setVolume(0.3);

    // Missile launch
    sounds.missile = loadSound('sounds/missile.wav');
    sounds.missile.setVolume(0.3);

    // Enemy death
    sounds.pop = loadSound('sounds/pop_sound.mp3');
    sounds.pop.setVolume(0.4);

    // Railgun
    sounds.railgun = loadSound('sounds/railgun.wav');
    sounds.railgun.setVolume(0.3);

    // Sniper rifle shot
    sounds.sniper = loadSound('sounds/sniper.wav');
    sounds.sniper.setVolume(0.2);

    // Tesla coil
    sounds.spark = loadSound('sounds/spark.wav');
    sounds.spark.setVolume(0.3);

    // Taunt enemy death
    sounds.taunt = loadSound('sounds/taunt.wav');
    sounds.taunt.setVolume(0.3);
}

function outsideMap(e) {
    return outsideRect(e.pos.x, e.pos.y, 0, 0, width, height);
}

// Toggle pause state
function pause() {
    paused = !paused;
    updateOverlay(getUnitNameAsUnit());
}

// Return false if blocking a tile would invalidate paths to exit
function placeable(col, row) {
    var walkMap = getWalkMap();
    walkMap[col][row] = false;
    var visitMap = getVisitMap(walkMap);

    // Check spawnpoints
    for (var i = 0; i < spawnpoints.length; i++) {
        if (!visitMap[vts(spawnpoints[i])]) return false;
    }

    // Check each unit
    for (var i = 0; i < units.length; i++) {
        var e = units[i];
        var p = gridPos(e.pos.x, e.pos.y);
        if (p.equals(col, row)) continue;
        if (!visitMap[vts(p)]) return false;
    }

    return true;
}

// Generate random map
function randomMap(numSpawns) {
    // Generate empty tiles and walls
    grid = [];
    for (var x = 0; x < cols; x++) {
        grid[x] = [];
        for (var y = 0; y < rows; y++) {
            grid[x][y] = random() < wallCover ? 1 : 0;
        }
    }
    walkMap = getWalkMap();
    generateExit(walkMap);
    generateSpawns(walkMap);
}

function generateExit(walkMap) {
    exit = getEmpty();
    var adj = neighbors(walkMap, exit.x, exit.y, false);
    for (var i = 0; i < adj.length; i++) {
        var n = stv(adj[i]);
        grid[n.x][n.y] = 0;
    }
}

function generateSpawns(walkMap) {
    spawnpoints = [];
    visitMap = getVisitMap(walkMap);
    for (var i = 0; i < numSpawns; i++) {
        var s;
        // Try to place spawnpoint
        for (var j = 0; j < 100; j++) {
            s = getEmpty();
            while (!visitMap[vts(s)]) s = getEmpty();
            if (s.dist(exit) >= minDist) break;
        }
        spawnpoints.push(s);
    }
}

// Random grid coordinate
function randomTile() {
    return createVector(randint(cols), randint(rows));
}

// Recalculate pathfinding maps
// Algorithm from https://www.redblobgames.com/pathfinding/tower-defense/
function recalculate() {
    walkMap = getWalkMap();
    var frontier = [];
    var target = vts(exit);
    frontier.push(target);
    var cameFrom = {};
    var distance = {};
    cameFrom[target] = null;
    distance[target] = 0;

    // Fill cameFrom and distance for every tile
    while (frontier.length !== 0) {
        var current = frontier.shift();
        var t = stv(current);
        var adj = neighbors(walkMap, t.x, t.y, true);

        for (var i = 0; i < adj.length; i++) {
            var next = adj[i];
            if (!(next in cameFrom) || !(next in distance)) {
                frontier.push(next);
                cameFrom[next] = current;
                distance[next] = distance[current] + 1;
            }
        }
    }

    // Generate usable maps
    dists = buildArray(cols, rows, null);
    var newPaths = buildArray(cols, rows, 0);
    var keys = Object.keys(cameFrom);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var current = stv(key);

        // Distance map
        dists[current.x][current.y] = distance[key];

        // Generate path direction for every tile
        var val = cameFrom[key];
        if (val !== null) {
            // Subtract vectors to determine direction
            var next = stv(val);
            var dir = next.sub(current);
            // Fill tile with direction
            if (dir.x < 0) newPaths[current.x][current.y] = 1;
            if (dir.y < 0) newPaths[current.x][current.y] = 2;
            if (dir.x > 0) newPaths[current.x][current.y] = 3;
            if (dir.y > 0) newPaths[current.x][current.y] = 4;
        }
    }

    // Preserve old paths on path tiles
    for (var x = 0; x < cols; x++) {
        for (var y = 0; y < rows; y++) {
            if (grid[x][y] === 2) newPaths[x][y] = paths[x][y];
        }
    }

    paths = newPaths;
}

// TODO vary health based on map
function resetGame() {
    loadMap();
    // Clear all entities
    units = [];
    projectiles = [];
    systems = [];
    towers = [];
    newUnits = [];
    newProjectiles = [];
    newTowers = [];
    // Reset all stats
    health = 40;
    maxHealth = health;
    wave = 0;
    // Reset all flags
    paused = true;
    ticks_till_spawn = 0;
    toCooldown = false;
    toPathfind = false;
    toPlace = false;
    // Start game
    createTowers(0);
}

function startNextRound() {
    // Clear all entities
    units = [];
    projectiles = [];
    systems = [];
    towers = [];
    newUnits = [];
    newProjectiles = [];
    newTowers = [];
    // Reset all stats
    health = floor(maxHealth * 1.05);
    maxHealth = health;
    wave++;
    // Reset all flags
    paused = true;
    ticks_till_spawn = 0;
    toCooldown = false;
    toPathfind = false;
    toPlace = false;
    // Start game
    selected = null;
    towerCenter = null;
    sabotagedTowers = 0;
    createTowers(wave);

    walkMap = getWalkMap();
    generateExit(walkMap);
    generateSpawns(walkMap);
}

// Changes tile size to fit everything onscreen
function resizeFit() {
    var div = document.getElementById('sketch-holder');
    var ts1 = floor(div.offsetWidth / 35);
    var ts2 = floor(div.offsetHeight / 35);
    ts = Math.min(ts1, ts2);
    resizeCanvas(cols * ts, rows * ts, true);
    document.getElementById('defaultCanvas0').style.width = '100%';
    document.getElementById('defaultCanvas0').style.height = '100%';
}

// Resizes cols, rows, and canvas ased on tile size
function resizeMax() {
    var div = document.getElementById('sketch-holder');
    cols = floor(div.offsetWidth / ts);
    rows = floor(div.offsetHeight / ts);
    while (cols * ts < div.offsetWidth) {
        cols++;
    }

    while (rows * ts < div.offsetHeight) {
        rows++;
    }    

    resizeCanvas(cols * ts, rows * ts, true);
    document.getElementById('defaultCanvas0').style.width = '100%';
    document.getElementById('defaultCanvas0').style.height = '100%';
}

// Sell a tower
function sell(t) {
    if (cash > t.sellPrice()) {
        selected = null;
        if (grid[t.gridPos.x][t.gridPos.y] === 0) toPathfind = true;
    
        cash -= t.sellPrice();
        t.kill();
        $('#info-div').attr('display', 'none');
        sabotagedTowers++;
        showTowerInfo(selected);
    }
}

// Visualize range of tower
function showTowerRange(t, cx, cy) {
    stroke(255);
    fill(t.color[0], t.color[1], t.color[2], 63);
    var r = (t.range + 0.5) * ts * 2;
    ellipse(cx, cy, r, r);
}

function showTowerInfo(t) {
    if (selected != null && towerCenter != null) {
        var name = document.getElementById('name');
        name.innerHTML = '<span style="color:rgb(' + t.color + ')">' + t.title +
        '</span>';
        document.getElementById('sellPrice').innerHTML = 'Sabotage price: $' +
        t.sellPrice();
        document.getElementById('damage').innerHTML = 'Damage: ' + t.getDamage();
        document.getElementById('type').innerHTML = 'Type: ' +
        t.type.toUpperCase();
        document.getElementById('range').innerHTML = 'Range: ' + t.range;
        document.getElementById('cooldown').innerHTML = 'Avg. Cooldown: ' +
        t.getCooldown().toFixed(2) + 's';
        document.getElementById('info-div').style.display = 'block';
        let dis = 'none'
        if (canSabotage(selected)) {
            dis = 'block';
        }
        document.getElementById('sell').style.display = dis;
    } else {
        document.getElementById('info-div').style.display = 'none';
    }
}

function canSabotage(tower) {
    if (cash >= tower.sellPrice() && sabotagedTowers < 5) {
        return true;
    }
    return false;
}

// Update pause button
function updatePause() {
    document.getElementById('pause').innerHTML = paused ? 'Start' : 'Pause';
}

// Update game status display with wave, health, and cash
function updateStatus() {
    document.getElementById('wave').innerHTML = 'Wave ' + wave;
    document.getElementById('health').innerHTML = 'Health: ' +
    health + '/' + maxHealth;
    if (!paused) {
        cash += passiveIncome/frameRate();
    }
    document.getElementById('cash').innerHTML = '$' + floor(cash);
}

// Upgrade tower
function upgrade(t) {
    console.log('upgrading tower.');
    selected.upgrade(t);
    selected.upgrades = t.upgrades ? t.upgrades : [];
    showTowerInfo(selected);
}

// Return whether tile is walkable
function walkable(col, row) {
    // Check if wall or tower-only tile
    if (grid[col][row] === 1 || grid[col][row] === 3) return false;
    // Check if tower
    if (getTower(col, row)) return false;
    return true;
}


// Main p5 functions

function preload() {
    try {
        soundFormats('mp3', 'wav');
        loadSounds();
    } catch(NoSuchBufferException) {
        console.log("Buffer is undefined.");
    }
}


    function setup() {
        var div = document.getElementById('sketch-holder');
        var canvas = createCanvas(div.offsetWidth, div.offsetHeight);
        canvas.parent('sketch-holder');
        resetGame();
    }

// TODO show range of selected tower
    function draw() {
        background(bg);

        // Update game status
        updatePause();
        updateStatus();

        // Update spawn and wave cooldown
        if (!paused) {
            if (ticks_till_spawn > 0) ticks_till_spawn--;
            if (ticks_till_wave > 0 && toWait) ticks_till_wave--;
        }

        // Draw basic tiles
        // noStroke();
        // fill(205, 92, 92);
        // rect(0, 0, cols * ts, rows * ts);

     
            let counter = 1;
            for (var x = 0; x < cols; x++) {
                for (var y = 0; y < rows; y++) {
                    var t = tiles[display[x][y]];
                    if (typeof t === 'function') {
                        t(x, y, displayDir[x][y]);
                    } else {
                        if (t) {
                            fill(51, 0, 0);
                            if (++counter % 2 !== 0 | x > y | y > x) {
                                rect(x * ts, y * ts, ts, ts);
                            }
                        } 
                    }
                }
            }


        // Draw spawnpoints
        for (var i = 0; i < spawnpoints.length; i++) {
            stroke(255);
            var s = spawnpoints[i];
            fill(154, 125, 10);
            rect(s.x * ts, s.y * ts, ts, ts);
            fill(241, 196, 15);
            ellipse(s.x * ts + 0.5 * ts, s.y * ts + 0.5 * ts, ts, ts);
            fill(207, 0, 15);
            stroke(207, 0, 15);
            line(s.x * ts, s.y * ts, s.x * ts + ts, s.y * ts + ts);
        }

        // Draw exit
        stroke(255);
        fill(20, 90, 50);
        ellipse(exit.x * ts + 0.5 * ts, exit.y * ts + 0.5 * ts, ts, ts);

        // Spawn units
        if (newUnits.length > 0 && !paused) {
            // Spawn same unit for each spawnpoint

            if (tempSpawns.length > 0) {
                    const name = newUnits.pop();
                    for (let i = 0; i < tempSpawns.length; i++) {
                        var s = tempSpawns[i];
                        if (s[1] === 0) continue;
                        s[1]--;
                        var c = center(s[0].x, s[0].y);   
                        units.push(createUnit(c.x, c.y, unit[name]));
                    }
            } else {
                const name = newUnits.shift();
                for (var i = 0; i < spawnpoints.length; i++) {
                    var s = spawnpoints[i];
                    var c = center(s.x, s.y);
                    fill(205, 92, 92);
                    units.push(createUnit(c.x, c.y, unit[name]));
                }
            }
        }

        if (tempSpawns.length > 0 && newUnits.length == 0) removeTempSpawns();
        // Update and draw units
        for (let i = units.length - 1; i >= 0; i--) {
            let e = units[i];

            // Update direction and position
            if (!paused) {
                e.steer();
                e.update();
                e.onTick();
            }

            // Kill if outside map
            if (outsideMap(e)) e.kill();

            // If at exit tile, kill and reduce player health
            if (atTileCenter(e.pos.x, e.pos.y, exit.x, exit.y)) e.onExit();

            // Draw
            e.draw();

            if (e.isDead()) units.splice(i, 1);
        }

        // Draw health bars
        if (healthBar) {
            for (var i = 0; i < units.length; i++) {
                units[i].drawHealth();
            }
        }

        // Update and draw towers
        for (let i = towers.length - 1; i >= 0; i--) {
            
            let t = towers[i];

            // Target units and update cooldowns
            if (!paused) {
                t.target(units);
                t.update();
            }

            // Kill if outside map
            if (outsideMap(t)) t.kill();

            // Draw
            t.draw();

            if (t.isDead()) towers.splice(i, 1);
        }

        // Update and draw particle systems
        for (let i = systems.length - 1; i >= 0; i--) {
            let ps = systems[i];
            ps.run();
            if (ps.isDead()) systems.splice(i, 1);
        }

        projectiles = projectiles.concat(newProjectiles);
        towers = towers.concat(newTowers);

        // Update and draw projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i];

            if (!paused) {
                p.steer();
                p.update();
            }

            // Attack target
            if (p.reachedTarget()) p.explode()

            // Kill if outside map
            if (outsideMap(p)) p.kill();

            p.draw();

            if (p.isDead()) projectiles.splice(i, 1);
        }

        if (selected != null && towerCenter != null) {
            const c = center(towerCenter.x, towerCenter.y);
            showTowerRange(selected, c.x, c.y);
        }

        //removeTempSpawns();

        newProjectiles = [];
        newTowers = [];

        // If player is dead, reset game
        if (health <= 0) startNextRound();

        // Recalculate pathfinding
        if (toPathfind) {
            recalculate();
            toPathfind = false;
        }
    }

function mousePressed() {
    if (!mouseInMap()) return;
    var p = gridPos(mouseX, mouseY);
    var t = getTower(p.x, p.y);
    
    if (t) {
        towerCenter = p;
        // Clicked on tower
        selected = t;
        toPlace = false;
    }  else {
        selected = null;
    }

    showTowerInfo(selected);
}

$('#recruit').on('click', function(event) {
    const id = getUnitNameAsUnit();

    if (canRecruit(id)) {
        cash -= resolveValueFrom(accessibleUnits, id);
        addToSpawn(id);
    }

    updateOverlay(id);
});

function getUnitNameAsUnit() {
    try {
        let localId = document.getElementById('unitName').children[0].innerHTML;
        return localId.charAt(0).toLowerCase() + localId.slice(1)
    } catch(NoSuchElementException) {
        console.log('No element found containing unit name.');
        return null;
    }
}

function addToSpawn(value) {
    addGroup([value, 1]);
}

$('.Upgrade').on('click', function(event) {
    processUpgrade($(this).attr('id'));
});

function processUpgrade(id) {
    if (id !== null || id !== undefined) {
        try {
            const upg = upgrades[id];
            let curr = upg.current + 1;
            const currentUpg = upg[curr.toString()];
            if (upg.current <= 3 && transact(currentUpg.cost)) {
                const elementToImprove = resolveForUpgrade(id, currentUpg.mul);
                upg.current++;

                //TODO - refactor into own method for extensibility
                let displayString = [elementToImprove, 'N/A', 'N/A'];
                if (upg.current < 3) {
                    const nextUpg = upg[(++curr).toString()];
                    displayString[1] = nextUpg.cost;
                    displayString[2] = nextUpg.mul;
                } else if (upg.current == 4) {
                    displayString[0] += '(max)';
                }

                document.getElementById(id + '_1').innerHTML = displayString[0];
                document.getElementById(id + '_2').innerHTML = displayString[1];
                document.getElementById(id + '_3').innerHTML = displayString[2];
            } else {
                console.log('Insufficient funds to purchase.');
                //todo - remove button if not allowable, avoid try-catch swallowing exception
            }
        } catch (NoSuchUpgradeException) {
            console.log("Couldn't find upgrade for " + id);
        }
    }
}

function transact(amount) {
    if (amount <= cash) {
        cash -= amount;
        return true;
    }

    return false;
}

function resolveForUpgrade(id, mul) {
    switch (id) {
        case 'passive' : passiveIncome *= mul; return passiveIncome;
    }
}

$('.Unit').on('click', function(event) {
    createOverlay($(this).attr('id'));
});

function createOverlay(id) {
    const visibility = document.getElementById('unit_info').style.display;

    if (visibility === 'block' && id === getUnitNameAsUnit()) {
        document.getElementById('unit_info').style.display = 'none';
        document.getElementById('unitName').innerHTML = '';
    } else if (visibility === 'none' || id !== getUnitNameAsUnit()) {
        updateOverlay(id);
    }
}

function updateOverlay(id) {
    if (id === null || id.length <= 0) return;
    document.getElementById('unit_info').style.display = 'block';
    let displayCapability = 'none';
    if (canRecruit(id)) {
       displayCapability= 'block';
    } 
    document.getElementById('recruit-container').style.display = displayCapability;
    showUnitInfo(id);
}

function canRecruit(id) {
    if (!paused && canBuy(id)) {
        return true;
    }

    return false;
}

function canBuy(value) {
    cost = resolveValueFrom(accessibleUnits, value);
    if (!(cash >= cost)) {
        console.log('You cannot purchase this.');
        return false;
    }

    return true;
}

function resolveValueFrom(unitsList, value) {
    for (const i in unitsList) {
        if (i == value) {
            return unitsList[value];
        }
    }

    return null;
}

function showUnitInfo(id) {
        let name = document.getElementById('unitName');
        const thisUnit = createUnit(0, 0, unit[id]);
        const unitName = id.charAt(0).toUpperCase() + id.slice(1);
        name.innerHTML = '<span style="color:rgb(' + thisUnit.color + ')">' + unitName +
        '</span>';
        document.getElementById('unitCost').innerHTML = 'Price: $' + thisUnit.cash;
        document.getElementById('unitHealth').innerHTML = 'Health: ' + thisUnit.health;
        prettyPrintArrayFor('unitResistance', thisUnit.resistant);
        prettyPrintArrayFor('unitWeakness', thisUnit.weak);
        document.getElementById('unitSpeed').innerHTML = 'Speed: ' + thisUnit.speed;
        document.getElementById('taunts').innerHTML = 'Draws fire: ' + thisUnit.taunt;
        document.getElementById('unitDamage').innerHTML = 'Damage: ' + thisUnit.damage;
}

function prettyPrintArrayFor(element, array) {
    dataToAppend = ':<br><p style="color:#EFE2BA">';
    for (const value in array) {
        dataToAppend += array[value] + '<br>';
    }

    if (dataToAppend === ':<br><p style="color:#EFE2BA">') {
        dataToAppend = ': none.';
    } else {
       dataToAppend += "</p>";
    }
    document.getElementById(element).innerHTML = element.slice(4) + dataToAppend;
}