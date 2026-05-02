import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';


interface Player {
  id: string; // socketId
  pnumber: number;
  pseudo: string;
  x: number;
  y: number;
  scale: number;
  win: number;
  isAI: boolean;
}

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
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'https://localhost', // fallback HTTPS car nginx gère le SSL
    credentials: true
  },
  namespace: 'gamefoot'
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server; // évité que typescript mette une erreur sait que ce sera initialisé

  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
  ) { }

  // en gros une sorte de tableau ou une room contient 2 player 
  rooms = new Map<number, Room>();
  clientRoom = new Map<string, number>(); // socketId → roomId

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
   *  */
  private addBotToRoom(room: Room, roomId: number): boolean {
    let pnumber: number;
    
    if (!room.player1)
      pnumber = 1;
    else if (!room.player2)
      pnumber = 2;
    else
      return false;
    room["player" + pnumber.toString()] = {
      id: "AI_" + roomId,
      pnumber: pnumber,
      pseudo: "AI",
      x: 0, y: 0,
      scale: 0,
      win: 0,
      isAI: true
    };
    return true;
  }

  async handleConnection(client: any) {
    const cookie = client.handshake.headers.cookie;
    console.log(cookie);
    const token = cookie?.split(';')
      .find((c: string) => c.trim().startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const login = await this.authService.gamelogin(token);
      console.log(login);
      let roomId: number | null = null;
      for (const [id, room] of this.rooms) {
        if (room.player2 === null) { roomId = id; break; }
      };
      if (roomId === null) {
        // si aucune room attent un joeur on cree
        roomId = this.getAvailableRoomId();
        this.rooms.set(roomId, { bal: { x: 1340, y: 690, vx: 10, vy: 6, start: false, finish: false }, player1: { id: client.id, pnumber: 1, pseudo: login, x: 0, y: 0, scale: 0, win: 0, isAI: false }, player2: null });
      } else {
        // sinon join
        const existing = this.rooms.get(roomId);
        if (!existing) return;
        if (existing.bal.finish) return;
        existing.player2 = { id: client.id, pnumber: 2, pseudo: login, x: 0, y: 0, scale: 0, win: 0, isAI: false };
      }
      this.clientRoom.set(client.id, roomId);
      client.join(roomId.toString());
      const room = this.rooms.get(roomId)!;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
      console.log("connect");
    } catch (error) {
      const message = error instanceof Error ? error.message : 'auth failed';
      console.log("disconnect");
      console.log(error);
      client.emit('error', { message });
      client.disconnect();
    }
  }

  /**
   * @brief Handles client disconnection and replace that client by a 
   * bot if the room is not empty
   */
  handleDisconnect(client: any) {
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId)
      return;
    // supprimer le joueur de la room
    if (room.player1?.id === client.id) room.player1 = null;
    else room.player2 = null;
    this.clientRoom.delete(client.id);
    if (!room.player1 && !room.player2) {
      this.rooms.delete(roomId);

      //Déjà supprimé avant le if non ?
      this.clientRoom.delete(client.id);
      return;
    }
    this.addBotToRoom(room, roomId);
    this.server.to(roomId.toString()).emit('players', {
      players: [room.player1, room.player2].filter(p => p !== null),
      bal: room.bal
    });
  }

  @SubscribeMessage('move')
  handleMove(client: any, payload: { x: number; y: number; scale: number }) {
    // Valider le payload (par exemple, vérifier que x et y sont des nombres)
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId)
      return;
    const updatePlayer = (player: Player) => {
      player.x = payload.x;
      player.y = payload.y;
      player.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    }
    if (room.player1 && room.player1.id === client.id)
      updatePlayer(room.player1);
    else if (room.player2 && room.player2.id === client.id)
      updatePlayer(room.player2);
  }

  //pour jouer a deux sur le meme ecran
  @SubscribeMessage('move2')
  handleMove2(client: any, payload: { x: number; y: number; scale: number }) {
    // Valider le payload (par exemple, vérifier que x et y sont des nombres)
    if (typeof payload?.x !== 'number' || typeof payload?.y !== 'number') return;
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId)
      return;
    const updatePlayer = (player: Player) => {
      player.x = payload.x;
      player.y = payload.y;
      player.scale = payload.scale;
      this.server.to(roomId.toString()).emit('players', {
        players: [room.player1, room.player2].filter(p => p !== null),
        bal: room.bal
      });
    }
    if (room.player2 && room.player1 && room.player2?.id === client.id)
      updatePlayer(room.player1);
    else if (room.player1 && room.player2 && room.player1.id === client.id)
      updatePlayer(room.player2);
  }

  /**
   * @brief Start the game\
   * If the player is alone, add a bot as player 2
   */
  @SubscribeMessage('start')
  handlestart(client: any) {
    console.log("start");
    const [room, roomId] = this.getRoomAndRoomId(client.id);
    if (!room || !roomId)
      return;
    console.log("start boucle");
    if (room.bal.start || room.bal.finish) return;
    room.bal.start = true;
    // Add bot if there is only 1 player in the room
    if ((!room.player1 && room.player2) || (room.player1 && !room.player2))
      this.addBotToRoom(room, roomId);
    room.interval = setInterval(() => {
      // Il est pas censé y avoir de joueur set a null a ce moment là je pense que le if sert a rien
      if (room.player1 && room.player2) {
        room.bal.x += room.bal.vx;
        room.bal.y += room.bal.vy;
        // console.log(room.bal.x);
        // console.log(room.bal.y);
        const shouldBallBounce = (ball: ballon, player: Player): boolean => {
          // pour detecter le pied du joueur
          const playerFoot = player.y + (2412 / 2) * player.scale;
          return (ball.y <= playerFoot && ball.y >= playerFoot - 100) && (ball.x <= player.x + 50 && ball.x >= player.x - 50);
        }
        if (room.bal.y <= 410 || room.bal.y >= 1480) room.bal.vy *= -1; // rebondit sur les murs haut et bas
        if (shouldBallBounce(room.bal, room.player1) || shouldBallBounce(room.bal, room.player2))
          room.bal.vx *= -1; // Bounce on players foot
        else if ((room.bal.x <= 50 || room.bal.x >= 2680) || (room.player1.win >= 5 || room.player2.win >= 5)) {
          if (room.bal.x <= 50)
            room.player1.pnumber == 2 ? room.player1.win++ : room.player2.win++; // +1 en win pour le joueur qui a marqué
          else if (room.bal.x >= 2680)
            room.player2.pnumber == 1 ? room.player2.win++ : room.player1.win++; //inversement pour le joueur 2
          // si un joueur a gagné 5 fois, fin du match
          if (room.player1.win >= 5 || room.player2.win >= 5) {
            const login = room.player1.win == 5 ? room.player1.pseudo : room.player2.pseudo;
            this.prisma.user.update({
              where: { login },
              data: { points: { increment: 1 } }
            }).catch(e => console.log(e));
            room.bal.finish = true;
          }
          room.bal.x = 1340;
          room.bal.y = 690;
          room.bal.start = false;
          clearInterval(room.interval);
          room.interval = null;
          return;
        }
        this.server.to(roomId.toString()).emit('players', {
          players: [room.player1, room.player2].filter(p => p !== null),
          bal: { x: room.bal.x, y: room.bal.y }
        });
      }
      // Inutile avec le bot
      else {
        console.log("manque joueur");
      }
    }, 16);

  }
}
