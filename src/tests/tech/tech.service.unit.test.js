const techService = require('../../services/TechService');
const { Tech } = require('../../models');
const { minioClient, bucketName } = require('../../utils/minioClient');
const crypto = require('crypto');
const { Op } = require('sequelize');

// ─────────────────── SETUP MOCKS ───────────────────
jest.mock('../../models', () => ({
  Tech: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../utils/minioClient', () => ({
  minioClient: { putObject: jest.fn() },
  bucketName: 'test-bucket',
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

describe('TechService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────── uploadIconToMinio ───────────────────
  describe('uploadIconToMinio', () => {
    it('should upload file and return public URL', async () => {
      const file = {
        originalname: 'logo.png',
        buffer: Buffer.from('image'),
        mimetype: 'image/png',
      };

      minioClient.putObject.mockResolvedValue();

      const url = await techService.uploadIconToMinio(file);

      expect(minioClient.putObject).toHaveBeenCalledWith(
        'test-bucket',
        'tech-icons/mock-uuid.png',
        file.buffer,
        { 'Content-Type': 'image/png' }
      );

      expect(url).toBe(`${process.env.MINIO_ENDPOINT}/test-bucket/tech-icons/mock-uuid.png`);
    });

    it('should return null when no file is provided', async () => {
      const url = await techService.uploadIconToMinio(null);
      expect(url).toBeNull();
    });
  });

  // ─────────────────── createTech ───────────────────
  describe('createTech', () => {
    it('should create tech successfully', async () => {
      Tech.findOne.mockResolvedValue(null);
      Tech.create.mockResolvedValue({ id: 1, name: 'NodeJS' });

      const result = await techService.createTech(
        { name: 'NodeJS' },
        null
      );

      expect(Tech.findOne).toHaveBeenCalledWith({ where: { name: 'NodeJS' } });
      expect(Tech.create).toHaveBeenCalled();

      expect(result.success).toBe(true);
    });

    it('should throw error if tech already exists', async () => {
      Tech.findOne.mockResolvedValue({ id: 1 });

      await expect(
        techService.createTech({ name: 'NodeJS' })
      ).rejects.toThrow('Tech already exists');
    });
  });

  // ─────────────────── getAllTechs ───────────────────
  describe('getAllTechs', () => {
    it('should return all techs', async () => {
      const mockTechs = [{ id: 1, name: 'React' }];

      Tech.findAll.mockResolvedValue(mockTechs);

      const result = await techService.getAllTechs('');

      expect(Tech.findAll).toHaveBeenCalled();
      expect(result.techs).toEqual(mockTechs);
    });

    it('should search techs by name', async () => {
      Tech.findAll.mockResolvedValue([]);

      await techService.getAllTechs('node');

      expect(Tech.findAll).toHaveBeenCalledWith({
        where: { name: { [Op.iLike]: `%node%` } },
      });
    });
  });

  // ─────────────────── getTechById ───────────────────
  describe('getTechById', () => {
    it('should return tech if found', async () => {
      const mockTech = { id: 1, name: 'Next.js' };

      Tech.findByPk.mockResolvedValue(mockTech);

      const result = await techService.getTechById(1);

      expect(result.tech).toEqual(mockTech);
    });

    it('should throw 404 if tech not found', async () => {
      Tech.findByPk.mockResolvedValue(null);

      await expect(techService.getTechById(99)).rejects.toThrow('Tech not found.');
    });
  });

  // ─────────────────── updateTech ───────────────────
  describe('updateTech', () => {
    it('should update tech successfully', async () => {
      const mockTech = {
        id: 1,
        name: 'React',
        update: jest.fn().mockResolvedValue(true),
      };

      Tech.findByPk.mockResolvedValue(mockTech);

      const result = await techService.updateTech(1, { name: 'ReactJS' }, null);

      expect(mockTech.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error if tech not found', async () => {
      Tech.findByPk.mockResolvedValue(null);

      await expect(
        techService.updateTech(99, { name: 'Vue' })
      ).rejects.toThrow('Tech not found');
    });
  });

  // ─────────────────── deleteTech ───────────────────
  describe('deleteTech', () => {
    it('should delete tech successfully', async () => {
      const mockTech = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(),
      };

      Tech.findByPk.mockResolvedValue(mockTech);

      const result = await techService.deleteTech(1);

      expect(mockTech.destroy).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw 404 if tech not found', async () => {
      Tech.findByPk.mockResolvedValue(null);

      await expect(techService.deleteTech(45)).rejects.toThrow('Tech not found.');
    });
  });
});
