import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaCLient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const 
}
}
