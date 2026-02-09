import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('message')
@UseGuards(JwtGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * Send message
   */
  @Post()
  sendMessage(@Body() dto: CreateMessageDto, @Req() req) {
    return this.messageService.sendMessage(req.user.id, dto.content, dto.loanId, dto.receiverId);
  }

  /**
   * Get all messages for current user
   */
  @Get()
  getMessages(@Req() req) {
    return this.messageService.getMessagesForUser(req.user.id);
  }

  /**
   * Get conversation with specific user
   */
  @Get('conversation/:otherUserId')
  getConversation(@Param('otherUserId') otherUserId: string, @Req() req) {
    return this.messageService.getConversation(req.user.id, otherUserId);
  }

  /**
   * Get messages for specific loan
   */
  @Get('loan/:loanId')
  getMessagesForLoan(@Param('loanId') loanId: string, @Req() req) {
    return this.messageService.getMessagesForLoan(loanId, req.user.id);
  }

  /**
   * Mark message as read
   */
  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Req() req) {
    return this.messageService.markAsRead(id, req.user.id);
  }
}
