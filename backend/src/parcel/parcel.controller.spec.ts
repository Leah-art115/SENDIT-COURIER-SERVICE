import { Test, TestingModule } from '@nestjs/testing';
import { ParcelController } from './parcel.controller';

describe('ParcelController', () => {
  let controller: ParcelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParcelController],
    }).compile();

    controller = module.get<ParcelController>(ParcelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
