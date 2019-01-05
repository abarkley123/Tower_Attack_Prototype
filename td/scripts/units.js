function createUnit(x, y, template) {
    var e = new Unit(x, y);
    // Fill in all keys
    template = typeof template === 'undefined' ? {} : template;
    var keys = Object.keys(template);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        e[key] = template[key];
    }
    e.onCreate();
    return e;
}


var unit = {};


unit.weak = {
    // Display
    color: [192, 192, 192],
    // Misc
    name: 'weak',
    // Stats
    cash: 1,
    health: 10,
    // draw: function() {
    //     push();
    //     translate(this.pos.x + ts/2, this.pos.y);
    //     rotate((3*PI)/2);
    //     rotate(PI/2 - this.vel.heading());
    //     scale(0.25);
    //     image(this.image, 0, 0);
    //     pop();
    // },
    // image: loadImage('images/units/weak.png')
};

unit.strong = {
    // Display
    color: [56, 51, 51],
    radius: 0.65,
    // Misc
    name: 'strong',
    // Stats
    cash: 12.5,
    health: 75,
    damage: 2
};

unit.fast = {
    // Display
    color: [61, 251, 255],
    // Misc
    name: 'fast',
    // Stats
    cash: 12.5,
    health: 35,
    speed: 2,
    // Methods
    draw: function() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());

        stroke(0);
		fill(this.getColor());
        var back = -0.55 * ts / 3;
        var front = back + 0.55 * ts;
        var side = 0.8 * ts / 2;
        quad(back, -side, 0, 0, back, side, front, 0);
        
        pop();
    },
    damage: 2
};

unit.blend = {
    // Display
    color: [30, 139, 195],
    // Misc
    name: 'blend',
    // Stats
    cash: 25,
    health: 75,
    speed: 2,
    // Methods
    draw: function() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
        
        stroke(0);
		fill(this.getColor());
        var back = -0.8 * ts / 3;
        var front = back + 0.8 * ts;
        var side = ts / 2;
        quad(back, -side, 0, 0, back, side, front, 0);
        
        pop();
    },
    damage: 3
};

unit.regen = {
    radius: 0.3,
    color: [192, 57, 43],
    // Misc
    name: 'regen',
    // Stats
    cash: 30,
    health: 100,
    // Methods
    onTick: function() {
        this.applyEffect('regen', 1);
    },
    damage: 3,
    speed: 2
}

unit.medic = {
    // Display
    color: [192, 57, 43],
    radius: 0.7,
    // Misc
    name: 'medic',
    // Stats
    cash: 40,
    health: 375,
    immune: ['regen'],
    // Methods
    onTick: function() {
        var affected = getInRange(this.pos.x, this.pos.y, 2, units);
        for (var i = 0; i < affected.length; i++) {
            affected[i].applyEffect('regen', 1);
        }
    },
    damage: 3,
    speed: 1.5
};

unit.stronger = {
    // Display
    color: [192, 24, 24],
    radius: 1,
    // Misc
    name: 'stronger',
    // Stats
    cash: 50,
    health: 250,
    damage: 4
};

unit.faster = {
    // Display
    color: [249, 105, 14],
    // Misc
    name: 'faster',
    // Stats
    cash: 50,
    health: 75,
    resistant: ['explosion'],
    speed: 3,
    // Methods
    draw: function() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());

        stroke(0);
		fill(this.getColor());
        var back = -0.7 * ts / 3;
        var front = back + 0.7 * ts;
        var side = 0.9 * ts / 2;
        quad(back, -side, 0, 0, back, side, front, 0);
        
        pop();
    },
    damage: 4
};

unit.spawner = {
    // Display
    color: [244, 232, 66],
    radius: 0.7,
    // Misc
    name: 'spawner',
    // Stats
    cash: 100,
    health: 100,
    immune: ['slow'],
    weak: ['explosion', 'piercing', 'energy', 'physical'],
    // Methods
    onKilled: function() {
        if (this.alive) {
            this.kill();
            if (!muteSounds && sounds.hasOwnProperty(this.sound)) {
                sounds[this.sound].play();
            }
            
            // Add new temporary spawnpoint
            var c = gridPos(this.pos.x, this.pos.y);
            if (c.equals(exit)) return;
            for (var i = 0; i < tempSpawns.length; i++) {
                if (c.equals(tempSpawns[i][0])) return;
            }
            tempSpawns.push([createVector(c.x, c.y), wave]);
            for (let i=0; i < wave; i++) {
                let damageToAdd = 0;
                newUnits.push('weak');
                //add half unit individual damage
                if (i >= 4) {
                    newUnits.push('strong');
                    newUnits.push('fast');
                }

                if (i >= 7) {
                    newUnits.push('blend');
                    newUnits.push('regen');
                }

                if (i >= 10) {
                    newUnits.push('stronger');
                    newUnits.push('faster');
                }
            }
        }
    },
    onCreate : function() {
        this.damage = resolveSpawnerDamage(wave);
        this.maxHealth = this.health;
    }
};

unit.tank = {
    // Display
    color: [30, 130, 76],
    radius: 1,
    // Misc
    name: 'tank',
    // Stats
    cash: 100,
    health: 500,
    immune: ['poison', 'slow'],
    resistant: ['energy', 'physical'],
    weak: ['explosion', 'piercing'],
    // Methods
    draw: function() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
        
        stroke(0);
        fill(this.getColor());
        var front = this.radius * ts / 2;
        var side = 0.7 * ts / 2;
        var barrel = 0.15 * ts / 2;
        var length = 0.7 * ts;
        var curve = 0.2 * ts;
        rect(-front, -side, front * 2, side * 2, curve);
        fill(149, 165, 166);
        rect(0, -barrel, length, barrel * 2);
        ellipse(0, 0, 0.2 * ts * 2, 0.2 * ts * 2);

        pop();
    },
    damage: 10    
};

unit.taunt = {
    // Display
    color: [102, 51, 153],
    radius: 0.8,
    // Misc
    name: 'taunt',
    sound: 'taunt',
    // Stats
    cash: 400,
    health: 1500,
    immune: ['poison', 'slow'],
    resistant: ['energy', 'physical'],
    taunt: true,
    // Methods
    draw: function() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
        
        stroke(0);
        fill(this.getColor());
        var edge = this.radius * ts / 2;
        rect(-edge, -edge, this.radius * ts, this.radius * ts);
        stroke(232, 126, 4);
        noFill();
        rect(-0.3 * ts, -0.3 * ts, 0.6 * ts, 0.6 * ts);
        rect(-0.2 * ts, -0.2 * ts, 0.4 * ts, 0.4 * ts);

        pop();
    }
};

unit.hive = {
    // Display
    color: [208, 184, 40],
    radius: 0.9,
    // Misc
    name: 'hive',
    // Stats
    cash: 1000,
    health: 1000,
    immune: ['poison', 'slow'],
    resistant: ['energy', 'physical'],
    // Methods
    onKilled: function() {
        if (this.alive) {
            this.kill();
            if (!muteSounds && sounds.hasOwnProperty(this.sound)) {
                sounds[this.sound].play();
            }
            
            // Add new temporary spawnpoint
            var c = gridPos(this.pos.x, this.pos.y);
            if (c.equals(exit)) return;
            for (var i = 0; i < tempSpawns.length; i++) {
                if (c.equals(tempSpawns[i][0])) return;
            }
            tempSpawns.push([createVector(c.x, c.y), wave]);
            for (let i=0; i < 10; i++) {
                let damageToAdd = 0;
                newUnits.push('weak');
                newUnits.push('weak');
                //add half unit individual damage
                if (i % 2 == 0) {
                    newUnits.push('strong');
                    newUnits.push('fast');
                    newUnits.push('stronger');
                    newUnits.push('faster');
                } else if (i % 5 == 0) {
                    newUnits.push('spawner');
                }
            }
        }
    },
    damage: 100,
    draw: function() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());
        
        stroke(0);
        fill(this.getColor());
        var front = this.radius * ts / 2;
        var side = 0.7 * ts / 2;
        var barrel = 0.15 * ts / 2;
        var length = 0.7 * ts;
        var curve = 0.5 * ts;
        //rect(-front, -side, front * 3, side * 3, curve);
        fill(144, 127, 28);

        ellipse(0, 0, 0.2 * ts * 4, 0.2 * ts * 4);
        ellipse(2, 2, 0.35 * ts, 0.35 * ts);
        ellipse(-2, -2, 0.35 * ts, 0.35 * ts);
        fill(211, 204, 49);
        ellipse(6, 6, 0.2 * ts * 4, 0.2 * ts * 4);
        ellipse(8, 8, 0.35 * ts, 0.35 * ts);
        ellipse(4, 4, 0.35 * ts, 0.35 * ts);
        pop();
    }
}
