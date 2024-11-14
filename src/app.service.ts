import { INestApplication, Injectable } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';


@Injectable()
export class AppService {
  public static setupSwaggerDocument(app: INestApplication, port: number) {
    let config = new DocumentBuilder()
    .setTitle('Title')
    .setDescription('Description')
    .setVersion('1.0')
    .addTag('Tag');

  if (process.env.NODE_ENV === "development") {
    config.addServer(`http://localhost:${port}`, "local")
    config.addServer(process.env.DEV_SERVER_URL, "dev server")
  }

  const documentFactory = () => SwaggerModule.createDocument(app, config.build());
  SwaggerModule.setup('api/docs', app, documentFactory);
  }
}
