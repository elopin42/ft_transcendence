import {
    MAP_HEIGHT,
    MAP_WIDTH,
    PLAYER_HEIGHT,
    type PlayerBase,
    WALL_Y
} from '@ftt/shared/game';

export const SPAWN_Y_PLAYERS = 660;
export const SPAWN_X_PLAYER_1 = 330;
export const SPAWN_X_PLAYER_2 = 2400;

export const PLAYER_FEET_WIDTH = 100;
export const PLAYER_FEET_HEIGHT = 100;

export const BALL_VX = 10;
export const BALL_VY = 6;
export const BALL_SIZE = 40;
export const SPAWN_X_BALL = 1340;
export const SPAWN_Y_BALL = 690;

export const BALL_MIN_Y = WALL_Y + BALL_SIZE;
export const BALL_MAX_Y = MAP_HEIGHT - BALL_SIZE;
export const BALL_Y_RANGE = BALL_MAX_Y - BALL_MIN_Y;
export const BALL_MIN_X = BALL_SIZE;
export const BALL_MAX_X = MAP_WIDTH - BALL_SIZE;

export const MAX_POINTS = 5;

export function clampNb(min: number, max: number, nb: number) {
    return Math.max(min, Math.min(max, nb))
}

export function feetBallCollision(ballX: number, ballY: number, playerX: number, playerY: number, playerScale:number): boolean {
    const playerFeetY = playerY + (PLAYER_HEIGHT / 2) * playerScale;
    return (ballY <= playerFeetY && ballY >= playerFeetY - PLAYER_FEET_WIDTH)
        && (ballX <= playerX + (PLAYER_FEET_HEIGHT / 2)
        && ballX >= playerX - (PLAYER_FEET_HEIGHT / 2));
}

export interface Player extends PlayerBase {
    pnumber: number;
    win: number;
    isAI: boolean;
    twoPlayer: boolean;
}