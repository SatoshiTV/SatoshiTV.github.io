// Clase Heroe
class Heroe {
    constructor(sprite_ref, x, y, attack_ref, attack_button_ref, slime_frames) {
        this.sprite = game.add.sprite(x, y, sprite_ref);
        this.sprite.animations.add('idle', [0], 0);
        this.sprite.animations.add('attack', [1, 2, 3, 4, 0], 12);
        this.sprite.animations.play('idle');
        
        this.attack_ref = attack_ref;
        this.cooldown = false;
        
        this.x = this.sprite.x;
        this.y = this.sprite.y;
        
        this.button = game.add.button(this.x - 35, this.y + 160, attack_button_ref, this.attack, this, 0, 0, 1, 0);
        this.button.scale.setTo(2, 2);
        
        this.slime_frames = slime_frames;
    }
    
    attack() {
        if (this.cooldown || gameOver) return;
    
        this.sprite.animations.play('attack');
        
        // Inicializa un nuevo proyectil
        let proj = projs.create(this.sprite.x, this.sprite.y - 10, this.attack_ref);
        proj.body.velocity.y = PROJ_SPEED;
        
        // Deshabilita el botón y establece un temporizador para volver a habilitarlo
        this.cooldown = true;
        game.time.events.add(COOLDOWN_TIME, function() { this.cooldown = false; }, this);
    }
}

// Constantes y variables globales
const COOLDOWN_TIME = 150;
const PROJ_SPEED = -1000;

let game = new Phaser.Game(720, 1280, Phaser.AUTO, 'game_div');

let gameOver = false;
let spawning = false;

let limit;
let heroes;
let hearts = [];

let projs;
let enemy_grp;
let enemies = [];
let cleanup = {enemies : [], projectiles : []};

let score = 0;
let score_text;

let default_speed = 100;
const SPEED_INC = 5;
const MAX_SPEED = 500;

let spawn_interval = 2300; //ms
const SPAWN_DEC = 50;
const MIN_SPAWN = 500;

// Estados del juego y menú principal
let MainMenuState = {
    preload: function() {
        console.log("Cargando recursos del menú principal...");
        game.load.image('background', 'assets/map.png');
        game.load.bitmapFont('heartbit-72', 'assets/heartbit-72.png', 'assets/heartbit-72.fnt');
        game.load.image('startButton', 'assets/startButton.png');
        game.load.image('exitButton', 'assets/exitButton.png');
        game.load.image('retryButton', 'assets/retry.png'); // Cargar el nuevo botón de reintentar
        // Cargar música del menú en preload
        game.load.audio('menuMusic', 'assets/menu_music.mp3');
    },
    create: function() {
        // Iniciar música del menú
        this.menuMusic = game.add.audio('menuMusic');
        this.menuMusic.loopFull();

        console.log("Creando el menú principal...");
        game.input.mouse.mouseWheelCallback = null; // Elimina el scroll del mouse
    
        let background = game.add.sprite(game.width / 2, 0, 'background');
        background.anchor.setTo(0.5, 0);
    
        let title = game.add.bitmapText(game.width / 2, game.height * 0.2, 'heartbit-72', 'WAR GODS', 150);
        title.anchor.setTo(0.5, 0.5);
    
        let startButton = game.add.button(game.width / 2, game.height * 0.5, 'startButton', this.startGame, this);
        startButton.anchor.setTo(0.5, 0.5);
        startButton.scale.setTo(0.1, 0.1); // Ajusta la escala del botón de inicio
    
        let exitButton = game.add.button(game.width / 2, game.height * 0.6, 'exitButton', this.exitGame, this);
        exitButton.anchor.setTo(0.5, 0.5);
        exitButton.scale.setTo(0.4, 0.4); // Ajusta la escala del botón de salida
    },
    
    startGame: function() {
        console.log("Iniciando el juego...");
        // Detener la música del menú al iniciar el juego
        this.menuMusic.stop();
        game.state.start('Game');
    },
    
    exitGame: function() {
        console.log("Saliendo del juego...");
        window.close();
    }
};

let GameState = {
    preload: preload,
    create: create,
    update: update,
    heroes: [],
    score: 0,
    score_text: null,
    pauseButton: null,
    resumeButton: null
};

// Cargar todos los recursos necesarios
function preload() {
    console.log("Cargando recursos del juego...");
    game.load.image('background', 'assets/map.png');
    game.load.bitmapFont('heartbit', 'assets/heartbit.png', 'assets/heartbit.fnt'); //32pt
    game.load.bitmapFont('heartbit-72', 'assets/heartbit-72.png', 'assets/heartbit-72.fnt');
    game.load.image('heart', 'assets/heart.png');
    game.load.spritesheet('knight', 'assets/knight-64.png', 64, 104);
    game.load.spritesheet('mage', 'assets/mage-64.png', 64, 108);
    game.load.spritesheet('ranger', 'assets/ranger-64.png', 64, 108);
    game.load.image('fireball', 'assets/fireball.png');
    game.load.image('sword_wave', 'assets/sword_wave.png');
    game.load.image('arrow', 'assets/arrow.png');
    game.load.spritesheet('slimes', 'assets/slimes.png', 18, 16, 9);
    game.load.spritesheet('book_btn', 'assets/book_btn.png', 64, 64);
    game.load.spritesheet('sword_btn', 'assets/sword_btn.png', 64, 64);
    game.load.spritesheet('bow_btn', 'assets/bow_btn.png', 64, 64);
    game.load.image('pauseButton', 'assets/pauseButton.png');
    game.load.image('resumeButton', 'assets/resumeButton.png');
    game.load.image('retryButton', 'assets/retry.png'); // Cargar el nuevo botón de reintentar
    // Cargar música de juego
    game.load.audio('gameMusic', 'assets/game_music.mp3');
}

// Inicializar propiedades y objetos del juego
function create() {
    console.log("Creando el juego...");
    // La relación de aspecto y el dimensionamiento correcto se realiza a través de CSS, así que ajustamos al contenedor principal
    game.scale.scaleMode = Phaser.ScaleManager.EXACT_FIT;
    game.stage.backgroundColor = 'rgb(50, 50, 50)';
    
    let background = game.add.sprite(game.width / 2, 0, 'background');
    limit = background.height * 0.8;
    background.x -= background.width / 2;
    
    // Crear el texto del puntaje
    score_text = game.add.bitmapText(game.width * 0.2, game.height * 0.85, "heartbit", "PUNTAJE: " + score, 48);
    
    game.physics.startSystem(Phaser.Physics.ARCADE);
    
    let mage = new Heroe('mage', game.width / 2 - 205, game.height / 2 + 325, 'fireball', 'book_btn', [6, 7, 8]);
    let knight = new Heroe('knight', game.width / 2 - 35, game.height / 2 + 325, 'sword_wave', 'sword_btn', [0, 1, 2]);
    let ranger = new Heroe('ranger', game.width / 2 + 145, game.height / 2 + 325, 'arrow', 'bow_btn', [3, 4, 5]);
    
    heroes = [mage, knight, ranger];
    
    // Inicializar el grupo de proyectiles: limpieza automática de objetos fuera de los límites.
    projs = game.add.group();
    projs.enableBody = true;
    projs.setAll('checkWorldBounds', true);
    projs.setAll('outOfBoundsKill', true);
    
    enemy_grp = game.add.group();
    enemy_grp.enableBody = true;
    
    for (let i = 0; i < 3; i++) {
        hearts.push(game.add.sprite((0.05 * i + 0.8) * game.width, 0.02 * game.height, 'heart'));
    }
    
    game.input.mouse.mouseWheelCallback = function() { return false; }; // Deshabilita el scroll en el menú

    // Crear botones de pausa y reanudar
    GameState.pauseButton = game.add.button(game.width - 80, 20, 'pauseButton', pauseGame, this);
    GameState.pauseButton.anchor.setTo(0.5, 0.5);
    GameState.pauseButton.scale.setTo(0.5, 0.5);

    GameState.resumeButton = game.add.button(game.width - 80, 20, 'resumeButton', resumeGame, this);
    GameState.resumeButton.anchor.setTo(0.5, 0.5);
    GameState.resumeButton.scale.setTo(0.5, 0.5);
    GameState.resumeButton.visible = false;

    // Reproducir música de juego
    this.gameMusic = game.add.audio('gameMusic');
    this.gameMusic.loopFull();
}

function update() {
    if (!gameOver) {
        // Generar un slime cada spawn_interval milisegundos
        if (!spawning) {
            game.time.events.add(spawn_interval, spawn, this, heroes[Math.floor(Math.random() * heroes.length)]);
            spawning = true;
        }
        // Reaccionar a colisiones de enemigos y proyectiles solo si no están marcados para eliminación
        game.physics.arcade.overlap(enemy_grp, projs, defeat, 
                                    function(e, p) { return !(e.asyncDestroy || p.asyncDestroy); }, 
                                    this);
    }
    
    if (enemies.length != 0) {
        let frontmost = enemies[0];
        
        // Activar game over si el slime más adelantado llega a los héroes
        if (frontmost.y > limit) {
            cleanup.enemies.push(frontmost);
            if (!gameOver) {
                setGameOver();
            }
        }
    }
    
    // Eliminar todos los objetos marcados de forma asíncrona
    cleanup.enemies.forEach(function(enemy) {
        let idx = enemies.indexOf(enemy);
        if (idx != -1) {
            enemies.splice(idx, 1);
        }
        enemy_grp.remove(enemy, true);
    }, this);
    cleanup.projectiles.forEach(function(projectile) {
        projs.remove(projectile, true);
    }, this);
}

// Generar un slime en relación con el héroe dado
function spawn(heroe) {
    let slime = enemy_grp.create(heroe.x, -10, 'slimes');
    slime.scale.set(3.5, 3.5);
    slime.animations.add('idle', heroe.slime_frames, 9, true);
    slime.animations.play('idle');
    slime.body.velocity.y = default_speed;
    spawning = false;
    enemies.push(slime);
    
    // Añadir colisión entre slime y héroes
    game.physics.arcade.overlap(slime, heroes, slimeHitHero, null, this);
}

function slimeHitHero(slime, hero) {
    // Eliminar el corazón y gestionar Game Over si todos los corazones han sido eliminados
    if (hearts.length > 0) {
        hearts.pop().destroy();
        if (hearts.length == 0) {
            setGameOver();
        }
    }
    // Eliminar el slime al impactar con el héroe
    cleanup.enemies.push(slime);
}

// Callback para la colisión entre enemigo y proyectil. Mejora la puntuación o disminuye la salud.
function defeat(enemigo, proyectil) {
    if (enemigo == enemies[0]) {
        score += 10;
        default_speed = Math.min(default_speed + SPEED_INC, MAX_SPEED);
        spawn_interval = Math.max(spawn_interval - SPAWN_DEC, MIN_SPAWN);
        score_text.setText("PUNTAJE: " + score);
        cleanup.enemies.push(enemigo);
        cleanup.projectiles.push(proyectil);
    } else {
        if (hearts.length > 0) {
            // Reducir el número de corazones visuales
            hearts.pop().destroy();
            // Si ya no quedan corazones, activar Game Over
            if (hearts.length == 0) {
                setGameOver();
            }
        }
        
        // Solo eliminar el proyectil que colisionó con el enemigo incorrecto
        cleanup.projectiles.push(proyectil);
    }
}

// Activar el estado de Game Over. Muestra un mensaje de derrota y deshabilita toda la entrada y procesamiento. También establece la puntuación.
function setGameOver() {
    gameOver = true;
    game.add.bitmapText(game.width / 2, game.height / 2, "heartbit", "GAME OVER", 72).anchor.setTo(0.5);
    game.add.bitmapText(game.width / 2, game.height / 2 + 100, "heartbit", "PUNTAJE: " + score, 48).anchor.setTo(0.5);

    // Crear botón de reintentar
    let retryButton = game.add.button(game.width / 2, game.height / 2 + 200, 'retryButton', retryGame, this);
    retryButton.anchor.setTo(0.5, 0.5);
    retryButton.scale.setTo(0.1, 0.1);

    // Deshabilitar entrada y procesamiento de juego
    game.input.disabled = true;
    game.physics.arcade.isPaused = true;

    // Detener música de juego al finalizar
    if (this.gameMusic) {
        this.gameMusic.stop();
    }
}

// Función para reintentar el juego (recargar la página)
function retryGame() {
    location.reload();
}

// Función para pausar el juego
function pauseGame() {
    console.log("Juego en pausa...");
    game.paused = true;
    GameState.pauseButton.visible = false;
    GameState.resumeButton.visible = true;

    // Permitir hacer clic en el botón de reanudar mientras el juego está en pausa
    game.input.onDown.addOnce(resumeGame, this);

    // Pausar música de juego
    if (this.gameMusic.isPlaying) {
        this.gameMusic.pause();
    }
}

// Función para reanudar el juego
function resumeGame() {
    console.log("Continuando el juego...");
    game.paused = false;
    GameState.resumeButton.visible = false;
    GameState.pauseButton.visible = true;

    // Reanudar música de juego
    if (!this.gameMusic.isPlaying) {
        this.gameMusic.resume();
    }
}

// Función simple para recuperar parámetros GET
function parse(val) {
    let result = undefined;
    let tmp = [];
    location.search
    .substr(1)
        .split("&")
        .forEach(function(item) {
        tmp = item.split("=");
        if (tmp[0] === val) result = decodeURIComponent(tmp[1]);
    });
    return result;
}

// Inicializar el juego con el estado del menú principal
game.state.add('MainMenu', MainMenuState);
game.state.add('Game', GameState);
game.state.start('MainMenu');
