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

export function getPlayerFeet(x: number, y: number, scale: number): { x: number; y: number, width: number, height: number } {
    const width = PLAYER_WIDTH * scale;
    const height = 256 * scale; // hauteur des pieds sur l'image du perso en scale 1 * scale actuel
    const botOffset = 45 * scale; // espace entre le bas le l'image et les pieds du perso en scale 1 * scale actuel
    return { x: x, y: y + ((PLAYER_HEIGHT * scale) / 2 - height / 2) - botOffset, width: width / 2.5, height: height };
}