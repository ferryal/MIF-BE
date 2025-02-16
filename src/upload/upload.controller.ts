import {
  Controller,
  Post,
  Get,
  UploadedFiles,
  UseInterceptors,
  Body,
  BadRequestException,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('api/upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileExtName = extname(file.originalname);
          callback(null, `${uniqueSuffix}${fileExtName}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Allow only image files (jpg, jpeg, png, gif)
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, gif) are allowed!',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('labels') labels: string | string[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image file provided.');
    }
    if (
      !labels ||
      (Array.isArray(labels) && labels.some((label) => label.trim() === '')) ||
      (typeof labels === 'string' && labels.trim() === '')
    ) {
      throw new BadRequestException('All images must have a non-empty label.');
    }

    const imagesData = files.map((file, index) => ({
      url: `http://localhost:5000/uploads/${file.filename}`,
      label: Array.isArray(labels) ? labels[index] : labels,
    }));

    return {
      success: true,
      images: imagesData,
    };
  }

  // GET endpoint to list all stored images
  @Get('list')
  async getImageList(@Res() res: Response) {
    // Note: Adjust the path as needed based on your project structure.
    const directoryPath = join(__dirname, '..', '..', 'uploads');
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Unable to scan files!',
        });
      }
      // Map the file names to image URLs.
      const images = files.map((file) => ({
        url: `http://localhost:5000/uploads/${file}`,
      }));
      return res.status(HttpStatus.OK).json({
        success: true,
        images,
      });
    });
  }
}
