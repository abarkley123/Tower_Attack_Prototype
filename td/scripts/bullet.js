class Bullet {
    constructor(t, e) {
        // Physics
        this.pos = createVector(t.pos.x, t.pos.y);
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        // Display
        this.color = [207, 0, 15];
        this.secondary = [189, 195, 199];
        this.length = 0.2 * ts;
        this.width = 0.1 * ts;
        // Misc
        this.alive = true;
        this.target = e;
        this.firstTargetLocated = e;
        // Stats
        this.accAmt = 0.6;
        this.blastRadius = 1;
        this.damageMax = t.damageMax;
        this.damageMin = t.damageMin;
        this.lifetime = 60;
        this.range = 7;
        this.topSpeed = (3 * 24) / ts;
        this.canSteer = false;
        this.final = createVector(0, 0);
        this.resolveToTarget();
    }

    setSteer(steer) {
        this.canSteer = steer;
    }

    draw() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.vel.heading());

        stroke(0);
        fill([34, 35, 35]);
        var base = this.length / 2;
        var side = this.width / 2;
        var tip = base + this.width * 2;
        var back = -base - base * 2 / 3;
        var fin = side * 4;
        rect(-base, -side, base * 2, side * 2);
        fill(this.color);
        pop();
    }

    explode() {
        this.kill();
        let inRadius = getInRange(this.pos.x, this.pos.y, this.blastRadius, units);
        for (var i = 0; i < inRadius.length; i++) {
            var e = inRadius[i];
            if (inRange(e.pos.x, e.pos.y, this.pos.x, this.pos.y)) {
                const damage = floor(random(this.damageMax, this.damageMin));
                e.dealDamage(damage, 'physical');
                break;
            }
        }
    }

    findTarget() {
        var entities = this.visible(units);
        if (entities.length === 0) {
            this.kill();
            return;
        }
        var t = getTaunting(entities);
        if (t.length > 0) entities = t;
        var e = getNearest(entities, this.pos);
        if (typeof e === 'undefined') {
            this.kill();
            return;
        }
        this.target = e;
    }

    isDead() {
        return !this.alive;
    }

    kill() {
        this.alive = false;
    }

    reachedTarget() {
        var p = this.pos;
        var c = this.target.pos;
        return insideCircle(p.x, p.y, c.x, c.y, this.target.radius * ts);
    }

    steer() {
        if (!this.target.alive || !this.canSteer) return;
        var dist = this.pos.dist(this.target.pos);
        var unit = p5.Vector.sub(this.target.pos, this.pos).normalize();
        this.acc.add(unit.mult(this.accAmt));
    }

    resolveToTarget() {
        if (!this.target.alive) this.explode();
        const trajectory = determineNextPoint(this);
        this.final = trajectory;
        const trajVector = createVector(trajectory.x, trajectory.y);
        const vel = vec_mul(trajVector, this.topSpeed);

        this.vel.add(trajVector);
    }

    update() {
        this.pos.add(this.vel);

        if (!this.target.alive) {
            if (this.canSteer) {
                this.findTarget();
            } else {
                this.explode();
            }
        }

        if (this.lifetime > 0) {
            this.lifetime--;
        } else {
            this.explode();
        }
    }

    // Returns array of visible entities out of passed array
    visible(entities) {
        return getInRange(this.pos.x, this.pos.y, this.range, entities);
    }
}
