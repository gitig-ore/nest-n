import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Send a message - supports both peminjam->admin and admin->peminjam
   */
  async sendMessage(senderId: string, content: string, loanId?: string, receiverId?: string) {
    let actualReceiverId: string;
    
    // If receiverId is provided (admin sending to user), use it directly
    if (receiverId) {
      actualReceiverId = receiverId;
    } else {
      // Otherwise find an admin to send the message to (peminjam sending to admin)
      const admin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      
      if (!admin) {
        throw new Error('No admin found');
      }
      actualReceiverId = admin.id;
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: actualReceiverId,
        loanId: loanId || null,
      },
      include: {
        sender: {
          select: { id: true, nama: true, role: true },
        },
        receiver: {
          select: { id: true, nama: true, role: true },
        },
        loan: {
          select: { id: true, barang: { select: { namaBarang: true } } },
        },
      },
    });

    return {
      success: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  /**
   * Get messages for a user (both sent and received) - optimized with limit
   */
  async getMessagesForUser(userId: string, limit: number = 20) {
    const [sentMessages, receivedMessages, unreadCount] = await Promise.all([
      this.prisma.message.findMany({
        where: { senderId: userId },
        include: {
          receiver: { select: { id: true, nama: true, role: true } },
          loan: { select: { id: true, barang: { select: { namaBarang: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.message.findMany({
        where: { receiverId: userId },
        include: {
          sender: { select: { id: true, nama: true, role: true } },
          loan: { select: { id: true, barang: { select: { namaBarang: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.message.count({
        where: { receiverId: userId, isRead: false },
      }),
    ]);

    // Combine and sort all messages
    const allMessages = [...sentMessages, ...receivedMessages].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ).slice(0, limit);

    return {
      success: true,
      messages: allMessages,
      unreadCount,
    };
  }

  /**
   * Get conversation with a specific user
   */
  async getConversation(userId: string, otherUserId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      include: {
        sender: { select: { id: true, nama: true, role: true } },
        receiver: { select: { id: true, nama: true, role: true } },
        loan: { select: { id: true, barang: { select: { namaBarang: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      messages,
    };
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.receiverId !== userId) {
      throw new Error('Message not found or access denied');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    return { success: true, message: 'Message marked as read' };
  }

  /**
   * Get messages for a specific loan
   */
  async getMessagesForLoan(loanId: string, userId: string) {
    const messages = await this.prisma.message.findMany({
      where: { loanId },
      include: {
        sender: { select: { id: true, nama: true, role: true } },
        receiver: { select: { id: true, nama: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      messages,
    };
  }
}
