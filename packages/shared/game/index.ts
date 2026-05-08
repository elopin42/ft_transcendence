// Dimensions de l'image de la map
export const MAP_HEIGHT = 1536;
export const MAP_WIDTH = 2752;

// Hauteur du mur du fond de la map
export const WALL_Y = 370;

// Dimensions de l'image du joueur
export const PLAYER_HEIGHT = 2412;
export const PLAYER_WIDTH = 1760;

// Ratio de profondeur de la map
export const PLAYER_MIN_SCALE = 0.13;
export const PLAYER_MAX_SCALE = 0.30;

export const PLAYER_MIN_SPEED = 3;
export const PLAYER_MAX_SPEED = 7;

export const PLAYER_MAX_Y = MAP_HEIGHT - (PLAYER_HEIGHT * PLAYER_MAX_SCALE) / 2;
export const PLAYER_MIN_Y = WALL_Y - (PLAYER_HEIGHT * PLAYER_MIN_SCALE) / 2 + 30; // +30 offset des pieds du joueur

export const PLAYER_Y_RANGE = PLAYER_MAX_Y - PLAYER_MIN_Y;

export const DASHBOARD_SPAWN_X = MAP_WIDTH / 2;
export const DASHBOARD_SPAWN_Y = MAP_HEIGHT / 2;
export const DASHBOARD_SPAWN_SCALE = getPlayerScale(DASHBOARD_SPAWN_Y);

export const DESKTOP_WIDTH = 2020;
export const DESKTOP_HEIGHT = 536;
export const DESKTOPS = [
    { x: 2150, y: 435, scale: 0.56 },
    { x: 2350, y: 580, scale: 0.64 },
    { x: 2600, y: 755, scale: 0.76 },
    { x: 2870, y: 960, scale: 0.88 },
    { x: 3190, y: 1200, scale: 1.02 },
];

export interface PlayerBase {
    id: string;
    pseudo: string;
    x: number;
    y: number;
    scale: number;
}

export interface MovePayload {
    xVector: number;
    yVector: number;
}

export function getPlayerMaxX(scale: number): number {
    return MAP_WIDTH - (PLAYER_WIDTH * scale) / 4;
}

export function getPlayerMinX(scale: number): number {
    return (PLAYER_WIDTH * scale) / 4;
}

function linearInterpolation(min: number, max: number, t: number): number {
    return min + t * (max - min);
}

export function getPlayerScale(y: number): number {
    return linearInterpolation(PLAYER_MIN_SCALE, PLAYER_MAX_SCALE, (y - PLAYER_MIN_Y) / PLAYER_Y_RANGE);
}

export function getPlayerSpeed(y: number): number {
    return linearInterpolation(PLAYER_MIN_SPEED, PLAYER_MAX_SPEED, (y - PLAYER_MIN_Y) / PLAYER_Y_RANGE);
}

function getPlayerFeet(x: number, y: number, scale: number): { x: number; y: number, width: number, height: number } {
    const width = PLAYER_WIDTH * scale;
    const height = 256 * scale; // hauteur des pieds sur l'image du perso en scale 1 * scale actuel
    const botOffset = 45 * scale; // espace entre le bas le l'image et les pieds du perso en scale 1 * scale actuel
    return { x: x, y: y + ((PLAYER_HEIGHT * scale) / 2 - height / 2) - botOffset, width: width / 2.5, height: height };
}

function getDesktopRect(): { x: number; y: number, width: number, height: number }[] {
    let rects: { x: number; y: number, width: number, height: number }[] = [];
    for (const desktop of DESKTOPS) {
        const { x, y, scale } = desktop;
        const width = DESKTOP_WIDTH * scale;
        const height = 100 * scale; // hauteur des pieds de bureaux en scale 1 * scale actuel
        const leftOffset = 60 * scale / 2; // espace entre le bord gauche de l'image et le bureau en scale 1 * scale actuel
        rects.push({ x: x + leftOffset, y: y + (DESKTOP_HEIGHT * scale) / 2 - height / 2, width: width - leftOffset, height: height });
    }
    return rects;
}

export function movePlayer(player: PlayerBase, move: MovePayload): boolean {
    if (move.xVector === 0 && move.yVector === 0)
        return false;
    let xFail: boolean = move.xVector === 0;
    const checkHitbox = (newX: number, newY: number, newScale: number): boolean => {
        const playerFeets = getPlayerFeet(newX, newY, newScale);
        const deskHitbox = getDesktopRect();
        for (const desk of deskHitbox) {
            const overlapX = (playerFeets.x + playerFeets.width / 2 > desk.x - desk.width / 2) &&
                (playerFeets.x - playerFeets.width / 2 < desk.x + desk.width / 2);
            const overlapY = (playerFeets.y + playerFeets.height / 2 > desk.y - desk.height / 2) &&
                (playerFeets.y - playerFeets.height / 2 < desk.y + desk.height / 2);
            if (overlapX && overlapY) {
                if (move.yVector !== 0) {
                    const penLeft = Math.abs((playerFeets.x + playerFeets.width / 2) - (desk.x - desk.width / 2));
                    const penRight = Math.abs((playerFeets.x - playerFeets.width / 2) - (desk.x + desk.width / 2));
                    if (penLeft < 2 || penRight < 2) {
                        newX = penLeft < penRight ? (desk.x - desk.width / 2) - playerFeets.width / 2 : (desk.x + desk.width / 2) + playerFeets.width / 2;
                        break;
                    }
                }
                return false;
            }
        }
        player.x = newX;
        player.y = newY;
        player.scale = newScale;
        return true;
    };
    if (move.xVector !== 0) {
        let x = player.x + getPlayerSpeed(player.y) * move.xVector;
        x = Math.max(getPlayerMinX(player.scale), Math.min(getPlayerMaxX(player.scale), x));
        if (!checkHitbox(x, player.y, player.scale))
            xFail = true;
    }
    if (move.yVector !== 0) {
        let y = player.y + getPlayerSpeed(player.y) * move.yVector;
        y = Math.max(PLAYER_MIN_Y, Math.min(PLAYER_MAX_Y, y));
        let scale = getPlayerScale(y);
        if (!checkHitbox(player.x, y, scale) && xFail)
            return false;
    }
    return true;
}