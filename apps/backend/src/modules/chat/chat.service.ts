import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ChannelType, ChannelMemberRole } from '@prisma/client';

@Injectable()
export class ChatService {
    constructor(private readonly prisma: PrismaService) {}

    async createChannel(ownerId: number, name: string, type: ChannelType, password?: string) {
        return this.prisma.channel.create({
            data: {
                name,
                type,
                password,
                ownerId,
                members: {
                    create: {
                        userId: ownerId,
                        role: ChannelMemberRole.OWNER,
                    },
                },
            },
        });
    }

    async joinChannel(userId: number, channelId: number) {
        return this.prisma.channelMember.create({
            data: {
                userId,
                channelId,
                role: ChannelMemberRole.MEMBER,
            },
        });
    }

    async sendMessage(authorId: number, channelId: number, content: string) {
        const member = await this.prisma.channelMember.findUnique({
            where: { userId_channelId: { userId: authorId, channelId } },
        });

        if (!member) throw new Error('Not a member of this channel');

        return this.prisma.message.create({
            data: { content, authorId, channelId },
        });
    }

    async getMessages(channelId: number) {
        return this.prisma.message.findMany({
            where: { channelId },
            include: {
                author: {
                    select: { id: true, login: true, avatarUrl: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
}
