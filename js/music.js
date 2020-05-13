setTimeout(function () {
    $('svg').fadeToggle();

}, 5000)

$(function () {

    var Page = (function () {

        var $navArrows = $('#nav-arrows').hide(),
            $shadow = $('#shadow').hide(),
            slicebox = $('#sb-slider').slicebox({
                onReady: function () {

                    $navArrows.show();
                    $shadow.show();

                },
                orientation: 'r',
                cuboidsRandom: true,
                disperseFactor: 30
            }),

            init = function () {

                initEvents();

            },
            initEvents = function () {

                // add navigation events
                $navArrows.children(':first').on('click', function () {

                    slicebox.next();
                    return false;

                });

                $navArrows.children(':last').on('click', function () {

                    slicebox.previous();
                    return false;

                });

            };

        return {
            init: init
        };

    })();

    Page.init();

});



/* example functionality */
$(document).ready(function () {
    $('#summonFireworks').click(function () {
        $("body").fireworks();
        jQuery("body").before(jQuery("canvas")); //this makes the canvas appear behind the example text
    });

    $('#destroyFireworks').click(function () {
        $("body").fireworks('destroy');
    });
});

/*
Adapted from http://jsfiddle.net/dtrooper/AceJJ/

TODO:
 * Try to get rid of ghosting
 * See if anything can be made more efficient
 * Make the canvas fit in the z-order
*/

(function ($) {
    var MAX_ROCKETS = 5,
        MAX_PARTICLES = 500;

    var FUNCTIONS = {
        'init': function (element) {
            var jqe = $(element);

            // Check this element isn't already inited
            if (jqe.data('fireworks_data') !== undefined) {
                console.log('Looks like this element is already inited!');
                return;
            }

            // Setup fireworks on this element
            var canvas = document.createElement('canvas'),
                canvas_buffer = document.createElement('canvas'),
                data = {
                    'element': element,
                    'canvas': canvas,
                    'context': canvas.getContext('2d'),
                    'canvas_buffer': canvas_buffer,
                    'context_buffer': canvas_buffer.getContext('2d'),
                    'particles': [],
                    'rockets': []
                };

            // Add & position the canvas
            if (jqe.css('position') === 'static') {
                element.style.position = 'relative';
            }
            element.appendChild(canvas);
            canvas.style.position = 'absolute';
            canvas.style.top = '0px';
            canvas.style.bottom = '0px';
            canvas.style.left = '0px';
            canvas.style.right = '0px';

            // Kickoff the loops
            data.interval = setInterval(loop.bind(this, data), 1000 / 50);

            // Save the data for later
            jqe.data('fireworks_data', data);
        },
        'destroy': function (element) {
            var jqe = $(element);

            // Check this element isn't already inited
            if (jqe.data('fireworks_data') === undefined) {
                console.log('Looks like this element is not yet inited!');
                return;
            }
            var data = jqe.data('fireworks_data');
            jqe.removeData('fireworks_data');

            // Stop the interval
            clearInterval(data.interval);

            // Remove the canvas
            data.canvas.remove();

            // Reset the elements positioning
            data.element.style.position = '';
        }
    };

    $.fn.fireworks = function (action) {
        // Assume no action means we want to init
        if (!action) {
            action = 'init';
        }

        // Process each element
        this.each(function () {
            FUNCTIONS[action](this);
        });

        // Chaining ftw :)
        return this;
    };

    function launch(data) {
        if (data.rockets.length < MAX_ROCKETS) {
            var rocket = new Rocket(data);
            data.rockets.push(rocket);
        }
    }

    function loop(data) {
        // Launch a new rocket
        launch(data);

        // Update screen size
        if (data.canvas_width != data.element.offsetWidth) {
            data.canvas_width = data.canvas.width = data.canvas_buffer.width = data.element.offsetWidth;
        }
        if (data.canvas_height != data.element.offsetHeight) {
            data.canvas_height = data.canvas.height = data.canvas_buffer.height = data.element.offsetHeight;
        }

        // Fade the background out slowly
        data.context_buffer.clearRect(0, 0, data.canvas.width, data.canvas.height);
        data.context_buffer.globalAlpha = 0.9;
        data.context_buffer.drawImage(data.canvas, 0, 0);
        data.context.clearRect(0, 0, data.canvas.width, data.canvas.height);
        data.context.drawImage(data.canvas_buffer, 0, 0);

        // Update the rockets
        var existingRockets = [];
        data.rockets.forEach(function (rocket) {
            // update and render
            rocket.update();
            rocket.render(data.context);

            // random chance of 1% if rockets is above the middle
            var randomChance = rocket.pos.y < (data.canvas.height * 2 / 3) ? (Math.random() * 100 <= 1) : false;

            /* Explosion rules
                 - 80% of screen
                - going down
                - close to the mouse
                - 1% chance of random explosion
            */
            if (rocket.pos.y < data.canvas.height / 5 || rocket.vel.y >= 0 || randomChance) {
                rocket.explode(data);
            } else {
                existingRockets.push(rocket);
            }
        });
        data.rockets = existingRockets;

        // Update the particles
        var existingParticles = [];
        data.particles.forEach(function (particle) {
            particle.update();

            // render and save particles that can be rendered
            if (particle.exists()) {
                particle.render(data.context);
                existingParticles.push(particle);
            }
        });
        data.particles = existingParticles;

        while (data.particles.length > MAX_PARTICLES) {
            data.particles.shift();
        }
    }

    function Particle(pos) {
        this.pos = {
            x: pos ? pos.x : 0,
            y: pos ? pos.y : 0
        };
        this.vel = {
            x: 0,
            y: 0
        };
        this.shrink = .97;
        this.size = 2;

        this.resistance = 1;
        this.gravity = 0;

        this.flick = false;

        this.alpha = 1;
        this.fade = 0;
        this.color = 0;
    }

    Particle.prototype.update = function () {
        // apply resistance
        this.vel.x *= this.resistance;
        this.vel.y *= this.resistance;

        // gravity down
        this.vel.y += this.gravity;

        // update position based on speed
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;

        // shrink
        this.size *= this.shrink;

        // fade out
        this.alpha -= this.fade;
    };

    Particle.prototype.render = function (c) {
        if (!this.exists()) {
            return;
        }

        c.save();

        c.globalCompositeOperation = 'lighter';

        var x = this.pos.x,
            y = this.pos.y,
            r = this.size / 2;

        var gradient = c.createRadialGradient(x, y, 0.1, x, y, r);
        gradient.addColorStop(0.1, "rgba(255,255,255," + this.alpha + ")");
        gradient.addColorStop(0.8, "hsla(" + this.color + ", 100%, 50%, " + this.alpha + ")");
        gradient.addColorStop(1, "hsla(" + this.color + ", 100%, 50%, 0.1)");

        c.fillStyle = gradient;

        c.beginPath();
        c.arc(this.pos.x, this.pos.y, this.flick ? Math.random() * this.size : this.size, 0, Math.PI * 2, true);
        c.closePath();
        c.fill();

        c.restore();
    };

    Particle.prototype.exists = function () {
        return this.alpha >= 0.1 && this.size >= 1;
    };

    function Rocket(data) {
        Particle.apply(
            this,
            [{
                x: Math.random() * data.canvas.width * 2 / 3 + data.canvas.width / 6,
                y: data.canvas.height
            }]
        );

        this.explosionColor = Math.floor(Math.random() * 360 / 10) * 10;
        this.vel.y = Math.random() * -3 - 4;
        this.vel.x = Math.random() * 6 - 3;
        this.size = 2;
        this.shrink = 0.999;
        this.gravity = 0.01;
    }

    Rocket.prototype = new Particle();
    Rocket.prototype.constructor = Rocket;

    Rocket.prototype.explode = function (data) {
        var count = Math.random() * 10 + 80;

        for (var i = 0; i < count; i++) {
            var particle = new Particle(this.pos);
            var angle = Math.random() * Math.PI * 2;

            // emulate 3D effect by using cosine and put more particles in the middle
            var speed = Math.cos(Math.random() * Math.PI / 2) * 15;

            particle.vel.x = Math.cos(angle) * speed;
            particle.vel.y = Math.sin(angle) * speed;

            particle.size = 10;

            particle.gravity = 0.2;
            particle.resistance = 0.92;
            particle.shrink = Math.random() * 0.05 + 0.93;

            particle.flick = true;
            particle.color = this.explosionColor;

            data.particles.push(particle);
        }
    };

    Rocket.prototype.render = function (c) {
        if (!this.exists()) {
            return;
        }

        c.save();

        c.globalCompositeOperation = 'lighter';

        var x = this.pos.x,
            y = this.pos.y,
            r = this.size / 2;

        var gradient = c.createRadialGradient(x, y, 0.1, x, y, r);
        gradient.addColorStop(0.1, "rgba(255, 255, 255 ," + this.alpha + ")");
        gradient.addColorStop(0.2, "rgba(255, 180, 0, " + this.alpha + ")");

        c.fillStyle = gradient;

        c.beginPath();
        c.arc(this.pos.x, this.pos.y, this.flick ? Math.random() * this.size / 2 + this.size / 2 : this.size, 0, Math.PI * 2, true);
        c.closePath();
        c.fill();

        c.restore();
    };
}(jQuery));


/* music */
'use strict';

let scene,
    camera,
    renderer,
    controls,
    mouseDown,
    world,
    night = false;

let sheep,
    cloud,
    sky;

let width,
    height;

function init() {
    width = window.innerWidth,
        height = window.innerHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.lookAt(scene.position);
    camera.position.set(0, 0.7, 8);

    renderer = new THREE.WebGLRenderer({
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // controls = new THREE.OrbitControls(camera, renderer.domElement);
    // controls.enableZoom = false;

    addLights();
    drawSheep();
    drawCloud();
    drawSky();

    world = document.querySelector('.world');
    world.appendChild(renderer.domElement);

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', onResize);
}

function addLights() {
    const light = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.9);
    scene.add(light);

    const directLight1 = new THREE.DirectionalLight(0xffd798, 0.8);
    directLight1.castShadow = true;
    directLight1.position.set(9.5, 8.2, 8.3);
    scene.add(directLight1);

    const directLight2 = new THREE.DirectionalLight(0xc9ceff, 0.5);
    directLight2.castShadow = true;
    directLight2.position.set(-15.8, 5.2, 8);
    scene.add(directLight2);
}

function drawSheep() {
    sheep = new Sheep();
    scene.add(sheep.group);
}

function drawCloud() {
    cloud = new Cloud();
    scene.add(cloud.group);
}

function drawSky() {
    sky = new Sky();
    sky.showNightSky(night);
    scene.add(sky.group);
}

function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function onMouseDown(event) {
    mouseDown = true;
}

function onTouchStart(event) {
    const targetClass = event.target.classList[0];
    if (targetClass === 'toggle' || targetClass === 'toggle-music') return;
    event.preventDefault();
    mouseDown = true;
}

function onMouseUp() {
    mouseDown = false;
}

function onTouchEnd(event) {
    const targetClass = event.target.classList[0];
    if (targetClass === 'toggle' || targetClass === 'toggle-music') return;
    event.preventDefault();
    mouseDown = false;
}

function rad(degrees) {
    return degrees * (Math.PI / 180);
}

function animate() {
    requestAnimationFrame(animate);

    render();
}

function render() {

    sheep.jumpOnMouseDown();
    if (sheep.group.position.y > 0.4) cloud.bend();

    sky.moveSky();

    renderer.render(scene, camera);
}

class Sheep {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.y = 0.4;

        this.woolMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1,
            shading: THREE.FlatShading
        });
        this.skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaf8b,
            roughness: 1,
            shading: THREE.FlatShading
        });
        this.darkMaterial = new THREE.MeshStandardMaterial({
            color: 0x4b4553,
            roughness: 1,
            shading: THREE.FlatShading
        });

        this.vAngle = 0;

        this.drawBody();
        this.drawHead();
        this.drawLegs();
    }
    drawBody() {
        const bodyGeometry = new THREE.IcosahedronGeometry(1.7, 0);
        const body = new THREE.Mesh(bodyGeometry, this.woolMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        this.group.add(body);
    }
    drawHead() {
        const head = new THREE.Group();
        head.position.set(0, 0.65, 1.6);
        head.rotation.x = rad(-20);
        this.group.add(head);

        const foreheadGeometry = new THREE.BoxGeometry(0.7, 0.6, 0.7);
        const forehead = new THREE.Mesh(foreheadGeometry, this.skinMaterial);
        forehead.castShadow = true;
        forehead.receiveShadow = true;
        forehead.position.y = -0.15;
        head.add(forehead);

        const faceGeometry = new THREE.CylinderGeometry(0.5, 0.15, 0.4, 4, 1);
        const face = new THREE.Mesh(faceGeometry, this.skinMaterial);
        face.castShadow = true;
        face.receiveShadow = true;
        face.position.y = -0.65;
        face.rotation.y = rad(45);
        head.add(face);

        const woolGeometry = new THREE.BoxGeometry(0.84, 0.46, 0.9);
        const wool = new THREE.Mesh(woolGeometry, this.woolMaterial);
        wool.position.set(0, 0.12, 0.07);
        wool.rotation.x = rad(20);
        head.add(wool);

        const rightEyeGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.06, 6);
        const rightEye = new THREE.Mesh(rightEyeGeometry, this.darkMaterial);
        rightEye.castShadow = true;
        rightEye.receiveShadow = true;
        rightEye.position.set(0.35, -0.48, 0.33);
        rightEye.rotation.set(rad(130.8), 0, rad(-45));
        head.add(rightEye);

        const leftEye = rightEye.clone();
        leftEye.position.x = -rightEye.position.x;
        leftEye.rotation.z = -rightEye.rotation.z;
        head.add(leftEye);

        const rightEarGeometry = new THREE.BoxGeometry(0.12, 0.5, 0.3);
        rightEarGeometry.translate(0, -0.25, 0);
        this.rightEar = new THREE.Mesh(rightEarGeometry, this.skinMaterial);
        this.rightEar.castShadow = true;
        this.rightEar.receiveShadow = true;
        this.rightEar.position.set(0.35, -0.12, -0.07);
        this.rightEar.rotation.set(rad(20), 0, rad(50));
        head.add(this.rightEar);

        this.leftEar = this.rightEar.clone();
        this.leftEar.position.x = -this.rightEar.position.x;
        this.leftEar.rotation.z = -this.rightEar.rotation.z;
        head.add(this.leftEar);
    }
    drawLegs() {
        const legGeometry = new THREE.CylinderGeometry(0.3, 0.15, 1, 4);
        legGeometry.translate(0, -0.5, 0);
        this.frontRightLeg = new THREE.Mesh(legGeometry, this.darkMaterial);
        this.frontRightLeg.castShadow = true;
        this.frontRightLeg.receiveShadow = true;
        this.frontRightLeg.position.set(0.7, -0.8, 0.5);
        this.frontRightLeg.rotation.x = rad(-12);
        this.group.add(this.frontRightLeg);

        this.frontLeftLeg = this.frontRightLeg.clone();
        this.frontLeftLeg.position.x = -this.frontRightLeg.position.x;
        this.frontLeftLeg.rotation.z = -this.frontRightLeg.rotation.z;
        this.group.add(this.frontLeftLeg);

        this.backRightLeg = this.frontRightLeg.clone();
        this.backRightLeg.position.z = -this.frontRightLeg.position.z;
        this.backRightLeg.rotation.x = -this.frontRightLeg.rotation.x;
        this.group.add(this.backRightLeg);

        this.backLeftLeg = this.frontLeftLeg.clone();
        this.backLeftLeg.position.z = -this.frontLeftLeg.position.z;
        this.backLeftLeg.rotation.x = -this.frontLeftLeg.rotation.x;
        this.group.add(this.backLeftLeg);
    }
    jump(speed) {
        this.vAngle += speed;
        this.group.position.y = Math.sin(this.vAngle) + 1.38;

        const legRotation = Math.sin(this.vAngle) * Math.PI / 6 + 0.4;

        this.frontRightLeg.rotation.z = legRotation;
        this.backRightLeg.rotation.z = legRotation;
        this.frontLeftLeg.rotation.z = -legRotation;
        this.backLeftLeg.rotation.z = -legRotation;

        const earRotation = Math.sin(this.vAngle) * Math.PI / 3 + 1.5;

        this.rightEar.rotation.z = earRotation;
        this.leftEar.rotation.z = -earRotation;
    }
    jumpOnMouseDown() {
        if (mouseDown) {
            this.jump(0.05);
        } else {
            if (this.group.position.y <= 0.4) return;
            this.jump(0.08);
        }
    }
}

class Cloud {
    constructor() {
        this.group = new THREE.Group();
        this.group.position.y = -2;
        this.group.scale.set(1.5, 1.5, 1.5);

        this.material = new THREE.MeshStandardMaterial({
            color: 0xacb3fb,
            roughness: 1,
            shading: THREE.FlatShading
        });

        this.vAngle = 0;

        this.drawParts();

        this.group.traverse((part) => {
            part.castShadow = true;
            part.receiveShadow = true;
        });
    }
    drawParts() {
        const partGeometry = new THREE.IcosahedronGeometry(1, 0);
        this.upperPart = new THREE.Mesh(partGeometry, this.material);
        this.group.add(this.upperPart);

        this.leftPart = this.upperPart.clone();
        this.leftPart.position.set(-1.2, -0.3, 0);
        this.leftPart.scale.set(0.8, 0.8, 0.8);
        this.group.add(this.leftPart);

        this.rightPart = this.leftPart.clone();
        this.rightPart.position.x = -this.leftPart.position.x;
        this.group.add(this.rightPart);

        this.frontPart = this.leftPart.clone();
        this.frontPart.position.set(0, -0.4, 0.9);
        this.frontPart.scale.set(0.7, 0.7, 0.7);
        this.group.add(this.frontPart);

        this.backPart = this.frontPart.clone();
        this.backPart.position.z = -this.frontPart.position.z;
        this.group.add(this.backPart);
    }
    bend() {
        this.vAngle += 0.08;

        this.upperPart.position.y = -Math.cos(this.vAngle) * 0.12;
        this.leftPart.position.y = -Math.cos(this.vAngle) * 0.1 - 0.3;
        this.rightPart.position.y = -Math.cos(this.vAngle) * 0.1 - 0.3;
        this.frontPart.position.y = -Math.cos(this.vAngle) * 0.08 - 0.3;
        this.backPart.position.y = -Math.cos(this.vAngle) * 0.08 - 0.3;
    }
}

class Sky {
    constructor() {
        this.group = new THREE.Group();

        this.daySky = new THREE.Group();
        this.nightSky = new THREE.Group();

        this.group.add(this.daySky);
        this.group.add(this.nightSky);

        this.colors = {
            day: [0xFFFFFF, 0xEFD2DA, 0xC1EDED, 0xCCC9DE],
            night: [0x5DC7B5, 0xF8007E, 0xFFC363, 0xCDAAFD, 0xDDD7FE],
        };

        this.drawSky('day');
        this.drawSky('night');
        this.drawNightLights();
    }
    drawSky(phase) {
        for (let i = 0; i < 30; i++) {
            const geometry = new THREE.IcosahedronGeometry(0.4, 0);
            const material = new THREE.MeshStandardMaterial({
                color: this.colors[phase][Math.floor(Math.random() * this.colors[phase].length)],
                roughness: 1,
                shading: THREE.FlatShading
            });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.set((Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 30);
            if (phase === 'day') {
                this.daySky.add(mesh);
            } else {
                this.nightSky.add(mesh);
            }
        }
    }
    drawNightLights() {
        const geometry = new THREE.SphereGeometry(0.1, 5, 5);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFF51B6,
            roughness: 1,
            shading: THREE.FlatShading
        });

        for (let i = 0; i < 3; i++) {
            const light = new THREE.PointLight(0xF55889, 2, 30);
            const mesh = new THREE.Mesh(geometry, material);
            light.add(mesh);

            light.position.set((Math.random() - 2) * 6,
                (Math.random() - 2) * 6,
                (Math.random() - 2) * 6);
            light.updateMatrix();
            light.matrixAutoUpdate = false;

            this.nightSky.add(light);
        }
    }
    showNightSky(condition) {
        if (condition) {
            this.daySky.position.set(100, 100, 100);
            this.nightSky.position.set(0, 0, 0);
        } else {
            this.daySky.position.set(0, 0, 0);
            this.nightSky.position.set(100, 100, 100);
        }
    }
    moveSky() {
        this.group.rotation.x += 0.001;
        this.group.rotation.y -= 0.004;
    }
}

const toggleBtn = document.querySelector('.toggle');
toggleBtn.addEventListener('click', toggleNight);

const worldMusic = document.querySelector('.world-music');
const btnMusic = document.querySelector('.toggle-music');
let playMusic = false;
btnMusic.addEventListener('click', toggleMusic);
worldMusic.volume = 0.3;
worldMusic.loop = true;

function toggleNight() {
    night = !night;

    toggleBtn.classList.toggle('toggle-night');
    world.classList.toggle('world-night');

    sky.showNightSky(night);
}

function toggleMusic() {
    playMusic = !playMusic;
    btnMusic.classList.toggle('music-off');
    playMusic ? worldMusic.play() : worldMusic.pause();
}

init();
animate();
/* end music */