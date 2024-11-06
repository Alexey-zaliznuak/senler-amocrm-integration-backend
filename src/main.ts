
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
    .addServer(`http://localhost:${PORT}`, "local")
    .addServer(process.env.DEV_SERVER_URL, "dev server")
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(PORT);
}
bootstrap();
