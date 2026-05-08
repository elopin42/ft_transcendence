import {
    MAP_HEIGHT,
    MAP_WIDTH,
    PLAYER_MIN_Y,
    PLAYER_MAX_Y,
    type PlayerBase,
    type MovePayload,
    getPlayerScale,
    getPlayerFeet,
    getPlayerSpeed,
    getPlayerMinX,
    getPlayerMaxX,
} from '@ftt/shared/game';

export const SPAWN_X = MAP_WIDTH / 2;
export const SPAWN_Y = MAP_HEIGHT / 2;
export const SPAWN_SCALE = getPlayerScale(SPAWN_Y);

export const DESKTOP_WIDTH = 2020;
export const DESKTOP_HEIGHT = 536;
export const DESKTOPS = [
    { x: 2150, y: 435, scale: 0.56 },
    { x: 2350, y: 580, scale: 0.64 },
    { x: 2600, y: 755, scale: 0.76 },
    { x: 2870, y: 960, scale: 0.88 },
    { x: 3190, y: 1200, scale: 1.02 },
];

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