import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    try {
      return await this.prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`Failed to fetch tasks for user ${userId}`, errorStack);
      throw new InternalServerErrorException('Error retrieving tasks');
    }
  }

  async findOne(id: string, userId: string) {
    // Usamos una query combinada para validar existencia y propiedad en un solo paso
    const task = await this.prisma.task.findFirst({
      where: { id, userId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found or access denied`);
    }

    return task;
  }

  async create(userId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        ...dto,
        // Manejo robusto de fechas
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        user: { connect: { id: userId } }, // Usar relaciones de Prisma es más limpio
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateTaskDto) {
    try {
      // ATÓMICO: Intentamos actualizar directamente con el filtro de userId
      // Esto evita la doble consulta (findOne + update)
      return await this.prisma.task.update({
        where: { id, userId }, // Prisma permite filtrar por campos únicos + otros en update
        data: {
          ...dto,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Task "${id}" not found`);
      }
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    try {
      // Borrado atómico por seguridad y performance
      await this.prisma.task.delete({
        where: { id, userId },
      });
      return { deleted: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Task "${id}" not found`);
      }
      throw error;
    }
  }
}