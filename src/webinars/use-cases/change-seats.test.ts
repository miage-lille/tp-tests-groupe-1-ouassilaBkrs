import { testUser } from 'src/users/tests/user-seeds';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Webinar } from 'src/webinars/entities/webinar.entity';

describe('Feature : Change seats', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const alice = testUser.alice;

  beforeEach(() => {
    const webinar = new Webinar({
      id: 'webinar-id',
      organizerId: alice.props.id,
      title: 'Webinar title',
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-01T01:00:00Z'),
      seats: 100,
    });

    webinarRepository = new InMemoryWebinarRepository([webinar]);
    useCase = new ChangeSeats(webinarRepository);
  });

  describe('Scenario: Happy path', () => {
    const payload = {
      user: alice,
      webinarId: 'webinar-id',
      seats: 200,
    };

    it('should change the number of seats for a webinar', async () => {
      await whenUserChangeSeatsWith(payload);
      thenUpdatedWebinarSeatsShouldBe(200);
    });
  });

  // id n'existe pas
  describe('Scenario: webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'unknown-id',
      seats: 200,
    };

    it('should fail', async () => {
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        'Webinar not found',
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.bob,
        webinarId: 'webinar-id',
        seats: 200,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        'User is not allowed to update this webinar',
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 50,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        'You cannot reduce the number of seats',
      );
      expectWebinarToRemainUnchanged();
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    it('should fail', async () => {
      const payload = {
        user: testUser.alice,
        webinarId: 'webinar-id',
        seats: 1001,
      };
      await expect(whenUserChangeSeatsWith(payload)).rejects.toThrow(
        'Webinar must have at most 1000 seats',
      );
      expectWebinarToRemainUnchanged();
    });
  });

  // Fixtures
  function expectWebinarToRemainUnchanged() {
    const webinar = webinarRepository.findByIdSync('webinar-id');
    expect(webinar?.props.seats).toEqual(100);
  }

  function thenUpdatedWebinarSeatsShouldBe(seats: number) {
    const webinar = webinarRepository.findByIdSync('webinar-id');
    expect(webinar?.props.seats).toEqual(seats);
  }

  function whenUserChangeSeatsWith(payload: {
    user: unknown;
    webinarId: string;
    seats: number;
  }) {
    return useCase.execute(payload as any);
  }
});
