(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/app/dashboard/PhaserGame.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>PhaserGame
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/node_modules/socket.io-client/build/esm/index.js [app-client] (ecmascript) <locals>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
class GameScene extends __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Scene {
    player;
    deskGroup;
    cursors;
    socket;
    timep = 0;
    otherPlayers = new Map();
    preload() {
        this.load.image('map', '/map.png');
        this.load.spritesheet('nass-frame', '/character/nass/nass-allframe-right.png', {
            frameWidth: 1760,
            frameHeight: 2412
        });
        this.load.image('nass-front', '/character/nass/nass-front.png');
        this.load.image('desk', '/desk.png');
    }
    create() {
        const map = this.add.image(0, 0, 'map').setOrigin(0, 0);
        this.scale.resize(map.width, map.height);
        this.deskGroup = this.physics.add.staticGroup();
        const setupDesk = (x, y, scale)=>{
            const d = this.deskGroup.create(x, y, 'desk').setScale(scale).setDepth(y);
            // largeur et hauteur du body en pixels scalés
            const bw = 2020 * scale;
            const bh = 107 * scale;
            // offset Y en pixels scalés (429 = position de la surface de la table dans l'image originale)
            const offY = 429 * scale;
            // repositionne le body manuellement : centré en X, aligné sur la surface de la table en Y
            d.body.reset(x, y - 536 * scale / 2 + offY + bh / 2);
            d.body.setSize(bw, bh, false);
            return d;
        };
        setupDesk(2128, 443, 0.49);
        setupDesk(2356, 607, 0.62);
        setupDesk(2546, 795, 0.70);
        setupDesk(2889, 1010, 0.92);
        setupDesk(3179, 1263, 1.06);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.socket = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$socket$2e$io$2d$client$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["io"])('/world', {
            withCredentials: true,
            reconnection: false
        });
        this.socket.on('players', (players)=>{
            console.log('joueurs connectés:', players);
            const activeIds = new Set(players.map((p)=>p.id));
            this.otherPlayers.forEach((player, id)=>{
                if (!activeIds.has(id)) {
                    player.sprite.destroy();
                    player.login.destroy();
                    this.otherPlayers.delete(id);
                }
            });
            players.forEach((p)=>{
                if (p.id === this.socket.id) return;
                if (!this.otherPlayers.has(p.id)) {
                    const sprite = this.add.sprite(p.x, p.y, 'nass-front').setScale(0.35);
                    const scales = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const labelOffset = 2412 * scales / 2 + 20;
                    const login = this.add.text(p.x, p.y - labelOffset, p.pseudo, {
                        fontSize: '20px',
                        color: '#ff0000',
                        stroke: '#000000'
                    }).setOrigin(0.5);
                    this.otherPlayers.set(p.id, {
                        login,
                        sprite,
                        ox: p.x,
                        oy: p.y
                    });
                } else {
                    const timeo = Date.now();
                    const sprite = this.otherPlayers.get(p.id);
                    if (!sprite) return;
                    sprite.sprite.setPosition(p.x, p.y);
                    const scale = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Math.Linear(0.15, 0.35, (p.y - 280) / (1150 - 280));
                    const labelOffset = 2412 * scale / 2 + 20;
                    sprite.login.setPosition(p.x, p.y - labelOffset);
                    sprite.sprite.setScale(scale);
                    if (timeo - this.timep < 50) return;
                    this.timep = timeo;
                    if (p.x != sprite.ox || p.y != sprite.oy) {
                        sprite.sprite.setFlipX(p.x < sprite.ox);
                        sprite.sprite.play('walk-right', true);
                    } else {
                        sprite.sprite.stop();
                        sprite.sprite.setTexture('nass-front');
                    }
                    sprite.ox = p.x;
                    sprite.oy = p.y;
                }
            });
        });
        this.player = this.physics.add.sprite(500, 1000, 'nass-front').setScale(0.35);
        this.physics.add.collider(this.player, this.deskGroup);
        this.player.setSize(400, 200).setOffset(680, 2200);
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('nass-frame', {
                start: 2,
                end: 0
            }),
            frameRate: 4,
            repeat: -1
        });
    }
    update() {
        const speed = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Math.Linear(3, 7, (this.player.y - 250) / (1150 - 250)) * 60;
        const moving = this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
            this.player.play('walk-right', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
            this.player.play('walk-right', true);
        } else {
            this.player.setVelocityX(0);
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.play('walk-right', true);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            if (!this.cursors.left.isDown && !this.cursors.right.isDown) this.player.play('walk-right', true);
        } else {
            this.player.setVelocityY(0);
        }
        if (!moving) {
            this.player.stop();
            this.player.setTexture('nass-front');
        }
        this.player.x = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Math.Clamp(this.player.x, 50, 2680);
        this.player.y = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Math.Clamp(this.player.y, 225, 1150);
        if (this.socket.connected) this.socket.emit('move', {
            x: this.player.x,
            y: this.player.y
        });
        const scale = __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Math.Linear(0.13, 0.30, (this.player.y - 280) / (1150 - 280));
        this.player.setScale(scale);
        this.player.setDepth(this.player.body.bottom);
    }
}
function PhaserGame() {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PhaserGame.useEffect": ()=>{
            const game = new __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Game({
                width: 1280,
                height: 720,
                parent: ref.current,
                scene: GameScene,
                physics: {
                    default: 'arcade',
                    arcade: {
                        debug: true
                    }
                },
                scale: {
                    mode: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Scale.FIT,
                    autoCenter: __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Scale.CENTER_BOTH
                }
            });
            return ({
                "PhaserGame.useEffect": ()=>game.destroy(true)
            })["PhaserGame.useEffect"];
        }
    }["PhaserGame.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Ecole$2f$42$2f$Cursus$2f$ft_transcendence$2f$frontend$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: ref,
        style: {
            width: '100vw',
            height: '100vh'
        }
    }, void 0, false, {
        fileName: "[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/app/dashboard/PhaserGame.tsx",
        lineNumber: 167,
        columnNumber: 12
    }, this);
}
_s(PhaserGame, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = PhaserGame;
var _c;
__turbopack_context__.k.register(_c, "PhaserGame");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/app/dashboard/PhaserGame.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/Documents/Ecole/42/Cursus/ft_transcendence/frontend/app/dashboard/PhaserGame.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=0m4n_Ecole_42_Cursus_ft_transcendence_frontend_app_dashboard_PhaserGame_tsx_13_wvmk._.js.map