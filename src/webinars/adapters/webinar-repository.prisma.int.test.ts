import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';
const asyncExec = promisify(exec);

// Increase timeout for Testcontainers + Prisma migrations
jest.setTimeout(60_000);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  // demarre la db avant tous les tests
  beforeAll(async () => {
    // Connect to database
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // Run migrations to populate the database
    await asyncExec(`DATABASE_URL=${dbUrl} npx prisma migrate deploy`);

    return prismaClient.$connect();
  });

  // nettoie la db avant chaque test
  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  // arrête la db après tous les tests
  afterAll(async () => {
    await container.stop({ timeout: 1000 });
    return prismaClient.$disconnect();
  });

  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT
      await repository.create(webinar);

      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });
  describe('repository.findById', () => {
    it('should retrieve a webinar by its ID', async () => {
      await prismaClient.webinar.create({
        data: {
          id: 'webinar-id-find',
          organizerId: 'organizer-1',
          title: 'Find Me',
          startDate: new Date('2025-01-01T10:00:00Z'),
          endDate: new Date('2025-01-01T11:00:00Z'),
          seats: 50,
        },
      });

      const result = await repository.findById('webinar-id-find');

      expect(result).not.toBeNull();
      expect(result?.props.id).toBe('webinar-id-find');
      expect(result?.props.title).toBe('Find Me');
    });

    it('should return null if webinar does not exist', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('repository.update', () => {
    it('should update an existing webinar', async () => {
      const webinar = new Webinar({
        id: 'webinar-to-update',
        organizerId: 'organizer-1',
        title: 'Initial Title',
        startDate: new Date('2025-01-01T10:00:00Z'),
        endDate: new Date('2025-01-01T11:00:00Z'),
        seats: 100,
      });
      await repository.create(webinar);

      webinar.update({
        title: 'Updated Title',
        seats: 200,
      });
      await repository.update(webinar);

      const updatedWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-to-update' },
      });
      expect(updatedWebinar?.title).toBe('Updated Title');
      expect(updatedWebinar?.seats).toBe(200);
    });
  });
});
