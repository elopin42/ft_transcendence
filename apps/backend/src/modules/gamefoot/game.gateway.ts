import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TokenService } from '@/modules/auth/services/token.service';
import { UsersService } from '@/modules/users/services/users.service';
import { getPlayerScale, getPlayerSpeed, PLAYER_HEIGHT, PLAYER_MAX_Y, PLAYER_MIN_Y } from '@ftt/shared/game';
import {
    BALL_MAX_X,
    BALL_MAX_Y,
    BALL_MIN_X,
    BALL_MIN_Y,
    BALL_VX,
    BALL_VY,
    BALL_Y_RANGE,
    clampNb,
    feetBallCollision,
    MAX_POINTS,
    type Player,
    PLAYER_FEET_HEIGHT,
    PLAYER_FEET_WIDTH,
    SPAWN_X_BALL,
    SPAWN_X_PLAYER_1,
    SPAWN_X_PLAYER_2,
    SPAWN_Y_BALL,
    SPAWN_Y_PLAYERS
} from '@ftt/shared/game/foot';

interface ballon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  start: boolean;
  finish: boolean;
}

interface Room {
  bal: ballon;
  player1: Player | null;
  player2: Player | null;
  interval?: any;
  targetYAI: number | null;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://localhost', // fallback HTTPS car nginx gère le SSL
    credentials: true
  },
  namespace: 'gamefoot'
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('GameFootGateway');

  @WebSocketServer()
  server!: Server; // évité que typescript mette une erreur sait que ce sera initialisé

  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) { }

  // en gros une sorte de tableau ou une room contient 2 player 
  rooms = new Map<number, Room>();
  clientRoom = new Map<string, number>(); // socketId -> roomId

  private getAvailableRoomId(): number {
    let i = 1;
    while (this.rooms.has(i)) i++;
    return i; // retourne la first room avaible
  }

  private getRoomAndRoomId(clientId: string): [Room | null, number | null] {
    const roomId = this.clientRoom.get(clientId);
    if (!roomId)
      return [null, null];
    const room = this.rooms.get(roomId);
    if (!room)
      return [null, roomId];
    return [room, roomId];
  }

  /**
   * @brief Replace a null player by a bot in the given room
   * @return True if the bot have been successfully added to the room else false
   */
  private addBotToRoom(room: Room, roomId: number): boolean {
    let pnumber: number;
    
    if (!room.player1)
      pnumber = 1;
    else if (!room.player2)
      pnumber = 2;
    else
      return false;
    const startX = pnumber === 1 ? SPAWN_X_PLAYER_1 : SPAWN_X_PLAYER_2;
    const newPlayer: Player = {
      id: 'AI_' + roomId,
      pnumber: pnumber,
      pseudo: 'AI',
      x: startX,
      y: SPAWN_Y_PLAYERS,
      scale: getPlayerScale(SPAWN_Y_PLAYERS),
      win: 0,
      isAI: true,
      twoPlayer: false,
    };
    if (pnumber === 1) room.player1 = newPlayer;
    else room.player2 = newPlayer;
    return true;
  }

  async handleConnection(client: any) {
    // Le cookie d'auth s'appelle access_token (cf. cookie.helper.ts).
    const cookie = client.handshake.headers.cookie;
    const token = cookie?.split(';')
      .find((c: string) => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.tokenService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new WsException('User not found');
      const login = user.login;
      this.logger.log(`Player connected: ${login} (client ${client.id})`);
      let roomId: number | null = null;
      for (const [id, room] of this.rooms) {
        if (room.player2 === null) { roomId = id; break; }
      };
      if (roomId === null) {
        // si aucune room attent un joeur on cree
        roomId = this.getAvailableRoomId();
        this.rooms.set(roomId, {
          bal: { x: SPAWN_X_BALL, y: SPAWN_Y_BALL, vx: BALL_VX, vy: BALL_VY, start: false, finish: false },
          player1: { id: client.id, pnumber: 1, pseudo: login, x: SPAWN_X_PLAYER_1, y: SPAWN_Y_PLAYERS, scale: 0, win: 0, isAI: false, twoPlayer: false },
          player2: null,
          targetYAI: null,
        });
      } else {
        // sinon join
        const existing = this.rooms.get(roomId);
        if (!existing || existing.bal.finish) return;
        existing.player2 = { id: client.id, pnumber: 2, pseudo: login, x: SPAWN_X_PLAYER_2, y: SPAWN_Y_PLAYERS, scale: 0, win: 0, isAI: false, twoPlayer: false };
      }
      this.clientRoom.set(client.id, roomId);
      client.join(roomId.toString());
      const room = this.rooms.get(roomId)!;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'auth failed';
      this.logger.warn(`Player disconnected during auth: ${message}`);
      client.emit('error', { message });
      client.disconnect();
    }
  }

  /**
   * @brief Handles client disconnection and replace that client by a 
   * bot if the room is not empty (Julien : bot IA)
   */
  handleDisconnect(client: any) {
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    // supprimer le joueur de la room
    if (room.player1?.id === client.id) room.player1 = null;
    else room.player2 = null;
    this.clientRoom.delete(client.id);
    if (!room.player1 && !room.player2) {
      this.rooms.delete(roomId);
      return;
    }
    this.addBotToRoom(room, roomId);
    this.server.to(roomId.toString()).emit('players', {
      players: [room.player1, room.player2].filter(p => p !== null),
      bal: room.bal
    });
  }

  @SubscribeMessage('twoPlayer')
  handleTwoPlayer(client: any, payload: { twoPlayer: boolean }) {
    if (typeof payload?.twoPlayer !== 'boolean') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    const player = room.player1?.id === client.id ? room.player1 : (room.player2?.id === client.id ? room.player2 : null);
    if (!player) return;
    console.log(`Player ${player.pseudo} in room ${roomId} set twoPlayer mode to ${payload.twoPlayer}`);
    player.twoPlayer = payload.twoPlayer;
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number; scale: number }) {
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    const updatePlayer = (player: Player) => {
      player.x = payload.x;
      player.y = payload.y;
      player.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    };
    if (room.player1 && room.player1.id === client.id) updatePlayer(room.player1);
    else if (room.player2 && room.player2.id === client.id) updatePlayer(room.player2);
  }

  // Mode 2 joueurs sur le meme ecran (Ethan)
  @SubscribeMessage('move2')
  handleMove2(client: any, payload: { x: number; y: number; scale: number }) {
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    if (room.player1?.isAI || room.player2?.isAI) return; // pas de mode 2 joueurs si un des deux joueurs est un bot
    if(!room.player1 || !room.player2) return;
    if (!room.player1.twoPlayer || !room.player2.twoPlayer) return; // les deux joueurs doivent avoir le mode 2 joueurs activé
    const updatePlayer = (player: Player) => {
      player.x = payload.x;
      player.y = payload.y;
      player.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    };
    if (room.player2 && room.player1 && room.player2.id === client.id) updatePlayer(room.player1);
    else if (room.player1 && room.player2 && room.player1.id === client.id) updatePlayer(room.player2);
  }

  private predictBallY(bal: ballon, targetX: number): number {
    let predictedY = bal.y + bal.vy * (Math.abs(targetX - bal.x) / Math.abs(bal.vx));
    predictedY -= BALL_MIN_Y;
    const ballOrientation = Math.abs(predictedY) % (BALL_Y_RANGE * 2);
    const predictedYBase = ballOrientation > BALL_Y_RANGE ? (BALL_Y_RANGE * 2) - ballOrientation : ballOrientation;
    return (BALL_MIN_Y + predictedYBase);
  }

  private moveAI(room: Room) {
    const ai = room.player1?.isAI ? room.player1 : (room.player2?.isAI ? room.player2 : null);
    if (!ai)
      return;

    const bal = room.bal;
    const isPlayer1 = ai.pnumber === 1;
    const ballHeadingToAI = isPlayer1 ? bal.vx < 0 : bal.vx > 0;

    if (ballHeadingToAI) {
      if (room.targetYAI === null) {
        let predictedY = this.predictBallY(bal, ai.x - (PLAYER_FEET_WIDTH / 2));
        let targetY = predictedY;
        for (let i = 0; i < 5; i++) {
            const scale = getPlayerScale(targetY);
            targetY = predictedY - (PLAYER_HEIGHT * scale / 2 - PLAYER_FEET_HEIGHT / 2);
            targetY = clampNb(PLAYER_MIN_Y, PLAYER_MAX_Y, targetY);
        }
        room.targetYAI = targetY;
        // On nerf l'ia en faussant légèrement la prédiction, <= 100 = 100% de placement, 200 = 50% de placement, etc
        // Les % sont pas exactes, ça dépends de la hitbox des pieds (plus la hitbox est longue en x plus le % de placement sera élevé), mais ça donne une idée
        const imprecision = 200;
        // [-0.5, 0.5] * imprecision
        room.targetYAI += (Math.random() - 0.5) * imprecision;
        room.targetYAI = clampNb(PLAYER_MIN_Y, PLAYER_MAX_Y, room.targetYAI);
      }
    } else {
      room.targetYAI = null;
    }
    const speed = getPlayerSpeed(ai.y);
    const diff = (room.targetYAI ?? SPAWN_Y_PLAYERS) - ai.y;
    if (Math.abs(diff) > speed)
      ai.y += speed * Math.sign(diff);
    ai.y = clampNb(PLAYER_MIN_Y, PLAYER_MAX_Y, ai.y);
    ai.scale = getPlayerScale(ai.y);
  }

  /**
   * @brief Start the game.
   * If the player is alone, add a bot as second player (Julien)
   */
  @SubscribeMessage('start')
  handlestart(client: any) {
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId) return;
    this.logger.debug(`Match start requested in room ${roomId}`);
    if (room.bal.start || room.bal.finish) return;
    room.bal.start = true;
    // Si il manque un joueur on ajoute un bot pour combler
    if ((!room.player1 && room.player2) || (room.player1 && !room.player2))
      this.addBotToRoom(room, roomId);
    room.interval = setInterval(() => {
      if (room.player1 && room.player2) {
        room.bal.x += room.bal.vx;
        room.bal.y += room.bal.vy;
        this.moveAI(room);
        if (room.bal.y <= BALL_MIN_Y || room.bal.y >= BALL_MAX_Y)
          room.bal.vy *= -1; // rebondit sur les murs haut et bas
        if (feetBallCollision(room.bal.x, room.bal.y, room.player1.x, room.player1.y, room.player1.scale))
          room.bal.vx = Math.abs(room.bal.vx);
        else if (feetBallCollision(room.bal.x, room.bal.y, room.player2.x, room.player2.y, room.player2.scale))
          room.bal.vx = -Math.abs(room.bal.vx);
        else if ((room.bal.x <= BALL_MIN_X || room.bal.x >= BALL_MAX_X) || (room.player1.win >= MAX_POINTS || room.player2.win >= MAX_POINTS)) {
          if (room.bal.x <= BALL_MIN_X)
            room.player1.pnumber == 2 ? room.player1.win++ : room.player2.win++; // +1 win pour le joueur qui marque
          else if (room.bal.x >= BALL_MAX_X)
            room.player2.pnumber == 1 ? room.player2.win++ : room.player1.win++;
          // si un joueur a gagne MAX_POINTS fois, fin du match
          if (room.player1.win >= MAX_POINTS || room.player2.win >= MAX_POINTS) {
            // On envoie a la DB QUE si le gagnant n est PAS un bot AI
            if ((room.player1.win >= MAX_POINTS && !room.player1.isAI) || (room.player2.win >= MAX_POINTS && !room.player2.isAI)) {
              const login = room.player1.win >= MAX_POINTS ? room.player1.pseudo : room.player2.pseudo;
              this.prisma.user.update({
                where: { login },
                data: { points: { increment: 1 } }
              }).catch(e => this.logger.error(`Failed to update winner points: ${e?.message ?? e}`, e?.stack));
            }
            room.bal.finish = true;
          }
          room.bal.x = SPAWN_X_BALL;
          room.bal.y = SPAWN_Y_BALL;
          room.bal.start = false;
          // Reset Y des deux joueurs au point marque (Julien)
          room.player1.y = SPAWN_Y_PLAYERS;
          room.player2.y = SPAWN_Y_PLAYERS;
          room.targetYAI = null;
          clearInterval(room.interval);
          room.interval = null;
        }
        this.server.to(roomId.toString()).emit('players', {
          players: [room.player1, room.player2].filter(p => p !== null),
          bal: { x: room.bal.x, y: room.bal.y }
        });
      } else {
        // Avec le bot ce cas ne devrait plus arriver, mais on garde le clean au cas ou
        if (room.interval) {
          clearInterval(room.interval);
          room.interval = null;
        }
        room.bal.start = false;
      }
    }, 16);
  }
}
