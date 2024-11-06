
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const PORT = process.env.PORT ?? 3000

  let config = new DocumentBuilder()
    .setTitle('Title')
    .setDescription('Description')
    .setVersion('1.0')
    .addTag('Tag')

  if (process.env.NODE_ENV === "development") {
    config.addServer(`http://localhost:${PORT}`, "local")
    config.addServer(process.env.DEV_SERVER_URL, "dev server")
  }

  const documentFactory = () => SwaggerModule.createDocument(app, config.build());
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(PORT);
}
bootstrap();
